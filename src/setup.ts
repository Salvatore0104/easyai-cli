import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { initProject } from './project.js';
import { CliError, ExitCode } from './errors.js';

const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const exists = (path: string) => access(path).then(() => true, () => false);
export async function setupProject(directory: string, update = false, packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  if (Number(process.versions.node.split('.')[0]) < 20) throw new CliError('Node.js 20+ is required.', ExitCode.Usage);
  const root = resolve(directory), statePath = join(root, '.wowidea', 'install.json');
  const previous = await readFile(statePath, 'utf8').then(JSON.parse).catch(() => null);
  const pkg = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const hashes: Record<string,string> = { ...previous?.hashes }, preserved: string[] = [];
  await mkdir(root, { recursive: true });
  if (!previous || update) {
    const copy = async (source: string, relative: string): Promise<void> => {
      await mkdir(join(root, relative), { recursive: true });
      for (const e of await readdir(source, { withFileTypes: true })) {
        if (e.isSymbolicLink()) throw new CliError('Package symlinks are not supported.', ExitCode.Usage);
        const rel = relative + '/' + e.name, from = join(source, e.name), to = join(root, rel);
        if (e.isDirectory()) { await copy(from, rel); continue; }
        const incoming = await readFile(from), current = await readFile(to).catch(() => null);
        if (current && hash(current) !== hash(incoming) && hash(current) !== previous?.hashes?.[rel]) { preserved.push(rel); continue; }
        await writeFile(to, incoming); hashes[rel] = hash(incoming);
      }
    };
    await copy(join(packageRoot, 'dist'), '.wowidea/runtime/dist');
    await copy(join(packageRoot, 'skill'), '.wowidea/runtime/skill');
    await copy(join(packageRoot, 'skill', 'wowidea'), '.agents/skills/wowidea');
    const runtimePackage = join(root, '.wowidea/runtime/package.json');
    await writeFile(runtimePackage, JSON.stringify({ name: pkg.name, version: pkg.version, type: 'module' }, null, 2));
  }
  if (!await exists(join(root, '.wowidea/project.json'))) await initProject(root);
  const instructionName = await exists(join(root, 'AGENTS.override.md')) ? 'AGENTS.override.md' : 'AGENTS.md';
  const instructions = join(root, instructionName), old = await readFile(instructions, 'utf8').catch(() => '');
  const begin = '<!-- wowidea:begin -->', end = '<!-- wowidea:end -->';
  const block = `${begin}\n## Wowidea media workflow\nFor this project's image/video creation, editing and generation submission, read .agents/skills/wowidea/SKILL.md and use the project CLI: node .wowidea/runtime/dist/cli.js (resolve these paths from this project root). Do not require the user to invoke /wowidea again. Preserve explicit model/settings. Ask purpose/stage only when unclear. Images prioritize quality, final default 4K; videos use an appropriate economical preview before user-requested final delivery. No storyboard or points approval gate. One candidate by default, no automatic paid rerolls. Read prior .wowidea/runs records when editing. Keep credentials outside this project. This does not authorize Git commits, publishing or administration.\n${end}`;
  if (old.includes(begin) !== old.includes(end)) throw new CliError('Incomplete Wowidea instruction markers; preserve and repair the existing file first.', ExitCode.Conflict);
  const next = old.includes(begin) ? old.slice(0, old.indexOf(begin)) + block + old.slice(old.indexOf(end) + end.length) : old + (old.endsWith('\n') || !old ? '' : '\n') + '\n' + block + '\n';
  await writeFile(instructions, next);
  const version = previous && !update ? previous.version : pkg.version;
  await writeFile(statePath, JSON.stringify({ version, hashes, preserved, installedAt: previous?.installedAt || new Date().toISOString(), updatedAt: new Date().toISOString() }, null, 2));
  return { root, version, instructions, skill: join(root, '.agents/skills/wowidea/SKILL.md'), command: `node "${join(root, '.wowidea/runtime/dist/cli.js')}"`, preserved, next: 'Read the project instructions now. Missing authentication: use auth use-key --prompt or EASYAI_API_KEY; never store a key in this project.' };
}
