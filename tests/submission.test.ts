import { describe, expect, it, vi } from "vitest";
import { CliError, ExitCode } from "../src/errors.js";
import { submitImageWithRecovery, taskRows } from "../src/submission.js";

describe("image async submission recovery", () => {
  it.each([
    [[{ taskId: "a" }]], [{ items: [{ taskId: "b" }] }], [{ data: [{ taskId: "c" }] }],
    [{ data: { items: [{ taskId: "d" }] } }], [{ results: { data: [{ taskId: "e" }] } }],
  ])("extracts task rows from response shapes", (response) => { expect(taskRows(response)).toHaveLength(1); });

  it("uses one idempotency key and recovers after timeout", async () => {
    const api = { post: vi.fn().mockRejectedValue(new CliError("Request timed out", ExitCode.Service)), get: vi.fn().mockResolvedValue({ data: { items: [{ id: "task-1" }] } }) } as any;
    expect(await submitImageWithRecovery(api, { prompt: "test" }, "idem-1")).toEqual({ id: "task-1" });
    expect(api.post).toHaveBeenCalledTimes(1); expect(api.post).toHaveBeenCalledWith("/v1/images/generations", { prompt: "test" }, { "Idempotency-Key": "idem-1" });
    expect(api.get).toHaveBeenCalledWith("/v1/tasks?idempotencyKey=idem-1");
  });

  it("reports uncertain without a duplicate when lookup is empty", async () => {
    const api = { post: vi.fn().mockRejectedValue(new CliError("connection reset", ExitCode.Service)), get: vi.fn().mockResolvedValue({ data: [] }) } as any;
    await expect(submitImageWithRecovery(api, {}, "idem-2")).rejects.toMatchObject({ exitCode: ExitCode.Service, message: expect.stringContaining("uncertain") }); expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("does not lookup validation failures", async () => {
    const api = { post: vi.fn().mockRejectedValue(new CliError("bad request", ExitCode.Usage)), get: vi.fn() } as any;
    await expect(submitImageWithRecovery(api, {}, "idem-3")).rejects.toMatchObject({ exitCode: ExitCode.Usage }); expect(api.get).not.toHaveBeenCalled();
  });
});
