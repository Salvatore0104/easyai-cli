import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
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
