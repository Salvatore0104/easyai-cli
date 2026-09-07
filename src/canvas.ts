import { randomUUID } from "node:crypto";
import { EasyAiApi } from "./api.js";
import { CliError, ExitCode } from "./errors.js";

export interface CanvasState { version?: number; baseVersion?: number; data?: { version?: number }; [key: string]: unknown }

export function stateVersion(state: CanvasState): number {
  const value = state.version ?? state.baseVersion ?? state.data?.version;
  if (!Number.isInteger(value)) throw new CliError("Canvas state did not include a numeric version.", ExitCode.Service);
  return value as number;
}

export async function canvasMutationEnvelope(api: EasyAiApi, projectId: string, payload: Record<string, unknown>, baseVersion?: number): Promise<Record<string, unknown>> {
  const version = baseVersion ?? stateVersion(await api.get<CanvasState>(`/v1/canvas-workflow/projects/${encodeURIComponent(projectId)}/state`));
  return { baseVersion: version, clientMutationId: randomUUID(), ...payload };
}

export async function applyCanvasOperation(api: EasyAiApi, projectId: string, type: string, payload: Record<string, unknown>, baseVersion?: number): Promise<unknown> {
  const version = baseVersion ?? stateVersion(await api.get<CanvasState>(`/v1/canvas-workflow/projects/${encodeURIComponent(projectId)}/state`));
  const clientMutationId = randomUUID();
  return api.post(`/v1/canvas-workflow/projects/${encodeURIComponent(projectId)}/operations`, {
    baseVersion: version,
    clientMutationId,
    operations: [{ type, payload }],
  }, { "Idempotency-Key": clientMutationId });
}

export async function applyCanvasBatch(api: EasyAiApi, projectId: string, operations: unknown[], baseVersion?: number): Promise<unknown> {
  if (!operations.length || operations.length > 100) throw new CliError("A canvas batch must contain 1 to 100 operations.", ExitCode.Usage);
  const version = baseVersion ?? stateVersion(await api.get<CanvasState>(`/v1/canvas-workflow/projects/${encodeURIComponent(projectId)}/state`));
  const clientMutationId = randomUUID();
  return api.post(`/v1/canvas-workflow/projects/${encodeURIComponent(projectId)}/operations`, { baseVersion: version, clientMutationId, operations }, { "Idempotency-Key": clientMutationId });
}
