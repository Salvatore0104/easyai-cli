import { afterEach, describe, expect, it, vi } from "vitest";
import { emit } from "../src/output.js";

describe("machine output", () => {
  afterEach(() => vi.restoreAllMocks());
  it("wraps JSON in a versioned stable envelope", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await emit({ id: "x" }, { json: true });
    expect(JSON.parse(String(write.mock.calls[0]![0]))).toEqual({ schemaVersion: "easyai.cli/v1", data: { id: "x" } });
  });
});
