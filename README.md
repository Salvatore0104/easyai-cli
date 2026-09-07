# EasyAI CLI

Agent-friendly CLI for EasyAI image/video generation and infinite-canvas workflows. It exposes both `easyai` and the compatibility alias `easyai-canvas`.

## Install in Codex

In a Codex terminal, run:

```bash
npm install -g @easyai/cli
easyai --help
```

Then ask Codex to use the bundled `skill/easyai` instructions, or install the skill into your Codex skills directory:

```bash
mkdir -p "$HOME/.codex/skills/easyai"
cp -R "$(npm root -g)/@easyai/cli/skill/easyai/." "$HOME/.codex/skills/easyai/"
```

Windows PowerShell:

```powershell
npm install -g @easyai/cli
easyai --help
$skill = Join-Path (npm root -g) "@easyai/cli/skill/easyai"
Copy-Item $skill "$HOME\.codex\skills\easyai" -Recurse -Force
```

The browser login uses PKCE and stores credentials in the OS credential manager when `keytar` is available. CI can use `EASYAI_API_KEY` or `easyai auth use-key --key-stdin`.

### 直接使用 API Key（推荐）

不需要执行 `auth login`。单次调用可从标准输入传入：

```bash
read -s EASYAI_API_KEY
printf '%s' "$EASYAI_API_KEY" | easyai --api-key-stdin --json models list
unset EASYAI_API_KEY
```

连续调用可在当前终端设置环境变量：

```bash
export EASYAI_API_KEY='只在本机输入，不要提交到 GitHub'
easyai --json models list
easyai --json balance
easyai --json canvas project list
unset EASYAI_API_KEY
```

也支持单次显式参数 `--api-key <key>`，但不推荐，因为可能进入 shell 历史。API Key 是账号级权限，请按需创建并可以在网站或 `easyai api-key revoke KEY_ID` 立即撤销。

## macOS one-command install

Run this from a Codex terminal on macOS. It requires Node.js 20+ and git, clones the repository, builds locally, and registers both CLI aliases globally:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Salvatore0104/easyai-cli/master/scripts/install-macos.sh)"
```

然后直接使用 API Key（不需要浏览器登录）：

```bash
read -s EASYAI_API_KEY
printf '%s' "$EASYAI_API_KEY" | easyai --api-key-stdin --json models list
unset EASYAI_API_KEY
```

To install a different fork or branch, set `EASYAI_CLI_REPO` and `EASYAI_CLI_REF` before running the same command. This path intentionally builds on the user's Mac instead of downloading a platform-specific binary.

## Safety model

Use `--json` for stable machine output and `--output` for large responses. Canvas writes use `baseVersion` and idempotency keys; conflicts are never overwritten automatically. Video and billable canvas execution require a preflight quote. Seedance requires storyboard approval, exact reference counts, `watermark: false`, and one-task-only submission with no automatic retry.

The server-side preflight and CLI PKCE endpoints are specified in `openapi/easyai-cli-overlay.yaml`; they must be merged into the EasyAI backend before online preflight/login acceptance.

## 在 Codex 中怎么调用

安装并把 `skill/easyai` 放入 Codex skills 目录后，不需要记住所有参数。直接用自然语言说明目标即可，例如：

```text
使用 EasyAI CLI 列出我的模型和余额，只读操作，返回 JSON。
```

```text
使用 EasyAI CLI 查看我的无限画布项目，读取项目 PROJECT_ID 的当前状态，不要修改。
```

```text
使用 EasyAI CLI 在项目 PROJECT_ID 中增加一个 text 节点。先读取当前版本，再用乐观锁写入；如果版本冲突就停止，不要覆盖。
```

也可以显式要求 Codex 使用 Skill：

```text
$easyai 查看我的 EasyAI 画布项目并汇总节点类型。
```

Codex 实际执行的就是普通 CLI 命令，例如：

```bash
easyai --json models list
easyai --json balance
easyai --json canvas project list
```

图片和视频要分开描述。图片可以在你确认费用后直接提交；视频必须先预检：

```text
使用 EasyAI CLI 预检这个视频请求，先不要提交，告诉我模型、时长、分辨率、音频和预计费用。
```

得到 quote 后，再明确授权：

```text
费用在我的预算内，使用刚才的 quote 提交一次视频任务。不要重试，不要创建对比任务，并持续查看这个任务的状态。
```

非交互自动化必须明确给出 `--yes --max-cost`。网络超时后 CLI 会按幂等键找回已经接受的图片或视频任务；找不到时会报告 `uncertain`，不会再次扣费提交。

这种用法和其他 agent-friendly CLI 一样：自然语言负责表达意图，Codex Skill 负责选择命令，CLI 负责稳定 JSON、认证、幂等和安全边界。不要把私有 HTTP 请求拼接到提示词里。

## Development

```bash
npm install
npm run check
npm run pack:check
npm run package:host
```

See `docs/easyai-cli-application-spec.md` for the complete command and API specification.
