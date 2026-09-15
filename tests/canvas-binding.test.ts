import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canvasProjectUrl, readCanvasBinding } from "../src/canvas-binding.js";

describe("Canvas project binding", () => {
  it("accepts only a versioned fixed-host binding", async () => {
    const root = await mkdtemp(join(tmpdir(), "wowidea-binding-")); await mkdir(join(root, ".wowidea"));
    try {
      await writeFile(join(root, ".wowidea", "canvas.json"), JSON.stringify({ schemaVersion: "wowidea.canvas-binding/v1", projectId: "p1", projectName: "Project", baseUrl: "https://wowidea.top/api", profile: "default", createdAt: new Date().toISOString(), verifiedAt: new Date().toISOString() }));
      expect((await readCanvasBinding(root)).projectId).toBe("p1");
      expect(canvasProjectUrl("project/id")).toBe("https://wowidea.top/ai/canvas/project%2Fid");
      await writeFile(join(root, ".wowidea", "canvas.json"), JSON.stringify({ schemaVersion: "wowidea.canvas-binding/v1", projectId: "p1", baseUrl: "https://example.test/api", profile: "default" }));
      await expect(readCanvasBinding(root)).rejects.toMatchObject({ exitCode: 2 });
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
