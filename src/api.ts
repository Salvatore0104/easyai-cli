import { createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createHash, randomUUID } from "node:crypto";
import { classifyHttpError, CliError, ExitCode } from "./errors.js";
import { atomicRename } from './storage.js';

export interface ApiOptions { baseUrl: string; token?: string; timeoutMs: number; }
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
function trustedRedirect(from: string, to: string): boolean {
  const a = new URL(from), b = new URL(to);
  if (b.username || b.password || !['http:', 'https:'].includes(b.protocol)) return false;
  if (a.protocol === 'https:' && b.protocol !== 'https:') return false;
  const aliases = ['https://wowidea.top', 'https://ai.wowidea.top'];
  return a.origin === b.origin || (aliases.includes(a.origin) && aliases.includes(b.origin));
}
const retryable = new Set([408, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise(done => setTimeout(done, ms));
export class EasyAiApi {
  constructor(private readonly options: ApiOptions) {}
  get scope(): string { return createHash("sha256").update(this.options.baseUrl + "\n" + (this.options.token || "")).digest("hex"); }
  private url(path: string): string {
    const root = this.options.baseUrl.endsWith("/api") ? this.options.baseUrl : `${this.options.baseUrl}/api`;
    return `${root}${path.startsWith("/") ? path : `/${path}`}`;
  }
  async request<T = unknown>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, timeoutMs = this.options.timeoutMs): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new CliError('Timeout must be a positive number.', ExitCode.Usage);
    // Only observations may be retried. Mutating calls, including generation,
    // always make one attempt; the website owns provider failover.
    for (let attempt = 0; ; attempt++) {
      try { return await this.requestOnce<T>(method, path, body, headers, timeoutMs); }
      catch (error) {
        const transient = error instanceof CliError && error.exitCode === ExitCode.Service && (!error.httpStatus || retryable.has(error.httpStatus));
        if (method !== 'GET' || !transient || attempt >= 2) throw error;
        await sleep(250 * (attempt + 1));
      }
    }
  }
  private async requestOnce<T>(method: string, path: string, body: unknown, headers: Record<string, string>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const requestHeaders = {
        Accept: "application/json",
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {}),
        ...headers,
      };
      const requestBody = body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body);
      // Follow redirects by hand. Native fetch drops Authorization whenever a
      // redirect changes the origin, which silences every call when a platform
      // host alias (for example ai.wowidea.top -> wowidea.top) is configured.
      let target = this.url(path);
      let response: Response | undefined;
      for (let hop = 0; hop <= 5; hop++) {
        response = await fetch(target, { method, signal: controller.signal, redirect: "manual", headers: requestHeaders, body: requestBody as RequestInit["body"] });
        const location = response.headers.get("location");
        if (!redirectStatuses.has(response.status) || !location) break;
        const next = new URL(location, target);
        if (!trustedRedirect(target, next.toString())) throw new CliError(`Refusing to follow a credential-bearing redirect to ${next.origin}; point --base-url at the canonical host instead.`, ExitCode.Auth);
        // Do not replay POST/DELETE/PATCH through redirects.
        if (method !== 'GET' && method !== 'HEAD') throw new CliError('Mutation redirected; use the canonical base URL. No request was replayed.', ExitCode.Conflict);
        await response.body?.cancel();
        target = next.toString();
      }
      if (!response) throw new CliError("No response was received.", ExitCode.Service);
      if (redirectStatuses.has(response.status)) throw new CliError(`Too many redirects while reaching ${this.url(path)}; point --base-url at the canonical host.`, ExitCode.Service);
      const text = await response.text();
      let data: unknown = text;
      try { data = text ? JSON.parse(text) : null; } catch { /* preserve text */ }
      if (!response.ok) {
        const safeData = this.options.token ? JSON.parse(JSON.stringify(data).replaceAll(this.options.token, "[REDACTED]")) : data;
        throw classifyHttpError(response.status, safeData);
      }
      return data as T;
    } catch (error) {
      if (error instanceof CliError) throw error;
      if ((error as Error).name === "AbortError") throw new CliError(`Request timed out after ${timeoutMs}ms`, ExitCode.Service);
      throw new CliError((error as Error).message, ExitCode.Service);
    } finally { clearTimeout(timer); }
  }
  get<T = unknown>(path: string) { return this.request<T>("GET", path); }
  post<T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) { return this.request<T>("POST", path, body, headers); }
  postWithTimeout<T = unknown>(path: string, body: unknown, headers: Record<string, string>, timeoutMs: number) { return this.request<T>("POST", path, body, headers, timeoutMs); }
  patch<T = unknown>(path: string, body?: unknown) { return this.request<T>("PATCH", path, body); }
  delete<T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) { return this.request<T>("DELETE", path, body, headers); }
  async upload(path: string, file: Blob, name: string, fields: Record<string, string> = {}, headers?: Record<string, string>): Promise<unknown> {
    const form = new FormData(); form.append("file", file, name); for (const [key, value] of Object.entries(fields)) form.append(key, value); return this.post(path, form, headers);
  }
}

export function findUrls(value: unknown): string[] {
  const urls = new Set<string>();
  const visit = (item: unknown) => {
    if (typeof item === "string" && /^https?:\/\//i.test(item)) urls.add(item);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === "object") for (const [key, value] of Object.entries(item)) {
      if (["data", "task", "result", "results", "output", "outputs", "images", "videos", "url", "image_url", "video_url", "download_url", "last_frame_url", "lastFrameUrl"].includes(key)) visit(value);
    }
  };
  visit(value); return [...urls];
}

export async function downloadUrls(urls: string[], outputDir: string): Promise<string[]> {
  await mkdir(outputDir, { recursive: true });
  const paths: string[] = [];
  for (const [index, url] of urls.entries()) {
    let lastError: unknown;
    const filename = `${index + 1}-${basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, "_") || "output"}`;
    const path = resolve(outputDir, filename);
    let downloaded = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const temporary = `${path}.${randomUUID()}.part`;
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
        if (!response.ok || !response.body) {
          await response.body?.cancel();
          if (!retryable.has(response.status)) throw new CliError(`Download HTTP ${response.status}`, ExitCode.Service, undefined, response.status);
          throw new Error(`HTTP ${response.status}`);
        }
        await pipeline(Readable.fromWeb(response.body as never), createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
        const size = (await stat(temporary)).size;
        const expected = response.headers.get('content-length');
        if (!size || (!response.headers.get('content-encoding') && expected !== null && size !== Number(expected))) throw new Error('Incomplete download');
        await atomicRename(temporary, path);
        paths.push(path); downloaded = true; break;
      } catch (error) { lastError = error; }
      finally { await unlink(temporary).catch(() => undefined); }
      if (lastError instanceof CliError && lastError.httpStatus && !retryable.has(lastError.httpStatus)) break;
      if (attempt < 3) await new Promise(done => setTimeout(done, attempt * 500));
    }
    if (!downloaded) throw new CliError(`Download failed: ${lastError instanceof Error ? lastError.message : "unknown error"}. Retry download for the same task.`, ExitCode.Service);
  }
  return paths;
}
