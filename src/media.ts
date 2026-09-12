import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { EasyAiApi, findUrls } from './api.js';
import { CliError, ExitCode, redact } from './errors.js';

export async function uploadMedia(api: EasyAiApi, file: string, root = process.cwd()) {
  const source = resolve(file), bytes = await readFile(source), sha256 = createHash('sha256').update(bytes).digest('hex');
  const dir = join(resolve(root), '.wowidea', 'assets'); await mkdir(dir, { recursive: true });
  const index = join(dir, `${api.scope}-${sha256}.json`);
  const previous = await readFile(index, 'utf8').then(JSON.parse).catch(() => null);
  if (previous && Date.parse(previous.expiresAt) - Date.now() > 60000) return { ...previous, reused: true };
  const result = await api.upload('/v1/files/upload', new Blob([bytes]), basename(source), { fileName: basename(source) });
  const url = findUrls(result)[0]; if (!url) throw new CliError('Upload returned no usable URL.', ExitCode.Service);
  const record = { source, sha256, url, uploadedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() };
  await writeFile(index, JSON.stringify(record, null, 2), { mode: 0o600 }); return record;
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
export async function writeRun(root: string, key: string, value: unknown) {
  const dir = join(resolve(root), '.wowidea', 'runs'); await mkdir(dir, { recursive: true });
  const path = join(dir, createHash('sha256').update(key).digest('hex') + '.json');
  await writeFile(path, JSON.stringify(redact(value), null, 2), { mode: 0o600 }); return path;
}
