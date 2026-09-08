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
import { CliError, ExitCode, redact } from "./errors.js";
import { emit, OutputOptions } from "./output.js";
import { assertQuote, loadQuote, localQuote, payloadHash, Quote, saveQuote } from "./preflight.js";
import { approveManifest, creativeHash, readManifest, seedancePayload, uploadReferences, validateManifest } from "./seedance.js";
import { submitAsyncWithRecovery, submitImageWithRecovery, listSubmissions, recoverSubmission, taskStatus, taskRows } from "./submission.js";
import { routeModel, validateCapabilities } from "./models.js";

interface GlobalOptions extends OutputOptions { profile?: string; baseUrl?: string; timeout: string; noColor?: boolean; apiKey?: string; apiKeyStdin?: boolean }
const program = new Command();
program.name("wowidea").description("Control EasyAI generation and infinite canvas workflows (easyai compatible)").version("0.2.0")
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
models.command("list").option("--type <type>").action(async o => output(await (await apiFor(models)).get(o.type ? `/v1/models?type=${enc(o.type)}` : "/v1/models"), models));
models.command("show").argument("<id>").action(async id => { const result = await (await apiFor(models)).get<unknown>("/v1/models"); await output(taskRows(result).find((x: any) => x.id === id || x.model === id || x.modelName === id) ?? { found: false, id }, models); });
models.command("route").requiredOption("--kind <image|video>").option("--model <name>").action(async (o, c) => { const defaults = await creativeDefaults(); await output(routeModel(await (await apiFor(c)).get("/v1/models"), o.kind, o.model || defaults[o.kind as "image" | "video"]), c); });
const tasks = program.command("tasks").description("Persisted submissions; recovery never submits another task");
tasks.command("list").action(async (_o, c) => output(await listSubmissions(await apiFor(c)), c));
tasks.command("resume").argument("<idempotencyKey>").action(async (key, _o, c) => output(await recoverSubmission(await apiFor(c), key), c));
program.command("balance").action(async (_o, c) => output(await (await apiFor(c)).get("/v1/balance"), c));

function taskCommands(parent: Command, media: "image" | "video") {
  parent.command("status").argument("<taskId>").action(async (id, _o, c) => output(await (await apiFor(c)).get(`/v1/tasks/${enc(id)}`), c));
  parent.command("download").argument("<taskId>").option("--dir <path>", "download directory", ".").action(async (id, o, c) => { const value = await (await apiFor(c)).get(`/v1/tasks/${enc(id)}`); await output({ taskId: id, paths: await downloadUrls(findUrls(value), resolve(o.dir)) }, c); });
  parent.command("watch").argument("<taskId>").option("--interval <ms>", "poll interval", "2000").action(async (id, o, c) => watchTask(await apiFor(c), id, Number(o.interval), c));
  if (media === "video") {
    parent.command("cancel").argument("<taskId>").action(async (id, _o, c) => output(await (await apiFor(c)).post(`/v1/tasks/${enc(id)}/cancel`), c));
  }
}
const image = program.command("image");
dataOptions(image.command("generate")).requiredOption("--idempotency-key <key>").action(async (o, c) => { const payload = await jsonInput(o); if (/seedance/i.test(String(payload.model))) throw new CliError("Seedance requires video generate --manifest.", ExitCode.Approval); const api = await apiFor(c); const selected = routeModel(await api.get("/v1/models"), "image", payload.model ? String(payload.model) : (await creativeDefaults()).image); payload.model = selected.model; validateCapabilities(selected, payload); await output(await submitImageWithRecovery(api, payload, o.idempotencyKey), c); });
taskCommands(image, "image");

