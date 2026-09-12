#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Command, Option } from "commander";
import { EasyAiApi, downloadUrls, findUrls } from "./api.js";
import { accessToken, authStatus, browserLogin, logout, useApiKey } from "./auth.js";
import { applyCanvasBatch, applyCanvasOperation, canvasMutationEnvelope } from "./canvas.js";
import { getProfile, creativeDefaults } from "./config.js";
import { CliError, ExitCode, isNotFound, redact } from "./errors.js";
import { emit, OutputOptions } from "./output.js";
import { localQuote, payloadHash, Quote, saveQuote } from "./preflight.js";
import { approveManifest, creativeHash, readManifest, seedancePayload, uploadReferences, validateManifest, validateStoryboardQc } from "./seedance.js";
import { submitAsyncWithRecovery, submitImageWithRecovery, listSubmissions, recoverSubmission, taskStatus, taskRows } from "./submission.js";
import { findModel, matchesModelType, registryEntry, routeModel, validateCapabilities } from "./models.js";
import { initProject, readProject, recordCreation } from "./project.js";
import { guideRegistry, guideInfo, showGuide } from "./guides.js";
import { prepareVideoPayload, videoSubmitTimeout, withOmniContent } from "./video-payload.js";

import { setupProject } from './setup.js';
import { usageResult } from './usage.js';
import { loadPrices, importPrices, estimate, syncPrices, platformEstimate } from './pricing.js';
import { autoRoute, applyPlatformEstimates } from './routing.js';
import { prepareReferences, uploadMedia, writeRun } from './media.js';

interface GlobalOptions extends OutputOptions { profile?: string; baseUrl?: string; timeout: string; noColor?: boolean; apiKey?: string; apiKeyStdin?: boolean }
const program = new Command();
program.name("wowidea").description("Codex visual design agent for images, brands, products and video (easyai compatible)").version("0.6.0")
  .option("--profile <name>", "configuration profile")
  .option("--base-url <url>", "EasyAI server URL")
  .option("--json", "stable JSON output")
  .option("--jsonl", "one JSON object per line")
  .option("--output <file>", "write large JSON response to a file")
  .option("--api-key <key>", "use an API key for this invocation; prefer --api-key-stdin")
  .option("--api-key-stdin", "read an API key from stdin for this invocation")
  .option("--timeout <ms>", "request timeout", "30000")
  .option("--no-color", "disable color output")
  .showHelpAfterError();

const globals = (cmd: Command): GlobalOptions => cmd.optsWithGlobals() as GlobalOptions;
const output = (value: unknown, cmd: Command) => { const o = globals(cmd); return emit(value, { json: o.json, jsonl: o.jsonl, output: o.output }); };
async function apiFor(cmd: Command): Promise<EasyAiApi> {
  const opts = globals(cmd); const profile = await getProfile(opts.profile, opts.baseUrl); const timeoutMs = Number(opts.timeout);
  const token = opts.apiKeyStdin ? await readStdinApiKey() : opts.apiKey?.trim() || await accessToken(profile.name, profile.config.baseUrl, timeoutMs);
  if (!token) throw new CliError("API key cannot be empty.", ExitCode.Auth);
  return new EasyAiApi({ baseUrl: profile.config.baseUrl, token, timeoutMs });
}
async function jsonInput(opts: { data?: string; file?: string }): Promise<Record<string, unknown>> {
  if (opts.data && opts.file) throw new CliError("Use either --data or --file, not both.", ExitCode.Usage);
  try { return JSON.parse(opts.data ?? (opts.file ? await readFile(resolve(opts.file), "utf8") : "{}")) as Record<string, unknown>; }
  catch { throw new CliError("Input must be valid JSON.", ExitCode.Usage); }
}
function dataOptions(command: Command): Command { return command.option("--data <json>", "JSON request body").option("--file <path>", "JSON request body file"); }
function mutationOptions(command: Command): Command { return dataOptions(command).option("--base-version <n>", "known canvas version", Number); }
const enc = encodeURIComponent;

