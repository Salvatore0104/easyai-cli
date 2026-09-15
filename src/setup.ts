import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
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
  let credentialRuntime = previous?.credentialRuntime || { platform: process.platform, arch: process.arch, available: false };
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
    await copy(join(packageRoot, 'skill', 'gpt-image-25-prompt'), '.agents/skills/gpt-image-25-prompt');
    // Native bindings are not included by the JS bundler. Carry the installed
    // platform's runtime files so a project outside this checkout can use them.
    credentialRuntime = { platform: process.platform, arch: process.arch, available: false };
    let keytarRoot: string | undefined;
    try {
      const require = createRequire(join(packageRoot, 'package.json'));
      require('keytar'); // Load the native binding without accessing stored credentials.
      keytarRoot = dirname(require.resolve('keytar/package.json'));
    } catch { /* env/stdin auth remains available */ }
    if (keytarRoot && await exists(join(keytarRoot, 'build/Release/keytar.node'))) {
      await copy(join(keytarRoot, 'lib'), '.wowidea/runtime/node_modules/keytar/lib');
      await copy(join(keytarRoot, 'build/Release'), '.wowidea/runtime/node_modules/keytar/build/Release');
      for (const name of ['package.json', 'LICENSE']) if (await exists(join(keytarRoot, name))) await writeFile(join(root, '.wowidea/runtime/node_modules/keytar', name), await readFile(join(keytarRoot, name)));
      credentialRuntime.available = true;
    }
    const runtimePackage = join(root, '.wowidea/runtime/package.json');
    await writeFile(runtimePackage, JSON.stringify({ name: pkg.name, version: pkg.version, type: 'module', credentialRuntime }, null, 2));
  }
  if (!await exists(join(root, '.wowidea/project.json'))) await initProject(root);
  const instructionName = await exists(join(root, 'AGENTS.override.md')) ? 'AGENTS.override.md' : 'AGENTS.md';
  const instructions = join(root, instructionName), old = await readFile(instructions, 'utf8').catch(() => '');
  const begin = '<!-- wowidea:begin -->', end = '<!-- wowidea:end -->';
  const block = `${begin}\n## Wowidea media workflow\nFor image/video generation and editing, read .agents/skills/wowidea/SKILL.md and use node .wowidea/runtime/dist/cli.js from this project. Preserve the user's model and settings; use website capabilities. Generate, wait and download in one command; request keys and records are automatic. The website handles provider failover. Storyboards and manifests are optional, including Seedance; keep watermark:false and never automatically reroll. Respect any additional constraints explicitly set by the user. Keep credentials outside project files. No Git commit, publication or website administration is implied.\n${end}`;
  if (old.includes(begin) !== old.includes(end)) throw new CliError('Incomplete Wowidea instruction markers; preserve and repair the existing file first.', ExitCode.Conflict);
  const next = old.includes(begin) ? old.slice(0, old.indexOf(begin)) + block + old.slice(old.indexOf(end) + end.length) : old + (old.endsWith('\n') || !old ? '' : '\n') + '\n' + block + '\n';
  await writeFile(instructions, next);
  const version = previous && !update ? previous.version : pkg.version;
  await writeFile(statePath, JSON.stringify({ version, hashes, preserved, credentialRuntime, installedAt: previous?.installedAt || new Date().toISOString(), updatedAt: new Date().toISOString() }, null, 2));
  return { root, version, instructions, skill: join(root, '.agents/skills/wowidea/SKILL.md'), promptSkill: join(root, '.agents/skills/gpt-image-25-prompt/SKILL.md'), command: `node "${join(root, '.wowidea/runtime/dist/cli.js')}"`, credentialRuntime, preserved, next: 'Read the project instructions now. Run doctor to check the website. Use auth use-key --prompt when credentialRuntime.available, or EASYAI_API_KEY/--api-key-stdin; never store a key in this project. Re-run setup --update after moving to another OS/architecture.' };
}
