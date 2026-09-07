# EasyAI CLI

Agent-friendly CLI for EasyAI image/video generation and infinite-canvas workflows. It exposes both `easyai` and the compatibility alias `easyai-canvas`.

## Install in Codex

In a Codex terminal, run:

```bash
npm install -g @easyai/cli
easyai auth login
```

Then ask Codex to use the bundled `skill/easyai` instructions, or install the skill into your Codex skills directory:

```bash
mkdir -p "$HOME/.codex/skills/easyai"
cp -R "$(npm root -g)/@easyai/cli/skill/easyai/." "$HOME/.codex/skills/easyai/"
```

Windows PowerShell:

```powershell
npm install -g @easyai/cli
easyai auth login
$skill = Join-Path (npm root -g) "@easyai/cli/skill/easyai"
Copy-Item $skill "$HOME\.codex\skills\easyai" -Recurse -Force
```

The browser login uses PKCE and stores credentials in the OS credential manager when `keytar` is available. CI can use `EASYAI_API_KEY` or `easyai auth use-key --key-stdin`.

## macOS one-command install

Run this from a Codex terminal on macOS. It requires Node.js 20+ and git, clones the repository, builds locally, and registers both CLI aliases globally:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Salvatore0104/easyai-cli/master/scripts/install-macos.sh)"
```

Then authenticate:

```bash
easyai auth login
```

To install a different fork or branch, set `EASYAI_CLI_REPO` and `EASYAI_CLI_REF` before running the same command. This path intentionally builds on the user's Mac instead of downloading a platform-specific binary.

## Safety model

Use `--json` for stable machine output and `--output` for large responses. Canvas writes use `baseVersion` and idempotency keys; conflicts are never overwritten automatically. Video and billable canvas execution require a preflight quote. Seedance requires storyboard approval, exact reference counts, `watermark: false`, and one-task-only submission with no automatic retry.

The server-side preflight and CLI PKCE endpoints are specified in `openapi/easyai-cli-overlay.yaml`; they must be merged into the EasyAI backend before online preflight/login acceptance.

## Development

```bash
npm install
npm run check
npm run pack:check
npm run package:host
```

See `docs/easyai-cli-application-spec.md` for the complete command and API specification.
