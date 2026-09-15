# Authentication and Installation

Read this reference only for standalone clients or Skill distribution. Desktop Canvas sessions already include the CLI and delegated broker session.

## CLI installation and login

```bash
npm install --global @easyaigc/canvas-cli
easyai-canvas auth login --base-url https://easyai.example.com/api
easyai-canvas auth status
```

Browser authorization is the default. For headless use, select `--method device`. Password login is an explicit fallback and should read the password with `--password-stdin`. Never place credentials in command arguments or logs.

The BaseURL is the Canvas API endpoint, commonly ending in `/api`; do not pass the frontend website URL unless it is also the API endpoint. A standalone login creates a scoped Canvas CLI session and does not reuse or expose a browser or Desktop refresh token.

After login, keep explicit project IDs and open the independent online Canvas when needed:

```bash
easyai-canvas project list
easyai-canvas project open PROJECT
easyai-canvas project create --name "New canvas" --open
```

The CLI discovers the frontend from the server's public client-auth configuration. For deployments with a separate unadvertised frontend, pass `--canvas-entry-url https://host.example/ai/canvas` or configure `EASYAI_CANVAS_ENTRY_URL`. This value is a public page entry, never a token-bearing URL.

In the Wowidea wrapper, non-sensitive profile metadata is stored under the EasyAI user configuration directory with restrictive permissions and atomic updates. Access and refresh tokens are stored only through keytar in the operating-system credential manager. Environment token overrides are process-only and are never persisted; if keytar is unavailable, login fails instead of writing a plaintext token file.

## Skill distribution

```powershell
easyai-canvas skill path
easyai-canvas skill print
easyai-canvas skill install --client codex
easyai-canvas skill install --client easyai --project-root PATH
easyai-canvas skill install --target SKILLS_ROOT
```

`skill path` returns the Skill ID, Skill version, CLI version, absolute source path, and SHA-256. Installing identical content is idempotent. Different content is rejected unless `--force` is explicit; forced replacement is atomic and preserves a backup path in the result.

Skill commands do not acquire Canvas authentication or a Desktop broker session.
