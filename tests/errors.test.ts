import { describe, expect, it } from "vitest";
import { classifyHttpError, ExitCode, redact } from "../src/errors.js";

describe("redaction", () => {
  it("removes credentials and signed URL values recursively", () => {
    const value = redact({ authorization: "Bearer secret", key: "plain-key", nested: { apiKey: "sk-abcdefghijk", url: "https://x.test/a?X-Amz-Signature=secret&token=abc" } });
    expect(JSON.stringify(value)).not.toContain("secret");
    expect(JSON.stringify(value)).not.toContain("abcdefghijk");
    expect(JSON.stringify(value)).not.toContain("token=abc");
    expect(JSON.stringify(value)).not.toContain("plain-key");
  });

  it("maps conflicts to the documented exit code", () => {
    const error = classifyHttpError(409, { message: "stale" });
    expect(error.exitCode).toBe(ExitCode.Conflict);
    expect(error.message).toContain("baseVersion");
  });
});
