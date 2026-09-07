import { describe, expect, it, vi } from "vitest";
import { applyCanvasBatch, applyCanvasOperation } from "../src/canvas.js";

describe("canvas mutations", () => {
  it("reads version and sends one idempotent operation", async () => {
    const api = { get: vi.fn().mockResolvedValue({ version: 7 }), post: vi.fn().mockResolvedValue({ version: 8 }) } as any;
    await applyCanvasOperation(api, "p1", "node.remove", { nodeId: "n1" });
    expect(api.get).toHaveBeenCalledWith("/v1/canvas-workflow/projects/p1/state");
    const [path, body, headers] = api.post.mock.calls[0];
    expect(path).toContain("/operations");
    expect(body).toMatchObject({ baseVersion: 7, operations: [{ type: "node.remove", payload: { nodeId: "n1" } }] });
    expect(body.clientMutationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers["Idempotency-Key"]).toBe(body.clientMutationId);
  });

  it("rejects batches over 100 operations", async () => {
    const api = {} as any;
    await expect(applyCanvasBatch(api, "p1", Array.from({ length: 101 }, () => ({})))).rejects.toMatchObject({ exitCode: 2 });
  });
});
