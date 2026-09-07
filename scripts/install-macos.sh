#!/usr/bin/env bash
set -euo pipefail

repo="${EASYAI_CLI_REPO:-https://github.com/Salvatore0104/easyai-cli.git}"
ref="${EASYAI_CLI_REF:-master}"
workdir="${TMPDIR:-/tmp}/easyai-cli-install-$$"
trap 'rm -rf "$workdir"' EXIT

command -v node >/dev/null || { echo "Node.js 20+ is required. Install it from https://nodejs.org/" >&2; exit 2; }
node -e 'const [major] = process.versions.node.split(".").map(Number); if (major < 20) process.exit(1)' || { echo "Node.js 20+ is required." >&2; exit 2; }
command -v git >/dev/null || { echo "git is required." >&2; exit 2; }

git clone --depth 1 --branch "$ref" "$repo" "$workdir"
cd "$workdir"
npm install
npm run build
npm install --global .
echo "EasyAI CLI installed. Run: easyai --help"
