---
name: canvas-agent-operator
description: Operate an EasyAI infinite canvas through the easyai-canvas CLI in either an embedded EasyAI Desktop Canvas session or a standalone online Canvas. Use to list, create, select, or enter projects, and to add, read, update, move, connect, disconnect, remove, group, or execute canvas nodes.
---

# Canvas Agent Operator

Use `easyai-canvas` through the available terminal tool. The terminal working directory is not a Canvas project and must never be used to infer one.

Use only the CLI and its HTTP/WebSocket protocol for Canvas control. Never use Computer Use, browser automation, or manual website interaction to create, modify, connect, execute, or inspect Canvas state. An authentication or API failure must remain a CLI diagnostic and recovery task; it never authorizes a UI fallback. `project open` may navigate to a project for the user, but the Agent must not operate that page.

In Codex, show a Wowidea-bound Canvas with `wowidea project canvas open --dir PROJECT_DIR`, then send its `canvasUrl` to the Codex browser panel with right-side placement. Do not run `easyai-canvas project open` in that flow because it launches an external browser. The user may interact with the embedded panel directly; Agent operations remain CLI-only.

## Select the runtime mode

- **Desktop embedded Canvas:** injected context identifies a Desktop Canvas page. The CLI, current page, API BaseURL, and delegated login are already provided. Never install the CLI, run `auth login`, request credentials, or inspect/expose broker environment values. A project is implicitly bound only after the user has entered one.
- **Standalone online Canvas:** no Desktop Canvas context or broker is present. Use the installed CLI's standalone profile and scoped OAuth session. If authentication state is unknown, run `easyai-canvas auth status --offline` once. If login is required, the user must identify the API BaseURL; then use browser or device authorization from `references/authentication-and-installation.md`. Never ask for or print tokens.

Do not mix the modes. A browser tab that happens to show Canvas does not create a Desktop project binding; standalone project-scoped commands keep an explicit `PROJECT`.

## Project selection page

When the injected Desktop context says the current page is the project selection page, use these commands directly:

```powershell
easyai-canvas project list
easyai-canvas project open PROJECT
easyai-canvas project create --name "新画布"
```

Use `project list` only to resolve an existing project requested by name. `project open` enters a known project in Desktop. `project create` automatically opens the new project through the Desktop broker; use `--no-open` only when the user explicitly wants creation without navigation. Do not run project-level node or graph commands until a project is open.

## Standalone online project selection

Keep the project ID explicit. `project open` first verifies API access, discovers the online Canvas entry from the server, and opens the independent browser page. `project create` preserves non-navigation behavior unless `--open` is explicit.

```powershell
easyai-canvas project list
easyai-canvas project open PROJECT
easyai-canvas project create --name "新画布" --open
easyai-canvas state PROJECT
```

Use `--canvas-entry-url https://host.example/ai/canvas` only when a deployment has a separate frontend that the server does not advertise correctly. Opening a URL is navigation evidence, not visual acceptance. Report that rendered UI inspection is outside this CLI-only workflow.

## Fast path

Inside a concrete Desktop project, or after standalone authentication and project resolution are known, run the requested command immediately. For ordinary operations, do not run `--help`, `--version`, repeated `status`, `project list`, `state`, `node-types list`, or `node-types describe` first.

```powershell
easyai-canvas node add --preset image-generation
easyai-canvas node add --preset image-generation --set '/prompt="产品海报"'
easyai-canvas node get NODE
easyai-canvas node update NODE --set '/prompt="新的提示词"'
easyai-canvas node move NODE --position 1200,320
easyai-canvas node remove NODE
```

The project argument is optional only when Desktop has bound the current Canvas project. Keep an explicit `PROJECT` on every standalone project-scoped command, even after `project open`.

## Create and connect in one mutation

Use repeated `--bind SLOT=SOURCE_NODE[:SOURCE_PORT]`. The default source port is `out`; occurrence order is preserved within each slot.

```powershell
easyai-canvas node add --preset video-generation --bind first_frame=IMAGE_NODE
easyai-canvas node add --preset image-generation --bind ref_images=IMAGE_NODE:out --set '/prompt="参考产品图"'
```

Use explicit slot names. Do not guess whether an upstream image means `first_frame`, `last_frame`, or `ref_images`.

## Common commands

```powershell
easyai-canvas node bind NODE --slot SLOT --source SOURCE_NODE
easyai-canvas node unbind NODE --slot SLOT --source SOURCE_NODE --disconnect
easyai-canvas edge add --source SOURCE_NODE --target TARGET_NODE
easyai-canvas group create --members NODE1,NODE2 --label "分镜"
easyai-canvas group ungroup GROUP
easyai-canvas run node NODE
easyai-canvas run canvas
```

- Prefer `--preset` for built-in nodes; use canonical `--kind` for dynamically discovered plugin nodes.
- The complete built-in routing catalog is:
  - `text-generation` → `media.text`: scripts, copy, and text generation. For user-authored/manual text, write `textOutputHtml`, `textIntroStep: "compose"`, `mode/source/pathCommitted: "manual"`; never put the manual body only in `prompt`. For model-generated text, write `llmDraftPrompt` (or compatible `prompt`) with `mode/source: "llm"`.
  - `image-generation` → `media.image`; `video-generation` → `media.video`; `audio-generation` → `media.audio`.
  - `agent` → `media.agent`; `ai-app` → `media.app`; `structured-output` → `media.structured-output`.
  - `storyboard-script` → `media.storyboard`; connect text/JSON upstream and configure duration, shot count, style, language, aspect ratio, model, and subtitles.
  - `storyboard-image-preview` → `media.storyboard-preview`; `storyboard-video-preview` → `media.storyboard-video-preview`; `storyboard-compose` → `media.storyboard-compose`.
  - `director-3d` → `media.director-3d`; `file` → `media.file`.
  - `canvas.asset-library` is managed only through `asset` and `portrait-asset`; never create it with `node add`.
- Before the first write involving a non-media generation preset, call `node-types describe KIND` once and follow its current writable paths, options, ports, and reference protocol. Use `node-types list --compact` for plugin or unfamiliar node discovery.
- A request for a storyboard script means `media.storyboard`, not a generic `media.text` generation node. Use `media.storyboard-preview` only to generate storyboard images, `media.storyboard-video-preview` for storyboard videos, and `media.storyboard-compose` for grid composition.
- Use either `--preset` or `--kind`, never both.
- Combine `--file`, `--stdin`, repeated `--set`, `--position`, and `--bind` when needed.
- Treat the normalized node/edge data and `flowVersion` in a successful mutation receipt as final success evidence. Do not follow a successful write with `node get` or `state` merely to verify it.
- Use `node-types describe KIND` only after an unknown node kind or schema error. Use `node options NODE --field /path` only for a server-declared dynamic option.
- Let the CLI perform its bounded `409` retry. If it reports a touched target changed, stop and resolve intent; never force overwrite.
- Preserve JSON/NDJSON stdout and the process exit code. Never construct access tokens or a full executable graph.

## Progressive references

- Read `references/assets-and-portraits.md` only for ordinary assets, global asset tokens, or Seedance portrait tasks.
- Read `references/authentication-and-installation.md` only for standalone authentication, an external client, Skill export, or CLI installation problems. Do not read it in Desktop Canvas sessions.
- Read `references/graphs-and-templates.md` only for complex bindings, groups, complete graph edits, or templates.
- Read `references/execution-and-conflicts.md` only for execution, task recovery, collaboration watch, reference-contract failures, or unresolved conflicts.
- Read `references/shell-compatibility.md` only when quoting, paths, stdin, or platform shell behavior is relevant.
