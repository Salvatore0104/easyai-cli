import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CliError, ExitCode } from "./errors.js";
import { payloadHash } from "./preflight.js";

export interface SeedanceReference { type: "image" | "video" | "audio"; role: string; localPath?: string; url?: string; objectKey?: string; signedUrl?: string; sha256?: string; }
export interface SeedanceManifest {
  state: "draft" | "storyboard_ready" | "approved" | "submitted" | "completed" | "failed";
  prompt: string; model: string; duration: number; aspectRatio: string; resolution: string; audio: boolean; watermark: false;
  mode: string; lastFrameRequested: boolean; storyboard: Array<{ shot: number; description: string; image: string; sha256?: string }>;
  references: SeedanceReference[]; referenceCounts: { images: number; videos: number; audio: number }; approval?: { approvedAt: string; creativeHash: string; confirmation: string };
  taskId?: string;
}
export async function readManifest(path: string): Promise<SeedanceManifest> {
  const m = JSON.parse(await readFile(path, "utf8")) as SeedanceManifest; const root = dirname(resolve(path));
  for (const shot of m.storyboard || []) if (shot.image && !/^https?:\/\//i.test(shot.image)) shot.image = resolve(root, shot.image);
  for (const ref of m.references || []) if (ref.localPath && !/^https?:\/\//i.test(ref.localPath)) ref.localPath = resolve(root, ref.localPath);
  return m;
}
export function creativeHash(m: SeedanceManifest): string {
  return payloadHash({ prompt: m.prompt, model: m.model, duration: m.duration, aspectRatio: m.aspectRatio, resolution: m.resolution, audio: m.audio, watermark: m.watermark, mode: m.mode, lastFrameRequested: m.lastFrameRequested, storyboard: m.storyboard, referenceCounts: m.referenceCounts, references: m.references.map(({ type, role, localPath, url, signedUrl, objectKey, sha256 }) => ({ type, role, localPath, url, signedUrl, objectKey, sha256 })) });
}
export async function validateManifest(m: SeedanceManifest, verifyRemote = false): Promise<void> {
  if (!/seedance/i.test(m.model)) throw new CliError("Manifest model is not Seedance.", ExitCode.Usage);
  if (m.watermark !== false) throw new CliError("Seedance watermark must be exactly false.", ExitCode.Approval);
  if (!m.prompt || !m.mode || !m.duration || !m.aspectRatio || !m.resolution || typeof m.audio !== "boolean") throw new CliError("Seedance manifest is missing required billable settings.", ExitCode.Usage);
  if (!Array.isArray(m.storyboard) || !m.storyboard.length || m.storyboard.some(s => !s.description || !s.image)) throw new CliError("Storyboard descriptions and images are required before approval.", ExitCode.Approval);
  for (const shot of m.storyboard) {
    if (/^https?:\/\//i.test(shot.image)) {
      if (verifyRemote) { const response = await fetch(shot.image, { headers: { Range: "bytes=0-0" } }); if (!response.ok && response.status !== 206) throw new CliError(`Storyboard image is not readable for shot ${shot.shot}.`, ExitCode.Service); }
    } else {
      await stat(shot.image).catch(() => { throw new CliError(`Storyboard image not found for shot ${shot.shot}: ${shot.image}`, ExitCode.Approval); });
      if (m.state === "approved" && shot.sha256 !== createHash("sha256").update(await readFile(shot.image)).digest("hex")) throw new CliError("Storyboard image bytes changed; approve again.", ExitCode.Approval);
    }
  }
  const roles = m.references.map(r => r.role); if (roles.some((r, i) => !r || roles.indexOf(r) !== i)) throw new CliError("Every reference needs a unique explicit role.", ExitCode.Usage);
  if (m.references.some(r => !["image", "video", "audio"].includes(r.type))) throw new CliError("Every reference needs an image, video, or audio type.", ExitCode.Usage);
  const actual = { images: m.references.filter(r => r.type === "image").length, videos: m.references.filter(r => r.type === "video").length, audio: m.references.filter(r => r.type === "audio").length };
  if (!m.referenceCounts || actual.images !== m.referenceCounts.images || actual.videos !== m.referenceCounts.videos || actual.audio !== m.referenceCounts.audio) throw new CliError("Reference counts do not match the manifest references.", ExitCode.Approval);
  for (const ref of m.references) {
    if (m.state === "approved" && ref.localPath && (!ref.objectKey || !ref.signedUrl || ref.sha256 !== createHash("sha256").update(await readFile(ref.localPath)).digest("hex"))) throw new CliError("Local reference must be uploaded to private MinIO and unchanged after approval.", ExitCode.Approval);
    if (ref.localPath) await stat(ref.localPath).catch(() => { throw new CliError(`Reference file not found: ${ref.localPath}`, ExitCode.Usage); });
    if (!ref.localPath && !ref.url && !ref.signedUrl) throw new CliError(`Reference ${ref.role} has no media source.`, ExitCode.Usage);
    if (verifyRemote && (ref.signedUrl || ref.url)) { const response = await fetch(ref.signedUrl || ref.url!, { headers: { Range: "bytes=0-0" } }); if (!response.ok && response.status !== 206) throw new CliError(`Reference URL is not readable for role ${ref.role}.`, ExitCode.Service); }
  }
  if (m.state === "approved" && m.approval?.creativeHash !== creativeHash(m)) throw new CliError("Seedance manifest changed after approval; approval is invalid.", ExitCode.Approval);
}
export async function approveManifest(path: string, confirmation: string): Promise<SeedanceManifest> {
  const m = await readManifest(path); await validateManifest(m);
  if (m.state !== "storyboard_ready") throw new CliError("Only a storyboard_ready manifest can be approved.", ExitCode.Approval);
  if (confirmation !== "I APPROVE STORYBOARD") throw new CliError("Exact confirmation required: I APPROVE STORYBOARD", ExitCode.Approval);
  for (const shot of m.storyboard) {
    if (/^https?:\/\//i.test(shot.image)) throw new CliError("Download storyboard images locally before approval so their bytes can be bound.", ExitCode.Approval);
    shot.sha256 = createHash("sha256").update(await readFile(shot.image)).digest("hex");
  }
  m.state = "approved"; m.approval = { approvedAt: new Date().toISOString(), creativeHash: creativeHash(m), confirmation };
  await writeFile(path, JSON.stringify(m, null, 2) + "\n", "utf8"); return m;
}

export function seedancePayload(m: SeedanceManifest): Record<string, unknown> {
  if (!["text", "image", "video", "audio", "first-last", "edit", "continuation"].includes(m.mode)) throw new CliError("Unknown Seedance mode; specify the approved input plan.", ExitCode.Approval);
  if (m.mode === "text" && m.references.length) throw new CliError("Text-only mode cannot include references.", ExitCode.Approval);
  if (m.mode !== "text" && !m.references.length) throw new CliError("The selected mode requires explicit references.", ExitCode.Approval);
  const urls = (type: SeedanceReference["type"]) => m.references.filter(r => r.type === type).map(r => r.signedUrl || r.url).filter((x): x is string => Boolean(x));
  const imageUrls = urls("image"), videoUrls = urls("video"), audioUrls = urls("audio");
  if (imageUrls.length !== m.referenceCounts.images || videoUrls.length !== m.referenceCounts.videos || audioUrls.length !== m.referenceCounts.audio) throw new CliError("Approved references are not fully uploaded or addressable.", ExitCode.Approval);
  const modes: Record<string, string> = { text: "text_to_video", image: "image_reference", video: "video_reference", audio: "audio_reference", "first-last": "first_last_frame", edit: "video_edit", continuation: "continuation" };
  return { prompt: m.prompt, model: m.model, duration: m.duration, aspect_ratio: m.aspectRatio, resolution: m.resolution, audio: m.audio, watermark: false, mode: modes[m.mode], last_frame: m.lastFrameRequested,
    ...(imageUrls.length ? { image_urls: imageUrls } : {}), ...(videoUrls.length ? { video_urls: videoUrls } : {}), ...(audioUrls.length ? { audio_urls: audioUrls } : {}), references: m.references.map(r => ({ type: r.type, role: r.role, url: r.signedUrl || r.url })) };
}
export async function uploadReferences(path: string): Promise<SeedanceManifest> {
  const endpoint = process.env.EASYAI_MINIO_ENDPOINT, accessKeyId = process.env.EASYAI_MINIO_ACCESS_KEY, secretAccessKey = process.env.EASYAI_MINIO_SECRET_KEY, bucket = process.env.EASYAI_MINIO_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) throw new CliError("Set EASYAI_MINIO_ENDPOINT, EASYAI_MINIO_ACCESS_KEY, EASYAI_MINIO_SECRET_KEY, and EASYAI_MINIO_BUCKET.", ExitCode.Auth);
  const m = await readManifest(path); await validateManifest(m);
  if (m.state === "submitted" || m.state === "completed") throw new CliError("References cannot change after submission.", ExitCode.Approval);
  const client = new S3Client({ endpoint, region: process.env.EASYAI_MINIO_REGION || "us-east-1", forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
  for (const ref of m.references) if (ref.localPath) {
    const bytes = await readFile(ref.localPath); const sha = createHash("sha256").update(bytes).digest("hex");
    const key = ref.objectKey || `easyai-cli/${sha}/${basename(ref.localPath)}`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes }));
    ref.signedUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
    ref.objectKey = key; ref.sha256 = sha;
    const response = await fetch(ref.signedUrl, { headers: { Range: "bytes=0-0" } });
    if (!response.ok && response.status !== 206) throw new CliError(`Uploaded reference is not publicly readable: ${ref.role}`, ExitCode.Service);
  }
  if (m.state === "approved") { m.state = "storyboard_ready"; delete m.approval; }
  await writeFile(path, JSON.stringify(m, null, 2) + "\n", "utf8"); return m;
}
