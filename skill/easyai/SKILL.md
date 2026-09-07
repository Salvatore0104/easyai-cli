---
name: easyai
description: Control EasyAI models, media generation, tasks, and infinite-canvas projects through the agent-friendly easyai CLI. Use for EasyAI account automation or canvas work; do not use it for unrelated local media editing.
---

# EasyAI CLI

用户可以直接用自然语言说“使用 EasyAI CLI 查看模型/余额/画布”或显式写 `$easyai`。将意图翻译成 CLI 命令；先做只读发现，再执行用户明确要求的单个写操作。不要要求用户记忆内部 HTTP 路径。

Use the `easyai` CLI instead of constructing private EasyAI HTTP requests. Start with discovery and precise reads, then perform only the mutation the user requested.

Use `--json` for structured results, `--jsonl` for event streams, and `--output <file>` for large responses. Keep API keys, tokens, signed URLs, and Authorization headers out of messages, logs, manifests, and shell history. Prefer `easyai auth use-key --key-stdin` or environment injection over a literal key argument.

Before canvas changes, read the exact project state. Canvas mutations use optimistic locking and idempotency; on exit code 4, refresh state and present the conflict rather than overwriting or replaying automatically. Read [references/commands.md](references/commands.md) when selecting canvas or generation commands.

Images may be submitted directly when authorized. Video and billable canvas execution require a preflight quote. In non-interactive runs, require `--yes --max-cost` and a server quote with a known estimate. Never retry a generation submission or create a comparison task automatically.

Both image and video generation are asynchronous. Every submission uses one `Idempotency-Key`; after timeout or connection failure, the CLI looks up `/v1/tasks?idempotencyKey=...` and accepts array, `items`, `data`, or nested task-list responses. If no task is found, report `uncertain` and stop. Never submit again.

For any Seedance request, read and follow [references/seedance.md](references/seedance.md) before preparing or submitting work. Storyboard approval is always separate from paid generation approval.
