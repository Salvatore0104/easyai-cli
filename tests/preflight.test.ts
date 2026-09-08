import { describe, expect, it } from "vitest";
import { assertQuote, localQuote, payloadHash } from "../src/preflight.js";
import { ExitCode } from "../src/errors.js";

describe("preflight payload binding", () => {
  it("never treats a local estimate as billable approval", () => expect(() => assertQuote(localQuote("video", {}))).toThrow("server cost quote"));
  it("hashes exactly serialized JSON, omitting undefined properties", () => expect(payloadHash({ a: undefined, b: 1 })).toBe(payloadHash({ b: 1 })));
  it("hashes object keys canonically", () => {
    expect(payloadHash({ a: 1, b: { c: 2 } })).toBe(payloadHash({ b: { c: 2 }, a: 1 }));
  });

  it("invalidates approval when payload changes", () => {
    const quote = localQuote("video", { prompt: "a" });
    expect(() => assertQuote(quote, { prompt: "b" })).toThrowError(expect.objectContaining({ exitCode: ExitCode.Approval }));
  });
});
