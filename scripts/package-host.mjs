import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

await mkdir("release", { recursive: true });
const platform = process.platform === "win32" ? "win" : process.platform === "darwin" ? "macos" : "linux";
const arch = process.arch === "arm64" ? "arm64" : "x64";
const target = `node18-${platform}-${arch}`;
const output = resolve("release", process.platform === "win32" ? "easyai.exe" : "easyai");
const require = createRequire(import.meta.url);
const executable = join(dirname(require.resolve("@yao-pkg/pkg")), "bin.js");
const child = spawn(process.execPath, [executable, ".", "--target", target, "--output", output], { stdio: "inherit", shell: false });
child.on("exit", code => process.exit(code ?? 1));