const localProject = program.command("project").description("Local programme preferences and creation records; no API calls");
localProject.command("init").option("--dir <path>", "programme directory", ".").option("--name <name>", "programme name", "").action(async (o, c) => output(await initProject(o.dir, o.name), c));
localProject.command("show").option("--dir <path>", "programme directory", ".").action(async (o, c) => output(await readProject(o.dir), c));
localProject.command("validate").option("--dir <path>", "programme directory", ".").action(async (o, c) => { const result = await readProject(o.dir); await output({ valid: true, ...result }, c); });
localProject.command("record").requiredOption("--file <path>", "creation JSON").option("--dir <path>", "programme directory", ".").action(async (o, c) => output(await recordCreation(o.dir, await jsonInput(o)), c));
localProject.command('setup').option('--dir <path>', 'project directory', '.').option('--update', 'explicitly update managed runtime and unmodified skills').action(async (o,c) => output(await setupProject(o.dir, o.update),c));
const prices = program.command('prices');
prices.command('sync').requiredOption('--url <https-url>', 'verified public wowidea.prices/v1 snapshot URL').action(async(o,c)=>output(await syncPrices(o.url),c));
prices.command('show').action(async (_o,c) => output(await loadPrices() || { available: false, reason: 'Import a website price snapshot; public price endpoint not verified.' },c));
prices.command('import').argument('<file>').action(async (f,_o,c) => output(await importPrices(resolve(f)),c));
const files = program.command('files');
files.command('upload').argument('<file>').option('--project-dir <path>', 'project root', '.').action(async(f,o,c) => output(await uploadMedia(await apiFor(c),f,o.projectDir),c));
const guides = program.command("guides").description("Bundled versioned creative resources; works offline");
guides.command("list").action(async (_o, c) => output(guideRegistry.map(g => guideInfo(g.id)), c));
guides.command("show").argument("<id>").action(async (id, _o, c) => output(await showGuide(id), c));

const auth = program.command("auth").description("Manage CLI authentication");
auth.command("login").action(async (_o, c) => { const g = globals(c); await output(await browserLogin(g.profile, g.baseUrl, Number(g.timeout)), c); });
auth.command("logout").action(async (_o, c) => { const g = globals(c); await output(await logout(g.profile, g.baseUrl), c); });
auth.command("status").action(async (_o, c) => { const g = globals(c); await output(await authStatus(g.profile, g.baseUrl), c); });
auth.command("use-key").argument("[key]").option("--key-stdin", "read key from stdin").option("--prompt", "hidden local terminal input").action(async (key: string | undefined, o, c) => {
  const value = o.prompt ? await hiddenKey() : o.keyStdin ? await readStdin() : key; if (!value) throw new CliError("Provide --prompt or --key-stdin.", ExitCode.Usage);
  const g = globals(c); await output(await useApiKey(value, g.profile, g.baseUrl), c);
});

const keys = program.command("api-key").description("Manage account-level automation keys");
keys.command("create").requiredOption("--name <name>").option("--note <text>").option("--expires-at <iso>").action(async o => {
  const api = await apiFor(keys); await outputApiKeyOnce(await api.post("/auth-token", { name: o.name, remark: o.note, expiresAt: o.expiresAt }), keys);
});
keys.command("list").action(async () => output(await (await apiFor(keys)).get("/auth-token"), keys));
keys.command("revoke").argument("<id>").action(async id => output(await (await apiFor(keys)).delete(`/auth-token/${enc(id)}`), keys));