async function preflight(api: EasyAiApi, kind: "video" | "canvas", path: string, payload: Record<string, unknown>): Promise<Quote> {
  if (kind === "video") validateCapabilities(routeModel(await api.get("/v1/models"), "video", String(payload.model || "")), payload);
  try {
    const response = await api.post<any>(path, payload);
    const server = response.data && !response.quoteId ? response.data : response;
    const normalized = server.normalizedRequest || payload; const computedHash = payloadHash(normalized);
    if (!server.quoteId || !server.expiresAt || !Number.isFinite(Date.parse(server.expiresAt)) || (server.payloadHash && server.payloadHash !== computedHash)) throw new CliError("Server returned an invalid preflight quote.", ExitCode.Service);
    const quote: Quote = { quoteId: String(server.quoteId), serverQuoteId: String(server.quoteId), kind, payloadHash: computedHash, payload: normalized, estimatedCost: server.estimatedCost ?? null, currency: server.currency || "points", createdAt: new Date().toISOString(), expiresAt: server.expiresAt, source: "server" };
    quote.scope = api.scope;
    quote.submissionPath = kind === "video" ? "/v1/video/generations" : path.replace(/\/preflight$/, "");
    await saveQuote(quote); return quote;
  } catch (error) {
    if (!(error instanceof CliError) || !/HTTP 404/.test(error.message)) throw error;
    const quote = localQuote(kind, payload); await saveQuote(quote); return quote;
  }
}
async function confirmQuote(quote: Quote, opts: { yes?: boolean; maxCost?: string }): Promise<void> {
  assertQuote(quote);
  if (opts.yes) {
    const limit = Number(opts.maxCost);
    if (opts.maxCost === undefined || !Number.isFinite(limit) || limit < 0 || quote.estimatedCost === null) throw new CliError("Non-interactive generation requires a non-negative --max-cost and a server cost estimate.", ExitCode.Approval);
    if (quote.estimatedCost > limit) throw new CliError(`Estimated cost ${quote.estimatedCost} exceeds limit ${opts.maxCost}.`, ExitCode.Budget);
    return;
  }
  if (!process.stdin.isTTY) throw new CliError("Interactive approval is unavailable; use --yes --max-cost with a server quote.", ExitCode.Approval);
  process.stderr.write(`Submit one task for ${quote.estimatedCost ?? "unknown"} ${quote.currency}? Type YES: `);
  const rl = createInterface({ input: process.stdin, output: process.stderr }); const answer = await rl.question(""); rl.close();
  if (answer !== "YES") throw new CliError("Generation was not approved.", ExitCode.Approval);
}
async function submitOnce(api: EasyAiApi, path: string, payload: Record<string, unknown>, quote: Quote, key = quote.quoteId): Promise<unknown> {
  if (quote.scope !== api.scope) throw new CliError("Quote belongs to another server or credential; preflight again.", ExitCode.Approval);
  if (quote.submissionPath !== path) throw new CliError("Quote belongs to another execution endpoint.", ExitCode.Approval);
  const kind = path.includes("video") ? "video" : "image";
  return submitAsyncWithRecovery(api, path, { ...payload, quoteId: quote.serverQuoteId || quote.quoteId }, key, kind);
}
const video = program.command("video");
dataOptions(video.command("preflight")).action(async (o, c) => output(await preflight(await apiFor(c), "video", "/v1/video/preflight", await jsonInput(o)), c));
dataOptions(video.command("generate")).requiredOption("--quote <id>").requiredOption("--idempotency-key <key>").option("--yes").option("--max-cost <amount>").option("--manifest <path>").action(async (o, c) => {
  let payload = await jsonInput(o);
  let manifestPath: string | undefined;
  let approvalKey: string | undefined;
  if (/seedance/i.test(String(payload.model)) && !o.manifest) throw new CliError("Seedance requires an approved --manifest; direct payload submission is disabled.", ExitCode.Approval);
  if (o.manifest) {
    manifestPath = resolve(o.manifest); const manifest = await readManifest(manifestPath); await validateManifest(manifest, true);
    if (manifest.state !== "approved" || manifest.approval?.creativeHash !== creativeHash(manifest)) throw new CliError("Seedance storyboard is not currently approved.", ExitCode.Approval);
    payload = seedancePayload(manifest);
    approvalKey = `seedance-${payloadHash(manifest.approval)}`;
  }
  const api = await apiFor(c);
  const selected = routeModel(await api.get("/v1/models"), "video", String(payload.model || ""));
  validateCapabilities(selected, payload);
  if (selected.approvalRequired && !manifestPath) throw new CliError("Seedance requires an approved manifest.", ExitCode.Approval);
  const quote = await loadQuote(o.quote); assertQuote(quote, payload); await confirmQuote(quote, o);
  if (manifestPath) { const latest = await readManifest(manifestPath); await validateManifest(latest, true); if (latest.state !== "approved" || `seedance-${payloadHash(latest.approval)}` !== approvalKey || payloadHash(seedancePayload(latest)) !== payloadHash(payload)) throw new CliError("Manifest changed during preflight; approval is invalid.", ExitCode.Approval); }
  const result = await submitOnce(api, "/v1/video/generations", payload, quote, approvalKey || o.idempotencyKey);
  if (manifestPath) {
    const manifest = await readManifest(manifestPath); const taskId = findTaskId(result);
    if (!taskId) throw new CliError("Submission returned no task ID; the manifest was not advanced and no retry was made.", ExitCode.Service);
    manifest.state = "submitted"; manifest.taskId = taskId; await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  }
  await output(result, c);
});
taskCommands(video, "video");

