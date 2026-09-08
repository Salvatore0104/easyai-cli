import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { classifyHttpError, CliError, ExitCode } from "./errors.js";

export interface ApiOptions { baseUrl: string; token?: string; timeoutMs: number; }
export class EasyAiApi {
  constructor(private readonly options: ApiOptions) {}
  get scope(): string { return createHash("sha256").update(this.options.baseUrl + "\n" + (this.options.token || "")).digest("hex"); }
  private url(path: string): string {
    const root = this.options.baseUrl.endsWith("/api") ? this.options.baseUrl : `${this.options.baseUrl}/api`;
    return `${root}${path.startsWith("/") ? path : `/${path}`}`;
  }
  async request<T = unknown>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, timeoutMs = this.options.timeoutMs): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.url(path), {
        method,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
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
    let response: Response | undefined;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(120000) });
        if (response.ok && response.body) break;
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) { lastError = error; }
      if (attempt < 3) await new Promise(done => setTimeout(done, attempt * 500));
    }
    if (!response?.ok || !response.body) throw new CliError(`Download failed after 3 attempts: ${lastError instanceof Error ? lastError.message : "unknown error"}`, ExitCode.Service);
    const pathname = new URL(url).pathname;
    const filename = `${index + 1}-${basename(pathname).replace(/[^a-zA-Z0-9._-]/g, "_") || "output"}`;
    const path = resolve(outputDir, filename);
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(path)); paths.push(path);
  }
  return paths;
}
