import { execFileSync } from 'node:child_process';
// npm pack --silent must print only the archive name for both installers.
const options = { stdio: ['ignore', 2, 2], windowsHide: true };
execFileSync(process.execPath, ['scripts/check-resources.mjs'], options);
execFileSync(process.execPath, [process.env.npm_execpath, 'run', 'build'], options);
