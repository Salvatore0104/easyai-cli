import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SecureCanvasAuthStore, canvasBaseUrl } from "../src/canvas-auth.js";

const prior = { config: process.env.EASYAI_CONFIG_DIR, access: process.env.EASYAI_CANVAS_ACCESS_TOKEN, refresh: process.env.EASYAI_CANVAS_REFRESH_TOKEN };
afterEach(() => {
  for (const [key, value] of [["EASYAI_CONFIG_DIR", prior.config], ["EASYAI_CANVAS_ACCESS_TOKEN", prior.access], ["EASYAI_CANVAS_REFRESH_TOKEN", prior.refresh]] as const) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

describe("secure Canvas authentication", () => {
  it("keeps process tokens out of metadata files", async () => {
    const root = await mkdtemp(join(tmpdir(), "wowidea-canvas-auth-"));
    process.env.EASYAI_CONFIG_DIR = root; process.env.EASYAI_CANVAS_ACCESS_TOKEN = "process-access-token"; process.env.EASYAI_CANVAS_REFRESH_TOKEN = "process-refresh-token";
    try {
      const store = new SecureCanvasAuthStore();
      await store.set({ baseUrl: canvasBaseUrl, accessToken: "process-access-token", refreshToken: "process-refresh-token", agentName: "test" }, "test");
      const text = await readFile(join(root, "canvas.json"), "utf8");
      expect(text).not.toContain("process-access-token"); expect(text).not.toContain("process-refresh-token");
      expect(JSON.parse(text).profiles.test).toMatchObject({ baseUrl: canvasBaseUrl, agentName: "test" });
      expect(await store.get("test")).toMatchObject({ accessToken: "process-access-token", refreshToken: "process-refresh-token" });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects an alternate Canvas BaseURL", async () => {
    const root = await mkdtemp(join(tmpdir(), "wowidea-canvas-auth-")); process.env.EASYAI_CONFIG_DIR = root; process.env.EASYAI_CANVAS_ACCESS_TOKEN = "process-token";
    try { await expect(new SecureCanvasAuthStore().set({ baseUrl: "https://example.test/api" }, "test")).rejects.toMatchObject({ exitCode: 2 }); }
    finally { await rm(root, { recursive: true, force: true }); }
  });
});
