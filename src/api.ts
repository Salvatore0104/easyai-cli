import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { classifyHttpError, CliError, ExitCode } from "./errors.js";

export interface ApiOptions { baseUrl: string; token?: string; timeoutMs: number; }
export class EasyAiApi {
  constructor(private readonly options: ApiOptions) {}
  private url(path: string): string {
    const root = this.options.baseUrl.endsWith("/api") ? this.options.baseUrl : `${this.options.baseUrl}/api`;
    return `${root}${path.startsWith("/") ? path : `/${path}`}`;
  }
  async request<T = unknown>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
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
      if (!response.ok) throw classifyHttpError(response.status, data);
      return data as T;
    } catch (error) {
      if (error instanceof CliError) throw error;
      if ((error as Error).name === "AbortError") throw new CliError(`Request timed out after ${this.options.timeoutMs}ms`, ExitCode.Service);
      throw new CliError((error as Error).message, ExitCode.Service);
    } finally { clearTimeout(timer); }
  }
  get<T = unknown>(path: string) { return this.request<T>("GET", path); }
  post<T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) { return this.request<T>("POST", path, body, headers); }
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
    else if (item && typeof item === "object") Object.values(item).forEach(visit);
  };
  visit(value); return [...urls];
}

export async function downloadUrls(urls: string[], outputDir: string): Promise<string[]> {
  await mkdir(outputDir, { recursive: true });
  const paths: string[] = [];
  for (const [index, url] of urls.entries()) {
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new CliError(`Download failed: HTTP ${response.status}`, ExitCode.Service);
    const pathname = new URL(url).pathname;
    const filename = basename(pathname) || `output-${index + 1}`;
    const path = resolve(outputDir, filename);
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(path)); paths.push(path);
  }
  return paths;
}
