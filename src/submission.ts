import { EasyAiApi } from "./api.js";
import { CliError, ExitCode, redact } from "./errors.js";

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
  try { return await api.post(path, payload, { "Idempotency-Key": idempotencyKey }); }
  catch (error) {
    if (!(error instanceof CliError) || error.exitCode !== ExitCode.Service) throw error;
    try {
      const found = await api.get<unknown>(`/v1/tasks?idempotencyKey=${encodeURIComponent(idempotencyKey)}`);
      const rows = taskRows(found); if (rows.length) return rows[0];
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
