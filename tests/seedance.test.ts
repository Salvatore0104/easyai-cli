import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { approveManifest, creativeHash, SeedanceManifest, validateManifest } from "../src/seedance.js";

const dirs: string[] = [];
const base = (): SeedanceManifest => ({
  state: "storyboard_ready", prompt: "silk follows the dancer with delayed inertia", model: "seedance-2.0", duration: 9,
  aspectRatio: "16:9", resolution: "1080p", audio: false, watermark: false, mode: "text", lastFrameRequested: true,
  storyboard: [{ shot: 1, description: "wide shot", image: "storyboard-1.png" }], references: [], referenceCounts: { images: 0, videos: 0, audio: 0 },
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
});
