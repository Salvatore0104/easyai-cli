import { EasyAiApi, findUrls } from "./api.js";
import { CliError, ExitCode, redact } from "./errors.js";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { configDir } from "./config.js";
import { payloadHash } from "./preflight.js";

export function taskId(value: any): string | undefined {
  if (!value || typeof value !== "object") return;
  const id = value.taskId || value.task_id || value.id;
  return typeof id === "string" ? id : taskId(value.data);
}
export function taskStatus(value: any): string { return String(value?.status || value?.task_status || (value?.data ? taskStatus(value.data) : "unknown")).toLowerCase(); }
function recordDir(api: EasyAiApi) { return join(configDir(), "tasks", api.scope || "test"); }
function recordPath(api: EasyAiApi, key: string) { return join(recordDir(api), `${payloadHash(key)}.json`); }
export async function listSubmissions(api: EasyAiApi) {
  const dir = recordDir(api); await mkdir(dir, { recursive: true });
  return Promise.all((await readdir(dir)).filter(f => f.endsWith(".json")).map(async f => JSON.parse(await readFile(join(dir, f), "utf8"))));
}
export async function recoverSubmission(api: EasyAiApi, key: string): Promise<unknown> {
  const file = recordPath(api, key);
  const record = JSON.parse(await readFile(file, "utf8"));
  if (record.taskId) return api.get(`/v1/tasks/${encodeURIComponent(record.taskId)}`);
  const found = await api.get(`/v1/tasks?idempotencyKey=${encodeURIComponent(key)}`);
  const rows = taskRows(found).filter((r: any) => (r.idempotencyKey || r.idempotency_key || r.clientMutationId) === key && taskId(r));
  if (rows.length !== 1) throw new CliError(`Submission ${key} is uncertain; lookup did not identify exactly one matching task. Do not resubmit.`, ExitCode.Service);
  await writeFile(file, JSON.stringify({ ...record, state: "accepted", taskId: taskId(rows[0]) }), { mode: 0o600 });
  return rows[0];
}

export function taskRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["items", "data", "tasks", "results"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested;
    if (nested && typeof nested === "object") { const rows = taskRows(nested); if (rows.length) return rows; }
  }
  return [];
}

export async function submitAsyncWithRecovery(api: EasyAiApi, path: string, payload: Record<string, unknown>, idempotencyKey: string, kind: "image" | "video" = "image"): Promise<unknown> {
  if (idempotencyKey.startsWith("seedance-")) {
    const claims = join(configDir(), "approvals"); await mkdir(claims, { recursive: true });
    const claimPath = join(claims, `${payloadHash(idempotencyKey)}.json`);
    const claim = { scope: api.scope || "test", payloadHash: payloadHash(payload) };
    try { await writeFile(claimPath, JSON.stringify(claim), { flag: "wx", mode: 0o600 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const prior = JSON.parse(await readFile(claimPath, "utf8"));
      if (prior.scope !== claim.scope || prior.payloadHash !== claim.payloadHash) throw new CliError("This Seedance approval was already consumed by another request. Resume the original task.", ExitCode.Approval);
    }
  }
  await mkdir(recordDir(api), { recursive: true });
  const file = recordPath(api, idempotencyKey);
  const record = { idempotencyKey, path, kind, payloadHash: payloadHash(payload), state: "uncertain", createdAt: new Date().toISOString() };
  try { await writeFile(file, JSON.stringify(record), { flag: "wx", mode: 0o600 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const previous = JSON.parse(await readFile(file, "utf8"));
    if (previous.payloadHash !== record.payloadHash || previous.path !== path) throw new CliError("Idempotency key already belongs to a different request.", ExitCode.Conflict);
    return recoverSubmission(api, idempotencyKey);
  }
  try {
    const result = await api.post(path, payload, { "Idempotency-Key": idempotencyKey });
    const id = taskId(result);
    if (!id && !path.includes("images")) throw new CliError("Submission returned no task ID", ExitCode.Service);
    if (!id && !findUrls(result).length) throw new CliError("Submission returned no task ID or output", ExitCode.Service);
    await writeFile(file, JSON.stringify({ ...record, state: id ? "accepted" : "completed", taskId: id }), { mode: 0o600 });
    return result;
  }
  catch (error) {
    if (!(error instanceof CliError) || error.exitCode !== ExitCode.Service) throw error;
    try {
      return await recoverSubmission(api, idempotencyKey);
    } catch (lookupError) { throw uncertainSubmission(idempotencyKey, error, kind, lookupError); }
    throw uncertainSubmission(idempotencyKey, error, kind);
  }
}

export async function submitImageWithRecovery(api: EasyAiApi, payload: Record<string, unknown>, idempotencyKey: string): Promise<unknown> {
  return submitAsyncWithRecovery(api, "/v1/images/generations", payload, idempotencyKey, "image");
}

function uncertainSubmission(key: string, original: unknown, kind: "image" | "video", lookup?: unknown): CliError {
  const suffix = lookup ? ` Task lookup also failed: ${redact((lookup as Error).message || lookup)}` : " Task lookup returned no matching task.";
  return new CliError(`${kind.charAt(0).toUpperCase()}${kind.slice(1)} submission outcome is uncertain for idempotency key ${key}; no retry was made.${suffix} Original error: ${redact((original as Error).message || original)}`, ExitCode.Service);
}
