# Shell Compatibility

Read this reference only when quoting, file paths, stdin, or shell behavior matters.

## PowerShell

Use single quotes around `--set` expressions so JSON strings retain double quotes:

```powershell
easyai-canvas node update NODE --set '/prompt="产品海报"'
Get-Content -Raw config.json | easyai-canvas node configure NODE --stdin
```

Use normal Windows paths with `--file`; do not translate them to Unix paths.

## Bash and zsh

```bash
easyai-canvas node update NODE --set '/prompt="Product poster"'
easyai-canvas node configure NODE --stdin < config.json
```

Use `--file` or `--stdin` for structured objects instead of building JSON with shell interpolation. Keep secrets out of command lines and environment dumps.

## Output

Ordinary commands emit one JSON document. `watch`, authorization progress, and `run --wait` emit NDJSON. Parse stdout as data and keep stderr separate. Preserve exit codes: `0` success, `1` input/auth/request failure, `2` remote task failure, `3` cancellation or timeout.
