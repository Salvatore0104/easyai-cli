import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../skill');
const lockPath = join(root, 'wowidea', 'resources.json');
async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(p));
    else if (p !== lockPath) files.push(p);
  }
  return files.sort();
}
const files = await walk(root), hashes = {};
for (const path of files) {
  const bytes = await readFile(path);
  const canonical = /\.(md|json|yaml|yml|txt|mjs|ts|py|sh)$/i.test(path) ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8') : bytes;
  hashes[relative(root, path).split(sep).join('/')] = createHash('sha256').update(canonical).digest('hex');
  if (path.endsWith('.md')) {
    for (const match of bytes.toString('utf8').matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
      const url = match[1];
      if (/^(https?:|#)/i.test(url)) continue;
      const target = resolve(dirname(path), decodeURIComponent(url.split('#')[0]));
      if (!target.startsWith(root + sep)) throw new Error(`Reference escapes Skill: ${path}: ${url}`);
      if (target === lockPath && process.argv.includes('--update')) continue;
      if (!(await stat(target).catch(() => null))?.isFile()) throw new Error(`Missing reference: ${path}: ${url}`);
    }
  }
}
const sources = JSON.parse(await readFile(join(root, 'wowidea/references/upstream-lock.json'), 'utf8'));
for (const source of sources.sources) {
  if (!source.id || !source.url || !source.verifiedAt || !source.strategy || !source.applicableModels || !source.summary) throw new Error(`Incomplete source: ${source.id}`);
  for (const f of source.files || []) if (!/^[a-f0-9]{64}$/.test(f.sha256)) throw new Error(`Missing upstream digest: ${f.path}`);
}
if (process.argv.includes('--update')) {
  await writeFile(lockPath, JSON.stringify({ schemaVersion: 'wowidea.resources/v1', version: '0.3.1', textNormalization: 'UTF-8 with LF line endings; binary files hashed verbatim', files: hashes }, null, 2) + '\n');
} else {
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  if (JSON.stringify(lock.files) !== JSON.stringify(hashes)) throw new Error('Resource inventory changed. Review sources and run npm run resources:lock, then recheck.');
}
// Keep npm pack --silent stdout restricted to the archive filename for both installers.
console.error(JSON.stringify({ valid: true, files: files.length, sources: sources.sources.length }));
