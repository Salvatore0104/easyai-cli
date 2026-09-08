import { afterEach, describe, expect, it, vi } from "vitest";
import { EasyAiApi, findUrls } from "../src/api.js";

describe("API client", () => {
  it("downloads only output media, never input references or arbitrary URLs", () => {
    expect(findUrls({ input: { image_urls: ["https://input.test/a.png"] }, reference: "https://input.test/b.png", result: { images: [{ url: "https://output.test/a.png" }], last_frame_url: "https://output.test/tail.png" } })).toEqual(["https://output.test/a.png", "https://output.test/tail.png"]);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not retry failed requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "down" }), { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new EasyAiApi({ baseUrl: "https://example.test", timeoutMs: 1000 }).get("/v1/models")).rejects.toMatchObject({ exitCode: 5 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends bearer credentials without exposing them in errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Bearer hidden-token" }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new EasyAiApi({ baseUrl: "https://example.test", token: "hidden-token", timeoutMs: 1000 }).get("/v1/models")).rejects.not.toThrow("hidden-token");
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer hidden-token" });
  });
});
