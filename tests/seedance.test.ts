import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { approveManifest, creativeHash, SeedanceManifest, validateManifest, validateStoryboardQc } from "../src/seedance.js";

const dirs: string[] = [];
const base = (): SeedanceManifest => ({
  state: "storyboard_ready", prompt: "silk follows the dancer with delayed inertia", model: "seedance-2.0", duration: 9,
  aspectRatio: "16:9", resolution: "1080p", audio: false, watermark: false, mode: "text", lastFrameRequested: true,
  storyboard: [{ shot: 1, description: "wide shot", image: "storyboard-1.png" }], references: [], referenceCounts: { images: 0, videos: 0, audio: 0 },
  storyboardQc: { verdict: "pass", reviewedAt: new Date().toISOString(), hardFailures: [], notes: "Strong hierarchy, coherent motion progression, and physically plausible fabric response.", aesthetics: { visualHierarchy: 4, temporalContinuity: 4, physicalPlausibility: 4, specificity: 4 } },
});
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))); });

describe("Seedance approval", () => {
  it("rejects any visible watermark", async () => {
    await expect(validateManifest({ ...base(), watermark: true as false })).rejects.toMatchObject({ exitCode: 6 });
  });

  it("requires exact approval and detects later creative changes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "easyai-seedance-")); dirs.push(dir); const file = join(dir, "manifest.json");
    await writeFile(join(dir, "storyboard-1.png"), "image", "utf8");
    await writeFile(file, JSON.stringify(base()), "utf8");
    await expect(approveManifest(file, "looks good")).rejects.toMatchObject({ exitCode: 6 });
    const approved = await approveManifest(file, "I APPROVE STORYBOARD");
    expect(approved.approval?.creativeHash).toBe(creativeHash(approved));
    await writeFile(join(dir, "storyboard-1.png"), "changed bytes", "utf8");
    await expect(validateManifest(approved)).rejects.toMatchObject({ exitCode: 6 });
    const changed = JSON.parse(await readFile(file, "utf8")) as SeedanceManifest; changed.duration = 10;
    await expect(validateManifest(changed)).rejects.toMatchObject({ exitCode: 6 });
  });

  it("rejects a storyboard that failed subjective visual review", () => {
    const manifest = base(); manifest.storyboardQc = { ...manifest.storyboardQc!, verdict: "pass", hardFailures: ["camera and landmarks drift from the approved source"] };
    expect(() => validateStoryboardQc(manifest)).toThrow("hard failures");
  });

  it("requires source roles and high fidelity scores for reference-based shots", () => {
    const manifest = base(); manifest.mode = "image"; manifest.references = [{ type: "image", role: "approved environment", url: "https://example.test/source.png" }]; manifest.referenceCounts.images = 1;
    manifest.storyboardQc!.sourceFidelity = { composition: 3, landmarks: 5, perspective: 5, palette: 5 };
    expect(() => validateStoryboardQc(manifest)).toThrow("source-fidelity");
    manifest.storyboardQc!.sourceFidelity.composition = 4;
    expect(() => validateStoryboardQc(manifest)).toThrow("source reference roles");
    manifest.storyboard[0]!.sourceRoles = ["approved environment"];
    expect(() => validateStoryboardQc(manifest)).not.toThrow();
  });

  it("binds local reference bytes while allowing signed transport metadata to be added after approval", async () => {
    const dir = await mkdtemp(join(tmpdir(), "easyai-seedance-ref-")); dirs.push(dir);
    const file = join(dir, "manifest.json"), storyboard = join(dir, "storyboard.png"), source = join(dir, "source.png");
    await writeFile(storyboard, "storyboard-bytes"); await writeFile(source, "source-bytes");
    const manifest = base(); manifest.mode = "image"; manifest.storyboard[0] = { ...manifest.storyboard[0]!, image: storyboard, sourceRoles: ["approved source"] };
    manifest.references = [{ type: "image", role: "approved source", localPath: source }]; manifest.referenceCounts.images = 1;
    manifest.storyboardQc!.sourceFidelity = { composition: 4, landmarks: 4, perspective: 4, palette: 4 };
    await writeFile(file, JSON.stringify(manifest));
    const approved = await approveManifest(file, "I APPROVE STORYBOARD");
    expect(approved.references[0]!.sha256).toMatch(/^[a-f0-9]{64}$/);
    const hash = creativeHash(approved); approved.references[0]!.objectKey = "private/source.png"; approved.references[0]!.signedUrl = "https://example.test/source.png?token=temporary";
    expect(creativeHash(approved)).toBe(hash); await expect(validateManifest(approved)).resolves.toBeUndefined();
  });
});
