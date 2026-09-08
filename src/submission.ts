import { EasyAiApi, findUrls } from "./api.js";
import { CliError, ExitCode, redact } from "./errors.js";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { configDir } from "./config.js";
import { payloadHash } from "./preflight.js";

export function taskId(value: any): string | undefined {
  if (!value || typeof value !== "object") return;
  const id = value.taskId || value.task_id || value.id;
  if (typeof id === "string") return id;
  for (const key of ["data", "result", "task"]) {
    const nested = taskId(value[key]);
    if (nested) return nested;
  }
}
export function taskStatus(value: any): string {
  if (!value || typeof value !== "object") return "unknown";
  const direct = value.status || value.task_status;
  if (direct) return String(direct).toLowerCase();
  for (const key of ["data", "result", "task"]) {
    const nested = taskStatus(value[key]);
    if (nested !== "unknown") return nested;
  }
  return "unknown";
}
function recordDir(api: EasyAiApi) { return join(configDir(), "tasks", api.scope || "test"); }
function recordPath(api: EasyAiApi, key: string) { return join(recordDir(api), `${payloadHash(key)}.json`); }
function rowId(value: unknown): string | undefined { return taskId(value); }
function createdMs(value: any): number | undefined {
  const raw = value?.created ?? value?.created_at ?? value?.createdAt ?? value?.submitted_at;
  if (typeof raw === "number") return raw < 10_000_000_000 ? raw * 1000 : raw;
  if (typeof raw === "string") { const parsed = Date.parse(raw); return Number.isFinite(parsed) ? parsed : undefined; }
}
function matchesKind(value: any, kind: "image" | "video"): boolean {
  const declared = String(value?.task_type || value?.type || value?.kind || "").toLowerCase();
  if (declared === kind || declared.includes(kind)) return true;
  const urls = findUrls(value);
  return kind === "image" ? urls.some(url => /\.(png|jpe?g|webp|gif)(?:\?|$)/i.test(url)) : urls.some(url => /\.(mp4|mov|webm)(?:\?|$)/i.test(url));
}
export async function listSubmissions(api: EasyAiApi) {
  const dir = recordDir(api); await mkdir(dir, { recursive: true });
  return Promise.all((await readdir(dir)).filter(f => f.endsWith(".json")).map(async f => JSON.parse(await readFile(join(dir, f), "utf8"))));
}
export async function recoverSubmission(api: EasyAiApi, key: string): Promise<unknown> {
  const file = recordPath(api, key);
  const record = JSON.parse(await readFile(file, "utf8"));
  if (record.taskId) return api.get(`/v1/tasks/${encodeURIComponent(record.taskId)}`);
  const found = await api.get(`/v1/tasks?idempotencyKey=${encodeURIComponent(key)}`);
  const rows = taskRows(found);
  const exact = rows.filter((r: any) => (r.idempotencyKey || r.idempotency_key || r.clientMutationId) === key && rowId(r));
  let matches = exact;
  let recovery = "idempotency-key";
  if (!matches.length && record.baselineCaptured && Array.isArray(record.baselineTaskIds)) {
    const baseline = new Set<string>(record.baselineTaskIds);
    const earliest = Date.parse(record.createdAt) - 2_000;
    const latest = Date.now() + 5_000;
    matches = rows.filter((r: any) => {
      const id = rowId(r), created = createdMs(r);
      return Boolean(id && !baseline.has(id) && created !== undefined && created >= earliest && created <= latest && matchesKind(r, record.kind));
    });
    recovery = "unique-task-snapshot-delta";
  }
  if (matches.length !== 1) throw new CliError(`Submission ${key} is uncertain; lookup did not identify exactly one matching task. Do not resubmit.`, ExitCode.Service);
  const id = rowId(matches[0]);
  await writeFile(file, JSON.stringify({ ...record, state: "accepted", taskId: id, recoveredBy: recovery }), { mode: 0o600 });
  return matches[0];
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

export async function submitAsyncWithRecovery(api: EasyAiApi, path: string, payload: Record<string, unknown>, idempotencyKey: string, kind: "image" | "video" = "image", options: { submitTimeoutMs?: number; recoveryWaitMs?: number; allowDuplicatePayload?: boolean } = {}): Promise<unknown> {
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
  const requestHash = payloadHash(payload);
  if (!options.allowDuplicatePayload) {
    const duplicate = (await listSubmissions(api)).find(row => row.idempotencyKey !== idempotencyKey && row.path === path && row.payloadHash === requestHash);
    if (duplicate) throw new CliError(`An identical request already exists under idempotency key ${duplicate.idempotencyKey}${duplicate.taskId ? ` (task ${duplicate.taskId})` : ""}. Resume it instead of submitting again; use --allow-reroll only after the user explicitly requests another generation.`, ExitCode.Conflict);
  }
  const record = { idempotencyKey, path, kind, payloadHash: requestHash, state: "preparing", createdAt: new Date().toISOString(), baselineCaptured: false, baselineTaskIds: [] as string[] };
  try { await writeFile(file, JSON.stringify(record), { flag: "wx", mode: 0o600 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const previous = JSON.parse(await readFile(file, "utf8"));
    if (previous.payloadHash !== record.payloadHash || previous.path !== path) throw new CliError("Idempotency key already belongs to a different request.", ExitCode.Conflict);
    return recoverSubmission(api, idempotencyKey);
  }
  try {
    try {
      const before = taskRows(await api.get("/v1/tasks"));
      record.baselineTaskIds = before.map(rowId).filter((id): id is string => Boolean(id));
      record.baselineCaptured = true;
    } catch { /* idempotency-key recovery remains available */ }
    record.state = "uncertain";
    await writeFile(file, JSON.stringify(record), { mode: 0o600 });
    const headers = { "Idempotency-Key": idempotencyKey };
    const result = options.submitTimeoutMs && "postWithTimeout" in api ? await api.postWithTimeout(path, payload, headers, options.submitTimeoutMs) : await api.post(path, payload, headers);
    const id = taskId(result);
    if (!id && !path.includes("images")) throw new CliError("Submission returned no task ID", ExitCode.Service);
    if (!id && !findUrls(result).length) throw new CliError("Submission returned no task ID or output", ExitCode.Service);
    await writeFile(file, JSON.stringify({ ...record, state: id ? "accepted" : "completed", taskId: id }), { mode: 0o600 });
    return result;
  }
  catch (error) {
    if (!(error instanceof CliError) || error.exitCode !== ExitCode.Service) throw error;
    const transportUncertain = /timed out|fetch failed|network|socket|econn|connection/i.test(error.message);
    const deadline = Date.now() + (transportUncertain ? options.recoveryWaitMs || 0 : 0);
    let lookupError: unknown;
    do {
      try { return await recoverSubmission(api, idempotencyKey); }
      catch (current) { lookupError = current; }
      if (Date.now() >= deadline) break;
      await new Promise(resolve => setTimeout(resolve, Math.min(3000, Math.max(250, deadline - Date.now()))));
    } while (Date.now() <= deadline);
    throw uncertainSubmission(idempotencyKey, error, kind, lookupError);
  }
}

export async function submitImageWithRecovery(api: EasyAiApi, payload: Record<string, unknown>, idempotencyKey: string, options?: { submitTimeoutMs?: number; recoveryWaitMs?: number; allowDuplicatePayload?: boolean }): Promise<unknown> {
  return submitAsyncWithRecovery(api, "/v1/images/generations", payload, idempotencyKey, "image", options);
}

function uncertainSubmission(key: string, original: unknown, kind: "image" | "video", lookup?: unknown): CliError {
  const suffix = lookup ? ` Task lookup also failed: ${redact((lookup as Error).message || lookup)}` : " Task lookup returned no matching task.";
  return new CliError(`${kind.charAt(0).toUpperCase()}${kind.slice(1)} submission outcome is uncertain for idempotency key ${key}; no retry was made.${suffix} Original error: ${redact((original as Error).message || original)}`, ExitCode.Service);
}
