import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const dirs: string[] = [];
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
async function run(args: string[], env: Record<string, string>) {
  return new Promise<{ code: number | null; out: string; err: string }>(done => {
    const p = spawn(process.execPath, [resolve("dist/cli.js"), ...args], { env: { ...process.env, ...env }, windowsHide: true });
    let out = "", err = ""; p.stdout.on("data", d => out += d); p.stderr.on("data", d => err += d); p.on("close", code => done({ code, out, err }));
  });
}
describe("CLI gates with a mock website", () => {
  it.each([{ kind: "image", cost: 1000, code: 0 }, { kind: "minimax", cost: 1000, code: 0 }, { kind: "video", cost: 200, code: 0 }, { kind: "video", cost: 201, code: 6 }])("$kind at $cost points applies the policy without a human prompt", async ({ kind, cost, code }) => {
    let submissions = 0, preflights = 0;
    const catalog = [{ id: "Nano Banana 2", capabilities: { image_generate: {} } }, { id: "豆包Seedance-2.0", capabilities: { omni_video: { supported_modes: ["text_to_video"], duration_range: [4, 15], output_resolutions: ["720p"], aspect_ratio_allowed: ["16:9"], output_audio: true } } }];
    catalog.push({ ...catalog[1]!, id: "MiniMax-H3" });
    const server = createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      if (req.url?.endsWith("/preflight")) { preflights++; let body = ""; req.on("data", d => body += d); req.on("end", () => res.end(JSON.stringify({ quoteId: "cost-quote", estimatedCost: cost, currency: "points", expiresAt: new Date(Date.now() + 60000).toISOString(), normalizedRequest: JSON.parse(body) }))); return; }
      if (req.method === "POST") { submissions++; res.end(JSON.stringify({ taskId: "job", status: "queued" })); return; }
      if (req.url === "/api/v1/models") { res.end(JSON.stringify({ data: catalog })); return; }
      res.end(JSON.stringify({ taskId: "job", status: "succeeded", billing: { actualPoints: 37.5 } }));
    });
    await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
    const dir = await mkdtemp(join(tmpdir(), "wowidea-cost-cli-")); dirs.push(dir);
    const env = { EASYAI_CONFIG_DIR: dir, EASYAI_API_KEY: "mock-account-key", EASYAI_BASE_URL: `http://127.0.0.1:${(server.address() as any).port}` };
    try {
      let args = ["--json", "image", "generate", "--data", '{"prompt":"poster"}', "--idempotency-key", "one"];
      if (kind === "minimax") args = ["--json", "video", "generate", "--data", JSON.stringify({ model: "MiniMax-H3", prompt: "product", duration: 9, resolution: "720p", aspect_ratio: "16:9", audio: false }), "--idempotency-key", "one"];
      if (kind === "video") {
        const manifest = join(dir, "manifest.json"), request = join(dir, "request.json"), storyboard = join(dir, "shot.png");
        await writeFile(storyboard, "mock storyboard bytes");
        await writeFile(manifest, JSON.stringify({ state: "storyboard_ready", model: "豆包Seedance-2.0", prompt: "shot", duration: 9, resolution: "720p", aspectRatio: "16:9", audio: false, watermark: false, mode: "text", lastFrameRequested: true, storyboard: [{ shot: 1, description: "shot", image: storyboard }], references: [], referenceCounts: { images: 0, videos: 0, audio: 0 } }));
        expect((await run(["seedance", "payload", manifest, "--file", request], env)).code).toBe(0);
        expect((await run(["video", "preflight", "--file", request], env)).code).toBe(0);
        args = ["--json", "video", "generate", "--manifest", manifest, "--quote", "cost-quote", "--idempotency-key", "one"];
      }
      const result = await run(args, env); expect(result.code, result.err).toBe(code);
      expect(submissions).toBe(code === 0 ? 1 : 0);
      expect(preflights).toBe(kind === "video" ? 1 : 0);
      if (code === 0) {
        const watched = await run(["--jsonl", kind === "image" ? "image" : "video", "watch", "job"], env);
        expect(JSON.parse(watched.out).data.pointsUsage).toMatchObject({ actualPoints: 37.5, status: "reported" });
      } else expect(result.err).toContain("200");
    } finally { await new Promise<void>(r => server.close(() => r())); }
  });
  it("blocks direct Seedance and image-endpoint bypass before network access", async () => {
    for (const kind of ["video", "image"]) {
      const args = [kind, "generate", "--data", JSON.stringify({ model: "doubao-seedance-2-5-260628" }), "--idempotency-key", "key", ...(kind === "video" ? ["--quote", "none"] : [])];
      const result = await run(args, { EASYAI_BASE_URL: "http://127.0.0.1:1", EASYAI_API_KEY: "test" });
      expect(result.code).toBe(6); expect(result.err).toContain("manifest");
    }
  });
  it("keeps one POST across real CLI process restart and uncertain recovery", async () => {
    let posts = 0;
    const server = createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/v1/images/preflight") { let body = ""; req.on("data", d => body += d); req.on("end", () => res.end(JSON.stringify({ quoteId: "quote", estimatedCost: 20, currency: "points", expiresAt: new Date(Date.now() + 60000).toISOString(), normalizedRequest: JSON.parse(body) }))); return; }
      if (req.method === "POST") { posts++; res.statusCode = 503; res.end('{}'); return; }
      if (req.url === "/api/v1/models") { res.end(JSON.stringify({ data: [{ id: "Nano Banana 2", capabilities: { image_generate: {} } }] })); return; }
      res.end(JSON.stringify({ items: [{ id: "unrelated-task" }] }));
    });
    await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
    const dir = await mkdtemp(join(tmpdir(), "wowidea-process-test-")); dirs.push(dir);
    const env = { EASYAI_CONFIG_DIR: dir, EASYAI_API_KEY: "mock-account-key", EASYAI_BASE_URL: `http://127.0.0.1:${(server.address() as any).port}` };
    try {
      const args = ["--json", "image", "generate", "--data", '{"prompt":"poster"}', "--idempotency-key", "single-request"];
      expect((await run(args, env)).code).toBe(5);
      expect((await run(args, env)).code).toBe(5);
      expect((await run(["tasks", "resume", "single-request"], env)).err).toContain("uncertain");
      expect(posts).toBe(1);
      const listed = await run(["--json", "tasks", "list"], env);
      expect(JSON.parse(listed.out).data[0]).toMatchObject({ idempotencyKey: "single-request", state: "uncertain" });
      expect(listed.out).not.toContain("mock-account-key");
    } finally { await new Promise<void>(r => server.close(() => r())); }
  });
});
