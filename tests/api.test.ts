import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EasyAiApi, downloadUrls, findUrls } from "../src/api.js";

describe("API client", () => {
  it("downloads only output media, never input references or arbitrary URLs", () => {
    expect(findUrls({ input: { image_urls: ["https://input.test/a.png"] }, reference: "https://input.test/b.png", data: { task: { result: { images: [{ url: "https://output.test/a.png" }], last_frame_url: "https://output.test/tail.png" } } } })).toEqual(["https://output.test/a.png", "https://output.test/tail.png"]);
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

  it("allows generation POSTs to override the normal request timeout", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return new Response(JSON.stringify({ taskId: "accepted" }), { status: 202 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const api = new EasyAiApi({ baseUrl: "https://example.test", timeoutMs: 5 });
    await expect(api.postWithTimeout("/v1/images/generations", {}, {}, 100)).resolves.toEqual({ taskId: "accepted" });
  });

  // Platform host aliases (ai.wowidea.top -> wowidea.top) answer with a
  // cross-origin redirect. Native fetch strips the auth header there, so the
  // client follows the hop itself and keeps its credentials.
  it("keeps credentials across a same-site host redirect", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "https://www.example.test/api/v1/models" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new EasyAiApi({ baseUrl: "https://example.test", token: "secret", timeoutMs: 1000 }).get("/v1/models")).resolves.toEqual({ data: [] });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://example.test/api/v1/models");
    expect(fetchMock.mock.calls[1]![0]).toBe("https://www.example.test/api/v1/models");
    expect((fetchMock.mock.calls[1]![1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer secret" });
  });

  it("refuses to forward credentials to an unrelated site", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://evil.test/api/v1/models" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new EasyAiApi({ baseUrl: "https://example.test", token: "secret", timeoutMs: 1000 }).get("/v1/models")).rejects.toMatchObject({ exitCode: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries transient media GET failures without resubmitting generation", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(Buffer.from("image-bytes"), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const dir = await mkdtemp(join(tmpdir(), "wowidea-download-retry-"));
    try {
      const paths = await downloadUrls(["https://cdn.example.test/output.png"], dir);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(await readFile(paths[0]!)).toEqual(Buffer.from("image-bytes"));
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
