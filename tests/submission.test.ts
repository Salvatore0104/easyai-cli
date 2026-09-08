import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CliError, ExitCode } from "../src/errors.js";
import { submitAsyncWithRecovery, submitImageWithRecovery, taskRows, listSubmissions, recoverSubmission, taskId, taskStatus } from "../src/submission.js";
let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "wowidea-task-test-")); vi.stubEnv("EASYAI_CONFIG_DIR", dir); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(dir, { recursive: true, force: true }); });
const mock = (rows: any = []) => ({ scope: "account-a", post: vi.fn().mockRejectedValue(new CliError("timeout", ExitCode.Service)), get: vi.fn().mockResolvedValue({ data: { items: rows } }) } as any);
describe("durable async lifecycle", () => {
  it("records explicit validation rejection and never attaches a later unrelated task", async () => {
    const api = mock(); api.post.mockRejectedValue(new CliError("content cannot be empty", ExitCode.Usage));
    await expect(submitAsyncWithRecovery(api, "/v1/video/generations", { prompt: "x" }, "rejected-key", "video")).rejects.toThrow(/content/);
    expect((await listSubmissions(api))[0].state).toBe("rejected");
    api.get.mockClear();
    await expect(recoverSubmission(api, "rejected-key")).rejects.toThrow(/rejected before acceptance/);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it.each([[[]], [{ items: [] }], [{ data: { items: [] } }]])("accepts list envelopes", value => expect(taskRows(value)).toEqual([]));
  it("persists before POST and recovers only the matching row", async () => {
    const api = mock([{ id: "other", idempotencyKey: "other" }, { id: "task", idempotencyKey: "key" }]);
    api.post.mockImplementation(async () => { expect(await listSubmissions(api)).toEqual([expect.objectContaining({ idempotencyKey: "key", state: "uncertain" })]); throw new CliError("timeout", ExitCode.Service); });
    expect(await submitImageWithRecovery(api, { prompt: "hello" }, "key")).toMatchObject({ id: "task" });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(await listSubmissions(api)).toEqual([expect.objectContaining({ taskId: "task" })]);
  });
  it.each([ { rows: [] }, { rows: [{ id: "unrelated" }] }, { rows: [{ id: "wrong", idempotencyKey: "other" }] }, { rows: [{ id: "a", idempotencyKey: "key" }, { id: "b", idempotencyKey: "key" }] } ])("rejects absent or ambiguous ownership", async ({ rows }) => {
    const api = mock(rows);
    await expect(submitImageWithRecovery(api, {}, "key")).rejects.toThrow("uncertain");
    await expect(submitImageWithRecovery(api, {}, "key")).rejects.toThrow("uncertain");
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it("resumes after a process restart without posting", async () => {
    const api = mock(); await expect(submitImageWithRecovery(api, {}, "key")).rejects.toThrow();
    const restarted = mock([{ id: "late", idempotency_key: "key" }]);
    expect(await recoverSubmission(restarted, "key")).toMatchObject({ id: "late" }); expect(restarted.post).not.toHaveBeenCalled();
  });
  it("prevents concurrent consumption of a Seedance approval", async () => {
    const api = mock(); api.post.mockResolvedValue({ taskId: "one" });
    await Promise.allSettled(Array.from({ length: 5 }, () => submitAsyncWithRecovery(api, "/v1/video/generations", {}, "seedance-approved", "video")));
    expect(api.post).toHaveBeenCalledTimes(1);
    const anotherAccount = mock(); anotherAccount.scope = "account-b";
    await expect(submitAsyncWithRecovery(anotherAccount, "/v1/video/generations", {}, "seedance-approved", "video")).rejects.toMatchObject({ exitCode: 6 });
    expect(anotherAccount.post).not.toHaveBeenCalled();
  });
  it("does not retry validation errors or a changed payload", async () => {
    const api = mock(); api.post.mockRejectedValue(new CliError("bad input", ExitCode.Usage));
    await expect(submitImageWithRecovery(api, {}, "key")).rejects.toMatchObject({ exitCode: 2 });
    await expect(submitImageWithRecovery(api, { prompt: "changed" }, "key")).rejects.toMatchObject({ exitCode: 4 });
    expect(api.post).toHaveBeenCalledTimes(1); expect(api.get).toHaveBeenCalledTimes(1); expect(api.get).toHaveBeenCalledWith("/v1/tasks");
  });
  it("blocks an identical payload under a new key unless an explicit reroll is requested", async () => {
    const api = mock(); api.post.mockResolvedValueOnce({ taskId: "first" }).mockResolvedValueOnce({ taskId: "second" });
    await expect(submitImageWithRecovery(api, { prompt: "same" }, "first-key")).resolves.toMatchObject({ taskId: "first" });
    await expect(submitImageWithRecovery(api, { prompt: "same" }, "second-key")).rejects.toMatchObject({ exitCode: 4 });
    await expect(submitImageWithRecovery(api, { prompt: "same" }, "third-key", { allowDuplicatePayload: true })).resolves.toMatchObject({ taskId: "second" });
    expect(api.post).toHaveBeenCalledTimes(2);
  });
  it("handles connection loss during lookup", async () => {
    const api = mock(); api.get.mockRejectedValue(new Error("offline"));
    await expect(submitAsyncWithRecovery(api, "/v1/video/generations", {}, "key", "video")).rejects.toThrow("uncertain"); expect(api.post).toHaveBeenCalledTimes(1);
  });
  it("reads nested terminal states", () => expect(taskStatus({ data: { result: { task_status: "SUCCESS" } } })).toBe("success"));
  it("reads nested task IDs", () => expect(taskId({ data: { task: { task_id: "nested" } } })).toBe("nested"));
  it("recovers a unique new image when the server ignores the idempotency filter", async () => {
    const now = new Date().toISOString();
    const api = mock();
    api.get.mockResolvedValueOnce({ items: [{ id: "old", task_type: "image", createdAt: now }] })
      .mockResolvedValueOnce({ items: [{ id: "new", task_type: "image_generation", createdAt: now }, { id: "old", task_type: "image", createdAt: now }] });
    await expect(submitImageWithRecovery(api, {}, "key")).resolves.toMatchObject({ id: "new" });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(await listSubmissions(api)).toEqual([expect.objectContaining({ taskId: "new", recoveredBy: "unique-task-snapshot-delta" })]);
  });
  it.each([
    { name: "multiple new image tasks", after: [{ id: "a", task_type: "image", createdAt: new Date().toISOString() }, { id: "b", task_type: "image", createdAt: new Date().toISOString() }] },
    { name: "wrong media type", after: [{ id: "a", task_type: "video", createdAt: new Date().toISOString() }] },
    { name: "task predating submission", after: [{ id: "a", task_type: "image", createdAt: new Date(Date.now() - 60_000).toISOString() }] },
  ])("keeps ownership uncertain for $name", async ({ after }) => {
    const api = mock(); api.get.mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: after });
    await expect(submitImageWithRecovery(api, {}, "key")).rejects.toThrow("uncertain");
    await expect(submitImageWithRecovery(api, {}, "key")).rejects.toThrow("uncertain");
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
