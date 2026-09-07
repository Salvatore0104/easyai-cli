import { afterEach, describe, expect, it, vi } from "vitest";
import { EasyAiApi } from "../src/api.js";

describe("API client", () => {
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
