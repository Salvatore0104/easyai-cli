import { defineConfig } from 'tsup';
export default defineConfig({
  noExternal: [/^commander$/, /^@aws-sdk\//, /^@smithy\//],
  external: ['keytar'],
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
});
