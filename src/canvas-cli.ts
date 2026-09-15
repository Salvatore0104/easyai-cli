#!/usr/bin/env node
import { runCli } from "@easyaigc/canvas-cli";
import { canvasBaseUrl, SecureCanvasAuthStore } from "./canvas-auth.js";
import { redact } from "./errors.js";

const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index++) {
  if (argv[index] === "--base-url" && argv[index + 1]?.replace(/\/+$/, "") !== canvasBaseUrl) {
    process.stderr.write(JSON.stringify(redact({ error: `Canvas BaseURL is fixed to ${canvasBaseUrl}.` })) + "\n");
    process.exitCode = 2;
    process.exit();
  }
}
if (!argv.includes("--base-url")) argv.push("--base-url", canvasBaseUrl);

runCli({ argv, store: new SecureCanvasAuthStore() }).then(code => { process.exitCode = code; }).catch(error => {
  process.stderr.write(JSON.stringify(redact({ error: error instanceof Error ? error.message : String(error) })) + "\n");
  process.exitCode = 5;
});
