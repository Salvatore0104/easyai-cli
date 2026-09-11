import { describe, expect, it } from "vitest";
import { canonicalBaseUrl, defaultBaseUrl } from "../src/config.js";

describe("base URL canonicalization", () => {
  // ai.wowidea.top answers 301 to wowidea.top, and clients drop the Authorization
  // header on that cross-origin hop, so the alias must never be used verbatim.
  it("maps the legacy redirecting alias onto the canonical host", () => {
    expect(defaultBaseUrl).toBe("https://wowidea.top");
    expect(canonicalBaseUrl("https://ai.wowidea.top")).toBe("https://wowidea.top");
    expect(canonicalBaseUrl("https://ai.wowidea.top/")).toBe("https://wowidea.top");
    expect(canonicalBaseUrl("  https://ai.wowidea.top  ")).toBe("https://wowidea.top");
  });

  it("leaves unrelated hosts untouched", () => {
    expect(canonicalBaseUrl("https://wowidea.top")).toBe("https://wowidea.top");
    expect(canonicalBaseUrl("https://wowidea.top/api")).toBe("https://wowidea.top/api");
    expect(canonicalBaseUrl("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
  });
});
