import { writeFile, rename, unlink, link } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export async function atomicRename(from: string, to: string) {
  for (let attempt = 0; ; attempt++) {
    try { await rename(from, to); return; }
    catch (error) {
      // Windows briefly denies replacement while another process reads a file.
      if (attempt >= 9 || !['EPERM', 'EACCES', 'EBUSY'].includes((error as NodeJS.ErrnoException).code || '')) throw error;
      await new Promise(done => setTimeout(done, 20 * (attempt + 1)));
    }
  }
}

// Readers see complete records, including when the writer is interrupted.
export async function writeJson(path: string, value: unknown, exclusive = false): Promise<boolean> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
    if (exclusive) {
      try { await link(temporary, path); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false; throw error; }
    } else await atomicRename(temporary, path);
    return true;
  } finally { await unlink(temporary).catch(() => undefined); }
}
