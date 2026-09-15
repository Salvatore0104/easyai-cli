import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EasyAiApi, downloadUrls } from '../src/api.js';
import { submitImageWithRecovery, recoverSubmission, listSubmissions } from '../src/submission.js';
import { uploadMedia, uploadExpiry } from '../src/media.js';
import { mediaInput } from '../src/media-input.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'wowidea-reliability-')); vi.stubEnv('EASYAI_CONFIG_DIR', dir); });
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await rm(dir, { recursive: true, force: true }); });

describe('submission identity', () => {
  it('atomically accepts only one of simultaneous identical requests with different keys', async () => {
    const api: any = { scope: 'same-account', get: vi.fn().mockResolvedValue({ items: [] }), post: vi.fn().mockResolvedValue({ taskId: 'only' }) };
    const results = await Promise.allSettled(Array.from({ length: 8 }, (_, n) => submitImageWithRecovery(api, { prompt: 'same' }, `key-${n}`)));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(results.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    expect(await listSubmissions(api)).toHaveLength(1);
  });
  it('recovers synchronous output without a network request', async () => {
    const result = { images: [{ url: 'https://cdn.test/result.png?token=private-output' }] };
    const api: any = { scope: 'sync', get: vi.fn().mockResolvedValue({ items: [] }), post: vi.fn().mockResolvedValue(result) };
    await submitImageWithRecovery(api, { prompt: 'same' }, 'sync'); api.get.mockClear();
    expect(await recoverSubmission(api, 'sync')).toEqual(result); expect(api.get).not.toHaveBeenCalled();
  });
});

describe('network and complete downloads', () => {
  it.each(['http://example.test/output', 'https://www.example.test/output', 'https://other.co.uk/output'])('refuses unsafe redirect %s', async location => {
    const mock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location } })); vi.stubGlobal('fetch', mock);
    await expect(new EasyAiApi({ baseUrl: 'https://example.test', token: 'fake', timeoutMs: 1000 }).get('/v1/models')).rejects.toMatchObject({ exitCode: 3 });
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it('retries transient GET errors but stops on authentication errors', async () => {
    const mock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response('{"ok":true}')); vi.stubGlobal('fetch', mock);
    const api = new EasyAiApi({ baseUrl: 'https://example.test', timeoutMs: 1000 });
    expect(await api.get('/v1/models')).toEqual({ ok: true }); expect(mock).toHaveBeenCalledTimes(2);
    mock.mockClear().mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(api.get('/v1/models')).rejects.toMatchObject({ exitCode: 3 }); expect(mock).toHaveBeenCalledTimes(1);
  });
  it('retries a broken stream without leaving a partial final file', async () => {
    const mock = vi.fn().mockImplementationOnce(() => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1, 2])); }, pull(controller) { controller.error(new Error('connection dropped')); } })))
      .mockResolvedValueOnce(new Response('complete', { headers: { 'content-length': '8' } }));
    vi.stubGlobal('fetch', mock);
    const paths = await downloadUrls(['https://cdn.test/a.png'], dir);
    expect(await readFile(paths[0]!, 'utf8')).toBe('complete'); expect(mock).toHaveBeenCalledTimes(2);
    expect((await readdir(dir)).filter(name => name.endsWith('.part'))).toEqual([]);
  });
  it('preserves an existing file if all downloads are incomplete', async () => {
    await writeFile(join(dir, '1-a.png'), 'original');
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response('short', { headers: { 'content-length': '100' } }))));
    await expect(downloadUrls(['https://cdn.test/a.png'], dir)).rejects.toThrow('Incomplete');
    expect(await readFile(join(dir, '1-a.png'), 'utf8')).toBe('original');
    expect(await readdir(dir)).toEqual(['1-a.png']);
  });
});

describe('reference lifecycle and simple inputs', () => {
  it('uses explicit expiry or signed expiry and leaves unknown expiry null', () => {
    expect(uploadExpiry({ expires_in: 60 }, 'https://cdn.test/a', 1000)).toBe(new Date(61000).toISOString());
    expect(uploadExpiry({}, 'https://cdn.test/a?X-Amz-Date=20260914T060000Z&X-Amz-Expires=60')).toBe('2026-09-14T06:01:00.000Z');
    expect(uploadExpiry({}, 'https://cdn.test/a')).toBeNull();
  });
  it('validates unknown-expiry cache and reuploads an inaccessible reference', async () => {
    const file = join(dir, 'source.png'); await writeFile(file, 'reference');
    const api: any = { scope: 'upload', upload: vi.fn().mockResolvedValueOnce({ url: 'https://cdn.test/old.png' }).mockResolvedValueOnce({ url: 'https://cdn.test/new.png', expires_in: 120 }) };
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 200 }))); vi.stubGlobal('fetch', fetcher);
    expect((await uploadMedia(api, file, dir)).expiresAt).toBeNull();
    expect((await uploadMedia(api, file, dir)).reused).toBe(true); expect(api.upload).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValueOnce(new Response(null, { status: 403 }));
    expect((await uploadMedia(api, file, dir)).url).toBe('https://cdn.test/new.png'); expect(api.upload).toHaveBeenCalledTimes(2);
  });
  it('rejects mixed inputs and preserves explicit no-audio and reference order', () => {
    expect(() => mediaInput({ file: 'input.json', prompt: 'conflicting' }, {}, 'image')).toThrow('not both');
    expect(mediaInput({ prompt: 'shot', audio: false, reference: ['b.png', 'a.png'] }, {}, 'video')).toMatchObject({ prompt: 'shot', audio: false, image_urls: ['b.png', 'a.png'], watermark: false });
    expect(() => mediaInput({}, { watermark: true }, 'video')).toThrow('watermark');
  });
});