const models = program.command("models");
models.command("list").option("--type <type>", "image, video, or a raw platform modelType").action(async (o, c) => {
  const result = await (await apiFor(c)).get<any>("/v1/models");
  // The platform accepts but currently ignores ?type=, so filter locally and keep the flag honest.
  const rows = taskRows(result);
  if (!o.type) { await output(result, c); return; }
  const filtered = rows.filter((row: any) => matchesModelType(row, o.type));
  await output({ ...(result && typeof result === "object" ? result : {}), data: filtered, total: filtered.length }, c);
});
models.command("show").argument("<id>").action(async (id, _o, c) => {
  const result = await (await apiFor(c)).get<unknown>("/v1/models");
  const found = findModel(result, id);
  if (!found) { await output({ found: false, id }, c); return; }
  const entry = registryEntry(found);
  await output(entry ? { ...found, guide: entry.guide, guideInfo: guideInfo(entry.guide.replace(/^references\//, "").replace(/\.md$/, "")) } : found, c);
});
dataOptions(models.command('route')).requiredOption('--kind <image|video>').option('--model <name>').option('--purpose <text>').option('--stage <preview|final|edit|refine>').option('--speed').option('--prices <file>').action(async(o,c) => { const api = await apiFor(c); const catalog = await api.get('/v1/models'); const routed = autoRoute(catalog,{kind:o.kind, model:o.model, purpose:o.purpose, stage:o.stage, speed:o.speed, payload:await jsonInput(o)},await (o.prices ? loadPrices(o.prices) : syncPrices())); await output(routed.needsInput ? routed : await applyPlatformEstimates(api, routed), c); });
const tasks = program.command("tasks").description("Persisted submissions; recovery never submits another task");
tasks.command("list").action(async (_o, c) => output(await listSubmissions(await apiFor(c)), c));
tasks.command("remote").description("List this account's tasks from the server (read-only)").option("--page <n>", "page number", "1").option("--page-size <n>", "rows per page", "20").action(async (o, c) => {
  const page = Number(o.page), size = Number(o.pageSize);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 200) throw new CliError("--page must be a positive integer and --page-size must be between 1 and 200.", ExitCode.Usage);
  await output(await (await apiFor(c)).get(`/v1/tasks?page=${page}&page_size=${size}`), c);
});
tasks.command("resume").argument("<idempotencyKey>").action(async (key, _o, c) => (async()=>{const api=await apiFor(c);await output(await usageResult(api,await recoverSubmission(api,key)),c)})());
program.command("balance").action(async (_o, c) => output(await (await apiFor(c)).get("/v1/balance"), c));

function taskCommands(parent: Command, media: "image" | "video") {
  parent.command("status").argument("<taskId>").action(async (id, _o, c) => (async()=>{const api=await apiFor(c);await output(await usageResult(api,await api.get(`/v1/tasks/${enc(id)}`)),c)})());
  parent.command("download").argument("<taskId>").option("--dir <path>", "download directory", ".").action(async (id, o, c) => { const api=await apiFor(c); const value = await api.get(`/v1/tasks/${enc(id)}`); await output(await usageResult(api,{ taskId: id, task:value, paths: await downloadUrls(findUrls(value), resolve(o.dir,id)) }), c); });
  parent.command("watch").argument("<taskId>").option("--interval <ms>", "poll interval", "2000").action(async (id, o, c) => watchTask(await apiFor(c), id, Number(o.interval), c));
  if (media === "video") {
    parent.command("cancel").argument("<taskId>").action(async (id, _o, c) => output(await (await apiFor(c)).post(`/v1/tasks/${enc(id)}/cancel`), c));
  }
}
const image = program.command('image');
dataOptions(image.command('preflight')).action(async(o,c)=>output(await preflight(await apiFor(c),'image','/v1/images/preflight',await jsonInput(o)),c));
registerMedia(image, 'image');
taskCommands(image,'image');

async function preflight(api: EasyAiApi, kind: Quote["kind"], path: string, payload: Record<string, unknown>): Promise<Quote> {
  if (kind === "video") payload = prepareVideoPayload(payload);
  if (kind === "image") { const selected = routeModel(await api.get("/v1/models"), "image", payload.model ? String(payload.model) : (await creativeDefaults()).image); payload.model = selected.model; validateCapabilities(selected, payload); }
  if (kind === "video") validateCapabilities(routeModel(await api.get("/v1/models"), "video", String(payload.model || "")), payload);
  try {
    const response = await api.post<any>(path, payload);
    const server = response.data && !response.quoteId ? response.data : response;
    const normalized = server.normalizedRequest || payload; const computedHash = payloadHash(normalized);
    if (!server.quoteId || !server.expiresAt || !Number.isFinite(Date.parse(server.expiresAt)) || (server.payloadHash && server.payloadHash !== computedHash)) throw new CliError("Server returned an invalid preflight quote.", ExitCode.Service);
    const quote: Quote = { quoteId: String(server.quoteId), serverQuoteId: String(server.quoteId), kind, payloadHash: computedHash, payload: normalized, estimatedCost: server.estimatedCost ?? null, currency: server.currency || "points", createdAt: new Date().toISOString(), expiresAt: server.expiresAt, source: "server" };
    quote.scope = api.scope;
    quote.submissionPath = kind === "video" ? "/v1/video/generations" : kind === "image" ? "/v1/images/generations" : path.replace(/\/preflight$/, "");
    await saveQuote(quote); return quote;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    const quote = localQuote(kind, payload); await saveQuote(quote); return quote;
  }
}
async function submitOnce(api: EasyAiApi, path: string, payload: Record<string, unknown>, key: string, allowDuplicatePayload = false): Promise<unknown> {
  const kind = path.includes("video") ? "video" : "image";
  return submitAsyncWithRecovery(api, path, payload, key, kind, { submitTimeoutMs: kind === "image" ? 120_000 : videoSubmitTimeout(payload), recoveryWaitMs: 90_000, allowDuplicatePayload });
}
async function submitDirect(api: EasyAiApi, path: string, payload: Record<string, unknown>, opts: { idempotencyKey?: string; allowReroll?: boolean }): Promise<unknown> {
  const key = opts.idempotencyKey || randomUUID();
  const kind = path.includes("video") ? "video" : "image";
  return submitAsyncWithRecovery(api, path, payload, key, kind, { submitTimeoutMs: kind === "image" ? 120_000 : videoSubmitTimeout(payload), recoveryWaitMs: 90_000, allowDuplicatePayload: opts.allowReroll });
}
const video = program.command('video');
dataOptions(video.command('preflight')).action(async(o,c)=>output(await preflight(await apiFor(c),'video','/v1/video/preflight',await jsonInput(o)),c));
registerMedia(video, 'video');
taskCommands(video,'video');

function registerMedia(parent: Command, kind: 'image'|'video') {
  for (const action of ['generate','edit']) dataOptions(parent.command(action)).requiredOption('--idempotency-key <key>').option('--manifest <path>').option('--dir <path>', 'download directory','wowidea-output').option('--project-dir <path>', 'record directory','.').option('--parent <taskId>', 'source version task ID').option('--change <text>', 'revision summary').option('--purpose <text>').option('--stage <preview|final|edit|refine>').option('--prices <file>').option('--no-wait').option('--allow-reroll').action(async(o,c) => {
    const api = await apiFor(c), startedAt = new Date().toISOString();
    const prior = (await listSubmissions(api)).find(r=>r.idempotencyKey===o.idempotencyKey);
    if(prior) { const recovered=await recoverSubmission(api,o.idempotencyKey); await output(await usageResult(api,o.wait?await completeGeneration(api,recovered,kind,o.dir):recovered),c); return; }
    let payload = await jsonInput(o);
    if(o.manifest) { if(o.file || o.data) throw new CliError('Use manifest or request JSON, not both.',ExitCode.Usage); const m = await readManifest(resolve(o.manifest)); payload = seedancePayload(m); }
    const prepared = await prepareReferences(api,payload,o.projectDir); payload=prepared.payload;
    if(action==='edit') {
      if(kind==='image' && !Array.isArray(payload.image_urls)) throw new CliError('Image editing requires image/image_urls references.',ExitCode.Usage);
      if(kind==='image' && !(payload.image_urls as any[]).length) throw new CliError('Image editing requires a source image.',ExitCode.Usage);
      if(kind==='video') { if(!(payload.video_urls as any[])?.length) throw new CliError('Video editing requires video_urls.',ExitCode.Usage); payload.mode ??= 'video_edit'; }
    }
    const catalog = await api.get('/v1/models'); const book = await loadPrices(o.prices);
    let routing: any;
    if(o.stage || o.purpose) {
      routing = autoRoute(catalog,{kind, model:payload.model as string, stage:o.stage || (action==='edit'?'edit':undefined), purpose:o.purpose, payload},book);
      if(routing.needsInput) { await output(routing,c); return; } payload=routing.payload;
    }
    const selected=routeModel(catalog,kind,payload.model ? String(payload.model) : (await creativeDefaults())[kind]);
    payload.model=selected.model;
    if(kind==='video') { const caps=selected.capabilities.capabilities?.omni_video; if(action==='edit' && caps?.omni_reference_task_type?.constraints?.edit) { const rule=caps.omni_reference_task_type.constraints.edit; payload.omni_reference_task_type='edit'; if(rule.forced_duration!==undefined && payload.duration===undefined)payload.duration=rule.forced_duration; if(rule.forced_aspect_ratio && payload.aspect_ratio===undefined)payload.aspect_ratio=rule.forced_aspect_ratio; } payload=prepareVideoPayload(payload); if(caps) payload=withOmniContent(payload); }
    validateCapabilities(selected,payload);
    if(kind==='image' && payload.image_urls) { payload.image=payload.image_urls; delete payload.image_urls; }
    const offlinePricing=estimate(book,selected.model,kind,payload);
    const livePricing=await platformEstimate(api,payload);
    const pricing=livePricing?{...offlinePricing,estimatedPoints:livePricing.estimatedPoints,rawEstimatedPoints:livePricing.raw,reason:livePricing.reason,source:livePricing.source,discount:livePricing.discount}:offlinePricing;
    const record:any={schemaVersion:'wowidea.run/v1',kind,action,startedAt,parentTaskId:o.parent||null,change:o.change||null,stage:o.stage||action,purpose:o.purpose||null,routing,model:selected.model,payload,references:prepared.sources,pricing,qc:{verdict:'not_reviewed'},state:'prepared'};
    const recordPath=await writeRun(o.projectDir,o.idempotencyKey,record);
    try {
      const submitted=await submitDirect(api,kind==='image'?'/v1/images/generations':'/v1/video/generations',payload,o);
      record.taskId=findTaskId(submitted);record.state='submitted';await writeRun(o.projectDir,o.idempotencyKey,record);
      const result=await usageResult(api,o.wait?await completeGeneration(api,submitted,kind,o.dir):submitted);
      Object.assign(record,{state:taskStatus(result),result,elapsedMs:Date.now()-Date.parse(startedAt)});await writeRun(o.projectDir,o.idempotencyKey,record);
      await output({...result,pricing,recordPath},c);
    } catch(error) { record.state='interrupted';record.error=String((error as Error).message);await writeRun(o.projectDir,o.idempotencyKey,record).catch(()=>{});throw error; }
  });
}

async function watchTask(api: EasyAiApi, id: string, interval: number, cmd: Command) {
  if (!Number.isFinite(interval) || interval < 250) throw new CliError("Poll interval must be at least 250ms.", ExitCode.Usage);
  const deadline = Date.now() + 30 * 60_000;
  let cursor = "";
  while (Date.now() < deadline) {
    const task = await api.get<any>(`/v1/tasks/${enc(id)}`); const status = taskStatus(task);
    const terminal = ["completed", "succeeded", "success", "failed", "error", "cancelled", "canceled"].includes(status);
    if (globals(cmd).jsonl) await output(terminal ? await usageResult(api, { taskId: id, status, task }) : { taskId: id, status, cursor }, cmd);
    if (terminal) { if (!globals(cmd).jsonl) await output(await usageResult(api, task), cmd); return; }
    await new Promise(r => setTimeout(r, Math.max(250, interval)));
  }
  throw new CliError(`Watch deadline reached; resume status/watch for task ${id}. No new task was submitted.`, ExitCode.Service);
}

async function completeGeneration(api: EasyAiApi, submitted: unknown, kind: "image" | "video", directory: string): Promise<unknown> {
  const id = findTaskId(submitted);
  let task: any = submitted;
  let status = taskStatus(task);
  let urls = findUrls(task);
  const terminal = () => ["completed", "succeeded", "success", "failed", "error", "cancelled", "canceled"].includes(status);
  const successful = () => ["completed", "succeeded", "success"].includes(status);
  if (id && (!terminal() || (successful() && !urls.length))) {
    const deadline = Date.now() + 30 * 60_000;
    while (Date.now() < deadline) {
      task = await api.get(`/v1/tasks/${enc(id)}`); status = taskStatus(task); urls = findUrls(task);
      if (terminal() && (!successful() || urls.length)) break;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (!terminal() || (successful() && !urls.length)) throw new CliError(`Task ${id} did not expose a downloadable ${kind} within 30 minutes. Resume status/download for this same task; do not submit again.`, ExitCode.Service);
  }
  if (["failed", "error", "cancelled", "canceled"].includes(status)) return { taskId: id, status, paths: [], task };
  if (!urls.length) throw new CliError(`Task ${id || "response"} reported ${status || "success"} but returned no downloadable ${kind} URL. Query this task again; do not resubmit.`, ExitCode.Service);
  const target = resolve(directory, id || `${kind}-${Date.now()}`);
  return { taskId: id, status: status === "unknown" ? "completed" : status, paths: await downloadUrls(urls, target), task };
}

const canvas = program.command("canvas");
mutationOptions(canvas.command("operation")).argument("<projectId>").argument("<type>").description("Submit one low-level atomic canvas operation").action(async (p, type, o, c) => output(await applyCanvasOperation(await apiFor(c), p, type, await jsonInput(o), o.baseVersion), c));
const project = canvas.command("project");
project.command("list").action(async (_o, c) => output(await (await apiFor(c)).get("/v1/canvas-workflow/projects"), c));
dataOptions(project.command("create")).requiredOption("--name <name>").action(async (o, c) => output(await (await apiFor(c)).post("/v1/canvas-workflow/projects", { name: o.name, ...(await jsonInput(o)) }), c));
project.command("show").argument("<id>").action(async (id, _o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/projects/${enc(id)}/state`), c));
project.command("open").argument("<id>").action(async (id, _o, c) => { const g = globals(c); const p = await getProfile(g.profile, g.baseUrl); openExternal(`${p.config.baseUrl}/canvas/${enc(id)}`); await output({ opened: true, projectId: id }, c); });
const nodeTypes = canvas.command("node-types");
nodeTypes.command("list").action(async (_o, c) => output(await (await apiFor(c)).get("/v1/canvas-workflow/node-types"), c));
nodeTypes.command("show").argument("<kind>").action(async (kind, _o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/node-types/${enc(kind)}`), c));
nodeTypes.command("options").argument("<kind>").action(async (kind, _o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/node-types/${enc(kind)}/options`), c));
const node = canvas.command("node");
mutationOptions(node.command("add")).argument("<projectId>").requiredOption("--kind <kind>").action(async (id, o, c) => output(await applyCanvasOperation(await apiFor(c), id, "node.add", { kind: o.kind, ...(await jsonInput(o)) }, o.baseVersion), c));
mutationOptions(node.command("configure")).argument("<projectId>").argument("<nodeId>").action(async (p, n, o, c) => { const api = await apiFor(c); const body = await canvasMutationEnvelope(api, p, { configuration: await jsonInput(o) }, o.baseVersion); await output(await api.post(`/v1/canvas-workflow/projects/${enc(p)}/nodes/${enc(n)}/configure`, body, { "Idempotency-Key": String(body.clientMutationId) }), c); });
node.command("inputs").argument("<projectId>").argument("<nodeId>").action(async (p, n, _o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/projects/${enc(p)}/nodes/${enc(n)}/inputs`), c));
node.command("remove").argument("<projectId>").argument("<nodeId>").option("--base-version <n>", "known canvas version", Number).action(async (p, n, o, c) => output(await applyCanvasOperation(await apiFor(c), p, "node.remove", { nodeId: n }, o.baseVersion), c));
for (const verb of ["move", "resize"] as const) mutationOptions(node.command(verb)).argument("<projectId>").argument("<nodeId>").action(async (p, n, o, c) => output(await applyCanvasOperation(await apiFor(c), p, "node.structure.patch", { nodeId: n, [verb]: await jsonInput(o) }, o.baseVersion), c));
for (const verb of ["bind", "unbind"] as const) mutationOptions(canvas.command(verb)).argument("<projectId>").argument("<nodeId>").action(async (p, n, o, c) => output(await applyCanvasOperation(await apiFor(c), p, "node.data.update", { nodeId: n, action: verb, ...(await jsonInput(o)) }, o.baseVersion), c));
const edge = canvas.command("edge");
for (const verb of ["add", "remove"] as const) mutationOptions(edge.command(verb)).argument("<projectId>").action(async (p, o, c) => output(await applyCanvasOperation(await apiFor(c), p, `edge.${verb}`, await jsonInput(o), o.baseVersion), c));
const group = canvas.command("group");
for (const verb of ["create", "ungroup"] as const) mutationOptions(group.command(verb)).argument("<projectId>").action(async (p, o, c) => output(await applyCanvasOperation(await apiFor(c), p, `group.${verb}`, await jsonInput(o), o.baseVersion), c));
const asset = canvas.command("asset");
asset.command("list").argument("<projectId>").action(async (p, _o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/projects/${enc(p)}/assets`), c));
mutationOptions(asset.command("add")).argument("<projectId>").action(async (p, o, c) => { const api = await apiFor(c); const body = await canvasMutationEnvelope(api, p, { asset: await jsonInput(o) }, o.baseVersion); await output(await api.post(`/v1/canvas-workflow/projects/${enc(p)}/assets`, body, { "Idempotency-Key": String(body.clientMutationId) }), c); });
asset.command("remove").argument("<projectId>").argument("<assetId>").option("--base-version <n>", "known canvas version", Number).action(async (p, a, o, c) => { const api = await apiFor(c); const body = await canvasMutationEnvelope(api, p, {}, o.baseVersion); await output(await api.delete(`/v1/canvas-workflow/projects/${enc(p)}/assets/${enc(a)}`, body, { "Idempotency-Key": String(body.clientMutationId) }), c); });
asset.command("upload").argument("<projectId>").argument("<file>").option("--base-version <n>", "known canvas version", Number).action(async (p, f, o, c) => { const api = await apiFor(c); const bytes = await readFile(resolve(f)); const envelope = await canvasMutationEnvelope(api, p, {}, o.baseVersion); await output(await api.upload(`/v1/canvas-workflow/projects/${enc(p)}/files`, new Blob([bytes]), resolve(f).split(/[\\/]/).pop()!, { baseVersion: String(envelope.baseVersion), clientMutationId: String(envelope.clientMutationId) }, { "Idempotency-Key": String(envelope.clientMutationId) }), c); });
const template = canvas.command("template");
template.command("list").action(async (_o, c) => output(await (await apiFor(c)).get("/v1/canvas-workflow/templates"), c));
template.command("show").argument("<id>").action(async (id, _o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/templates/${enc(id)}`), c));
mutationOptions(template.command("create")).argument("<projectId>").action(async (p, o, c) => { const api = await apiFor(c); const body = await canvasMutationEnvelope(api, p, { template: await jsonInput(o) }, o.baseVersion); await output(await api.post(`/v1/canvas-workflow/projects/${enc(p)}/templates`, body, { "Idempotency-Key": String(body.clientMutationId) }), c); });
template.command("import").argument("<projectId>").argument("<templateId>").option("--base-version <n>", "known canvas version", Number).action(async (p, t, o, c) => { const api = await apiFor(c); const body = await canvasMutationEnvelope(api, p, {}, o.baseVersion); await output(await api.post(`/v1/canvas-workflow/projects/${enc(p)}/templates/${enc(t)}/import`, body, { "Idempotency-Key": String(body.clientMutationId) }), c); });
dataOptions(canvas.command("batch")).argument("<projectId>").option("--base-version <n>", "known canvas version", Number).action(async (p, o, c) => { const body = await jsonInput(o); const operations = Array.isArray(body) ? body : body.operations; await output(await applyCanvasBatch(await apiFor(c), p, operations as unknown[], o.baseVersion), c); });
dataOptions(canvas.command("run")).argument("<projectId>").addOption(new Option("--node <id>").conflicts(["group", "all"])).addOption(new Option("--group <id>").conflicts(["node", "all"])).option("--all").option("--preflight").action(async (p, o, c) => {
  const payload = { ...(await jsonInput(o)), ...(o.node ? { nodeId: o.node } : o.group ? { groupId: o.group } : { all: true }) }; const api = await apiFor(c);
  if (o.preflight) { await output(await preflight(api, "canvas", `/v1/canvas-workflow/projects/${enc(p)}/executions/preflight`, payload), c); return; }
  const state = await api.get(`/v1/canvas-workflow/projects/${enc(p)}/state`);

  await output((await submitDirect(api, `/v1/canvas-workflow/projects/${enc(p)}/executions`, payload, o)), c);
});
const canvasTask = canvas.command("task");
canvasTask.command("show").argument("<projectId>").argument("<taskId>").action(async (p, t, _o, c) => output((await (await apiFor(c)).get(`/v1/canvas-workflow/projects/${enc(p)}/tasks/${enc(t)}`)), c));
canvasTask.command("events").argument("<projectId>").argument("<taskId>").option("--cursor <cursor>").action(async (p, t, o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/projects/${enc(p)}/tasks/${enc(t)}/events${o.cursor ? `?cursor=${enc(o.cursor)}` : ""}`), c));
canvasTask.command("watch").argument("<projectId>").argument("<taskId>").option("--interval <ms>", "poll interval", "2000").action(async (_p, t, o, c) => watchTask(await apiFor(c), t, Number(o.interval), c));
canvasTask.command("cancel").argument("<projectId>").argument("<taskId>").action(async (p, t, _o, c) => output(await (await apiFor(c)).post(`/v1/canvas-workflow/projects/${enc(p)}/tasks/${enc(t)}/cancel`), c));

const seedance = program.command("seedance").description("Validate and approve Seedance manifests without submitting paid tasks");
seedance.command("payload").argument("<manifest>").requiredOption("--file <path>").action(async (p, o, c) => { const m = await readManifest(resolve(p)); await validateManifest(m, true); const path = resolve(o.file); await writeFile(path, JSON.stringify(seedancePayload(m), null, 2), { mode: 0o600 }); await output({ path }, c); });
seedance.command("validate").argument("<manifest>").option("--verify-remote").option("--for-approval", "require completed storyboard visual QC").action(async (p, o, c) => { const m = await readManifest(resolve(p)); await validateManifest(m, o.verifyRemote); if (o.forApproval) validateStoryboardQc(m); await output({ valid: true, approvalReady: Boolean(o.forApproval), state: m.state, creativeHash: creativeHash(m), referenceCount: m.references.length, storyboardQc: m.storyboardQc, watermark: m.watermark }, c); });
seedance.command("approve").argument("<manifest>").requiredOption("--confirmation <text>").action(async (p, o, c) => output(await approveManifest(resolve(p), o.confirmation), c));
seedance.command("upload-references").argument("<manifest>").action(async (p, _o, c) => output(await uploadReferences(resolve(p)), c));
seedance.command("finalize").argument("<manifest>").requiredOption("--dir <path>").description("Download the submitted task and create ledger and QC artifacts").action(async (p, o, c) => {
  const manifestPath = resolve(p); const manifest = await readManifest(manifestPath);
  if (!manifest.taskId) throw new CliError("Manifest has no submitted task ID.", ExitCode.Approval);
  const task = await (await apiFor(c)).get<any>(`/v1/tasks/${enc(manifest.taskId)}`); const status = String(task.status || task.data?.status || "unknown").toLowerCase();
  const outDir = resolve(o.dir); await mkdir(outDir, { recursive: true }); let paths: string[] = []; const qc: Record<string, unknown> = { status: "not-run", manualReviewRequired: true };
  if (["completed", "succeeded", "success"].includes(status)) {
    paths = await downloadUrls(findUrls(task), outDir); const videoPath = paths.find(x => /\.(mp4|mov|webm)$/i.test(x));
    if (videoPath) {
      const contact = resolve(outDir, "contact-sheet.jpg"), tail = resolve(outDir, "final-frame.png"), corner = resolve(outDir, "bottom-right-sample.png");
      const madeContact = await runFfmpeg(["-y", "-i", videoPath, "-vf", "fps=1,scale=480:-1,tile=4x3", contact]);
      const madeTail = await runFfmpeg(["-y", "-sseof", "-0.1", "-i", videoPath, "-frames:v", "1", tail]);
      const madeCorner = await runFfmpeg(["-y", "-i", videoPath, "-vf", "fps=1,crop=iw/3:ih/3:iw*2/3:ih*2/3,scale=320:-1,tile=4x3", "-frames:v", "1", corner]);
      Object.assign(qc, { status: madeContact && madeTail && madeCorner ? "artifacts-ready" : "ffmpeg-unavailable", contactSheet: madeContact ? contact : null, finalFrame: madeTail ? tail : null, bottomRightSample: madeCorner ? corner : null });
    }
    manifest.state = "completed";
  } else if (["failed", "cancelled", "canceled"].includes(status)) manifest.state = "failed";
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const ledger = { schemaVersion: "easyai.seedance-ledger/v1", taskId: manifest.taskId, status, model: manifest.model, duration: manifest.duration, aspectRatio: manifest.aspectRatio, resolution: manifest.resolution, audio: manifest.audio, watermark: false, mode: manifest.mode, lastFrameRequested: manifest.lastFrameRequested, referenceCounts: manifest.referenceCounts, references: manifest.references.map(r => ({ type: r.type, role: r.role, localPath: r.localPath, objectKey: r.objectKey, sha256: r.sha256 })), prompt: manifest.prompt, manifestPath, paths, qc, recordedAt: new Date().toISOString() };
  const ledgerPath = resolve(outDir, "task-ledger.json"); await writeFile(ledgerPath, JSON.stringify({ ...ledger }, null, 2) + "\n", "utf8"); await output({ taskId: manifest.taskId, status, paths, ledgerPath, qc }, c);
});

function openExternal(url: string) { const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open"; const args = process.platform === "win32" ? ["/c", "start", "", url] : [url]; spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true }).unref(); }
async function readStdin(): Promise<string> { const chunks: Buffer[] = []; for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks).toString("utf8").trim(); }
let directApiKeyPromise: Promise<string> | undefined;
function readStdinApiKey(): Promise<string> { return directApiKeyPromise ||= readStdin(); }
async function outputApiKeyOnce(value: unknown, cmd: Command): Promise<void> { const options = globals(cmd); if (options.output) throw new CliError("--output is disabled for API key creation because the plaintext is shown only once.", ExitCode.Usage); process.stderr.write("The account-level API key is shown once. Store it in an OS credential manager and revoke it immediately if exposed.\n"); process.stdout.write(JSON.stringify(options.json ? { schemaVersion: "easyai.cli/v1", data: value } : value, null, 2) + "\n"); }
function findTaskId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return;
  const row = value as Record<string, any>; const id = row.taskId || row.task_id || row.id;
  if (typeof id === "string") return id;
  for (const key of ["data", "result", "task"]) { const nested = findTaskId(row[key]); if (nested) return nested; }
}
async function hiddenKey(): Promise<string> {
  if (!process.stdin.isTTY) throw new CliError("--prompt requires a local interactive terminal.", ExitCode.Usage);
  process.stderr.write("Account API Key (hidden): ");
  return new Promise((done, reject) => {
    let value = ""; process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding("utf8");
    const finish = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.removeListener("data", listener); process.stderr.write("\n"); };
    const listener = (chunk: string) => { for (const ch of chunk) {
      if (ch === "\u0003") { finish(); reject(new CliError("Input cancelled", ExitCode.Auth)); return; }
      if (ch === "\r" || ch === "\n") { finish(); done(value.trim()); return; }
      if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1); else if (ch >= " ") value += ch;
    } }; process.stdin.on("data", listener);
  });
}
async function runFfmpeg(args: string[]): Promise<boolean> { return new Promise(resolveResult => { const child = spawn("ffmpeg", args, { stdio: "ignore", windowsHide: true }); child.on("error", () => resolveResult(false)); child.on("exit", code => resolveResult(code === 0)); }); }

program.exitOverride();
program.parseAsync().catch(async error => {
  if (error?.code === "commander.helpDisplayed" || error?.code === "commander.version") { process.exitCode = ExitCode.Success; return; }
  const cliError = error instanceof CliError ? error : error?.code?.startsWith("commander.") ? new CliError(error.message, ExitCode.Usage) : new CliError(error instanceof Error ? error.message : String(error), ExitCode.Service);
  process.stderr.write(JSON.stringify(redact({ error: cliError.message, code: cliError.exitCode, details: cliError.details })) + "\n"); process.exitCode = cliError.exitCode;
});
