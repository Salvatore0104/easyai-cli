import { readFile, mkdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { EasyAiApi, findUrls } from './api.js';
import { CliError, ExitCode, redact } from './errors.js';
import { writeJson } from './storage.js';

export async function referenceReachable(url: string): Promise<boolean> {
  try {
    let response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    if (response.status === 405 || response.status === 501) response = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(10000) });
    await response.body?.cancel();
    return response.ok;
  } catch { return false; }
}

export function uploadExpiry(value: any, url: string, now = Date.now()): string | null {
  const body = value?.data ?? value;
  const raw = body?.expiresAt ?? body?.expires_at;
  let ms = typeof raw === 'number' ? (raw < 1e12 ? raw * 1000 : raw) : typeof raw === 'string' ? Date.parse(raw) : NaN;
  const seconds = body?.expiresIn ?? body?.expires_in;
  if (!Number.isFinite(ms) && typeof seconds === 'number' && seconds > 0) ms = now + seconds * 1000;
  if (!Number.isFinite(ms)) {
    const query = new URL(url).searchParams;
    const date = query.get('X-Amz-Date'), ttl = Number(query.get('X-Amz-Expires'));
    if (date && /^\d{8}T\d{6}Z$/.test(date) && ttl > 0) ms = Date.parse(date.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z')) + ttl * 1000;
    else if (query.has('Expires')) ms = Number(query.get('Expires')) * 1000;
  }
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export async function uploadMedia(api: EasyAiApi, file: string, root = process.cwd()) {
  const source = resolve(file), bytes = await readFile(source), sha256 = createHash('sha256').update(bytes).digest('hex');
  const dir = join(resolve(root), '.wowidea', 'assets'); await mkdir(dir, { recursive: true });
  const index = join(dir, `${api.scope}-${sha256}.json`);
  const previous = await readFile(index, 'utf8').then(JSON.parse).catch(() => null);
  if (previous && (!previous.expiresAt || Date.parse(previous.expiresAt) - Date.now() > 60000) && await referenceReachable(previous.url)) return { ...previous, reused: true };
  const result = await api.upload('/v1/files/upload', new Blob([bytes]), basename(source), { fileName: basename(source) });
  const url = findUrls(result)[0]; if (!url) throw new CliError('Upload returned no usable URL.', ExitCode.Service);
  if (!/^https:\/\//i.test(url) || !await referenceReachable(url)) throw new CliError('Uploaded reference is not publicly readable over HTTPS; no generation submitted.', ExitCode.Service);
  const record = { source, sha256, url, uploadedAt: new Date().toISOString(), expiresAt: uploadExpiry(result, url) };
  await writeJson(index, record); return record;
}
export async function prepareReferences(api: EasyAiApi, payload: Record<string, any>, root: string) {
  const result = { ...payload };
  if (result.image !== undefined && result.image_urls !== undefined) throw new CliError('Use image or image_urls, not both.', ExitCode.Usage);
  if (result.image !== undefined) { result.image_urls = Array.isArray(result.image) ? result.image : [result.image]; delete result.image; }
  const sources: Record<string,string[]> = {};
  for (const field of ['image_urls','video_urls','audio_urls']) {
    if (result[field] === undefined) continue;
    if (!Array.isArray(result[field]) || result[field].some((v: unknown) => typeof v !== 'string' || !v)) throw new CliError(`${field} must be a string array.`, ExitCode.Usage);
    sources[field] = [...result[field]];
    result[field] = await Promise.all(result[field].map(async (v: string) => /^https:\/\//i.test(v) ? v : /^\w+:\/\//.test(v) ? Promise.reject(new CliError('References require HTTPS or local paths.', ExitCode.Usage)) : (await uploadMedia(api, resolve(root,v), root)).url));
  }
  return { payload: result, sources };
}
export function runFile(root: string, key: string) {
  return join(resolve(root), '.wowidea', 'runs', createHash('sha256').update(key).digest('hex') + '.json');
}
export async function writeRun(root: string, key: string, value: unknown) {
  const dir = join(resolve(root), '.wowidea', 'runs'); await mkdir(dir, { recursive: true });
  const path = runFile(root, key);
  await writeJson(path, redact(value)); return path;
}

export async function refreshRun(path: string | undefined, result: unknown) {
  if (!path) return;
  const prior = JSON.parse(await readFile(path, 'utf8'));
  const { taskStatus, taskId } = await import('./submission.js');
  await writeJson(path, redact({ ...prior, state: taskStatus(result), taskId: taskId(result) || prior.taskId, result, updatedAt: new Date().toISOString() }));
}

export async function referenceIdentity(payload: Record<string, any>, root: string) {
  const identity = { ...payload };
  for (const field of ['image_urls', 'video_urls', 'audio_urls']) {
    if (!Array.isArray(identity[field])) continue;
    identity[field] = await Promise.all(identity[field].map(async (source: string) => {
      if (typeof source !== 'string' || /^\w+:\/\//.test(source)) return source;
      const path = resolve(root, source);
      return { path, sha256: createHash('sha256').update(await readFile(path)).digest('hex') };
    }));
  }
  return identity;
}