async function watchTask(api: EasyAiApi, id: string, interval: number, cmd: Command) {
  if (!Number.isFinite(interval) || interval < 250) throw new CliError("Poll interval must be at least 250ms.", ExitCode.Usage);
  const deadline = Date.now() + 30 * 60_000;
  let cursor = "";
  while (Date.now() < deadline) {
    const task = await api.get<any>(`/v1/tasks/${enc(id)}`); const status = taskStatus(task);
    if (globals(cmd).jsonl) await output({ taskId: id, status, cursor }, cmd);
    if (["completed", "succeeded", "success", "failed", "error", "cancelled", "canceled"].includes(status)) { if (!globals(cmd).jsonl) await output(task, cmd); return; }
    await new Promise(r => setTimeout(r, Math.max(250, interval)));
  }
  throw new CliError(`Watch deadline reached; resume status/watch for task ${id}. No new task was submitted.`, ExitCode.Service);
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
dataOptions(canvas.command("run")).argument("<projectId>").addOption(new Option("--node <id>").conflicts(["group", "all"])).addOption(new Option("--group <id>").conflicts(["node", "all"])).option("--all").option("--preflight").option("--quote <id>").option("--yes").option("--max-cost <amount>").action(async (p, o, c) => {
  const payload = { ...(await jsonInput(o)), ...(o.node ? { nodeId: o.node } : o.group ? { groupId: o.group } : { all: true }) }; const api = await apiFor(c);
  if (o.preflight) { await output(await preflight(api, "canvas", `/v1/canvas-workflow/projects/${enc(p)}/executions/preflight`, payload), c); return; }
  if (!o.quote) throw new CliError("Canvas execution requires --quote from --preflight.", ExitCode.Approval); const quote = await loadQuote(o.quote); assertQuote(quote, payload); await confirmQuote(quote, o);
  const state = await api.get(`/v1/canvas-workflow/projects/${enc(p)}/state`);
  if (/seedance/i.test(JSON.stringify(state))) throw new CliError("Canvas containing Seedance must use video generate --manifest; canvas approval bridging is not implemented.", ExitCode.Approval);
  await output(await submitOnce(api, `/v1/canvas-workflow/projects/${enc(p)}/executions`, payload, quote), c);
});
const canvasTask = canvas.command("task");
canvasTask.command("show").argument("<projectId>").argument("<taskId>").action(async (p, t, _o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/projects/${enc(p)}/tasks/${enc(t)}`), c));
canvasTask.command("events").argument("<projectId>").argument("<taskId>").option("--cursor <cursor>").action(async (p, t, o, c) => output(await (await apiFor(c)).get(`/v1/canvas-workflow/projects/${enc(p)}/tasks/${enc(t)}/events${o.cursor ? `?cursor=${enc(o.cursor)}` : ""}`), c));
canvasTask.command("watch").argument("<projectId>").argument("<taskId>").option("--interval <ms>", "poll interval", "2000").action(async (_p, t, o, c) => watchTask(await apiFor(c), t, Number(o.interval), c));
canvasTask.command("cancel").argument("<projectId>").argument("<taskId>").action(async (p, t, _o, c) => output(await (await apiFor(c)).post(`/v1/canvas-workflow/projects/${enc(p)}/tasks/${enc(t)}/cancel`), c));

const seedance = program.command("seedance").description("Validate and approve Seedance manifests without submitting paid tasks");
seedance.command("payload").argument("<manifest>").requiredOption("--file <path>").action(async (p, o, c) => { const m = await readManifest(resolve(p)); await validateManifest(m, true); const path = resolve(o.file); await writeFile(path, JSON.stringify(seedancePayload(m), null, 2), { mode: 0o600 }); await output({ path }, c); });
seedance.command("validate").argument("<manifest>").option("--verify-remote").action(async (p, o, c) => { const m = await readManifest(resolve(p)); await validateManifest(m, o.verifyRemote); await output({ valid: true, state: m.state, creativeHash: creativeHash(m), referenceCount: m.references.length, watermark: m.watermark }, c); });
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
  const ledgerPath = resolve(outDir, "task-ledger.json"); await writeFile(ledgerPath, JSON.stringify(ledger, null, 2) + "\n", "utf8"); await output({ taskId: manifest.taskId, status, paths, ledgerPath, qc }, c);
});

function openExternal(url: string) { const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open"; const args = process.platform === "win32" ? ["/c", "start", "", url] : [url]; spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true }).unref(); }
async function readStdin(): Promise<string> { const chunks: Buffer[] = []; for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks).toString("utf8").trim(); }
let directApiKeyPromise: Promise<string> | undefined;
function readStdinApiKey(): Promise<string> { return directApiKeyPromise ||= readStdin(); }
async function outputApiKeyOnce(value: unknown, cmd: Command): Promise<void> { const options = globals(cmd); if (options.output) throw new CliError("--output is disabled for API key creation because the plaintext is shown only once.", ExitCode.Usage); process.stderr.write("The account-level API key is shown once. Store it in an OS credential manager and revoke it immediately if exposed.\n"); process.stdout.write(JSON.stringify(options.json ? { schemaVersion: "easyai.cli/v1", data: value } : value, null, 2) + "\n"); }
function findTaskId(value: unknown): string | undefined { if (!value || typeof value !== "object") return; const row = value as Record<string, any>; return row.taskId || row.task_id || row.id || row.data?.taskId || row.data?.task_id || row.data?.id; }
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
