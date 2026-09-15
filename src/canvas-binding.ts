import type { CanvasApiClient } from "@easyaigc/canvas-cli";
import { mkdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { canvasBaseUrl, canvasClient } from "./canvas-auth.js";
import { CliError, ExitCode } from "./errors.js";
import { readProject } from "./project.js";
import { writeJson } from "./storage.js";

export interface CanvasBinding {
  schemaVersion: "wowidea.canvas-binding/v1";
  projectId: string;
  projectName: string;
  baseUrl: typeof canvasBaseUrl;
  profile: string;
  createdAt: string;
  verifiedAt: string;
}

export function canvasBindingPath(directory: string): string { return join(resolve(directory), ".wowidea", "canvas.json"); }
export async function readCanvasBinding(directory: string): Promise<CanvasBinding> {
  try {
    const value = JSON.parse(await readFile(canvasBindingPath(directory), "utf8"));
    if (value?.schemaVersion !== "wowidea.canvas-binding/v1" || typeof value.projectId !== "string" || !value.projectId || value.baseUrl !== canvasBaseUrl || typeof value.profile !== "string") throw new Error("invalid binding");
    return value;
  } catch { throw new CliError("Canvas binding is missing or invalid. Run wowidea project setup, or project canvas bind with an explicit project ID.", ExitCode.Usage); }
}

function projectRows(value: any): any[] {
  if (Array.isArray(value)) return value;
  for (const key of ["items", "projects", "data", "results"]) {
    if (Array.isArray(value?.[key])) return value[key];
    if (value?.[key] && typeof value[key] === "object") { const nested = projectRows(value[key]); if (nested.length) return nested; }
  }
  return [];
}
function projectId(value: any): string | undefined {
  const id = value?.projectId || value?.project_id || value?.id || value?.data?.projectId || value?.data?.id;
  return typeof id === "string" && id ? id : undefined;
}
function projectName(value: any): string | undefined {
  const name = value?.name || value?.projectName || value?.project_name || value?.data?.name;
  return typeof name === "string" && name ? name : undefined;
}

export async function verifyCanvasBinding(directory: string, profileName?: string): Promise<CanvasBinding> {
  const binding = await readCanvasBinding(directory);
  const activeProfile = profileName || binding.profile;
  const { client } = await canvasClient(activeProfile);
  try { await client.request("GET", `/v1/canvas-workflow/projects/${encodeURIComponent(binding.projectId)}/state`); }
  catch (error) { throw new CliError(`Bound Canvas project ${binding.projectId} is unavailable. Use project canvas bind or switch with an explicit accessible project ID. ${(error as Error).message}`, ExitCode.Auth); }
  const updated = { ...binding, profile: activeProfile, verifiedAt: new Date().toISOString() };
  await writeJson(canvasBindingPath(directory), updated);
  return updated;
}

export async function bindCanvasProject(directory: string, id: string, profile = "default", replace = false): Promise<CanvasBinding> {
  const path = canvasBindingPath(directory);
  const existing = await readFile(path, "utf8").then(JSON.parse).catch(() => undefined);
  if (existing && !replace && existing.projectId !== id) throw new CliError("A different Canvas project is already bound. Use project canvas switch to replace it explicitly.", ExitCode.Conflict);
  const { client } = await canvasClient(profile);
  const state = await client.request<any>("GET", `/v1/canvas-workflow/projects/${encodeURIComponent(id)}/state`);
  const now = new Date().toISOString();
  const binding: CanvasBinding = { schemaVersion: "wowidea.canvas-binding/v1", projectId: id, projectName: projectName(state) || projectName(state?.project) || id, baseUrl: canvasBaseUrl, profile, createdAt: existing?.projectId === id ? existing.createdAt || now : now, verifiedAt: now };
  await mkdir(join(resolve(directory), ".wowidea"), { recursive: true });
  await writeJson(path, binding);
  return binding;
}

export async function ensureCanvasBinding(directory: string, explicitName?: string, profile?: string): Promise<CanvasBinding> {
  const path = canvasBindingPath(directory);
  if (await readFile(path).then(() => true).catch(() => false)) return verifyCanvasBinding(directory, profile);
  const local = await readProject(directory).catch(() => undefined);
  const name = explicitName?.trim() || local?.project.name?.trim() || basename(resolve(directory));
  const activeProfile = profile || "default";
  const { client } = await canvasClient(activeProfile);
  const created = await client.request<any>("POST", "/v1/canvas-workflow/projects", { name });
  const id = projectId(created);
  if (!id) throw new CliError("Canvas project creation returned no project ID; no binding was written.", ExitCode.Service);
  const binding = await bindCanvasProject(directory, id, activeProfile, false);
  const named = { ...binding, projectName: projectName(created) || name };
  await writeJson(path, named);
  return named;
}

export async function listCanvasProjects(profile = "default"): Promise<any[]> {
  const { client } = await canvasClient(profile);
  return projectRows(await client.request("GET", "/v1/canvas-workflow/projects"));
}
