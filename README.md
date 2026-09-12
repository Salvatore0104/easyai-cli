# Wowidea：Codex 驱动的视觉创作 Agent

在项目里初始化一次，之后在 Codex 中直接描述图片、视频需求即可，无需每次调用 `/wowidea`。命令名 `wowidea`，兼容 `easyai` 与 `easyai-canvas`。

## 安装

需要 Node.js 20+、npm 和 Git。安装器从源码构建 npm 实包，同时安装 CLI 与随包 Skill；重复执行即为更新，会保留系统凭据和你自定义的 Skill。

macOS：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Salvatore0104/easyai-cli/master/scripts/install-macos.sh)"
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/Salvatore0104/easyai-cli/master/scripts/install-windows.ps1 | iex
```

安装后在自己的交互终端输入账号 API Key（隐藏输入，保存到系统凭据库）：

```text
wowidea auth use-key --prompt
wowidea --json auth status
```

手动安装、密钥与安全规则、服务地址、安装内容、更新、卸载、开发验证和退出码见 **[安装与维护](docs/install.md)**。

## 在 Codex 项目中持续调用

第一次在新项目中使用时，把下面这段发给 Codex：

> 请将当前文件夹初始化为 Wowidea 创作项目，将所需的 CLI、Skill 和项目规则保存到当前项目。以后本项目的图片、视频生成、修改和生成任务提交默认使用 Wowidea，无需我重复调用 /wowidea。根据用途、模型能力和网站定价自动选择合适方案，兼顾质量、经济性与效率。用途或测试、成片阶段不明确时先简短询问，我明确指定的模型和规格优先。图片优先高质量，正式输出默认 4K；视频先按需要测试，确定方向后再出高清成片。每轮默认一个候选，保留原版和修改记录，反馈任务状态、费用及余额。取消强制分镜审批和积分确认门槛，不自动重复付费生成。

Codex 会执行 `wowidea project setup --dir <项目目录>`：把固定版本的 CLI 写入 `.wowidea/runtime`，Skill 写入 `.agents/skills/wowidea`，并在 `AGENTS.md`（已存在 `AGENTS.override.md` 时用后者）维护一段可重复更新的 Wowidea 规则。重复初始化不会覆盖你的文件、偏好和历史记录。

之后从该项目启动的任务会自动发现这些规则，直接用自然语言提出需求即可：

```text
为这款咖啡做新品海报，保留包装上的准确文字
把这组产品图做成 5 秒竖版视频，先出 480p 测试
继续查看刚才的视频任务，下载成片
```

也可以显式写 `$wowidea ……` 或“使用 wowidea ……”。无需每次重复安装、重新提供 Key 或指定 Skill 路径；项目内生成默认记录到 `.wowidea/runs`，修改会生成新版本而不覆盖原版。

## 更多文档

- [安装与维护](docs/install.md)：安装/更新、密钥与安全、自检命令、卸载、开发验证、退出码
- [使用与维护](docs/usage.md)：命令、模型提示词指南、评审口径与资源更新
- [项目创作闭环](docs/creative-workflow.md)：项目初始化、自动选模、定价与积分、生成/编辑/版本
- [验证范围](docs/validation.md)：已验证内容、真实站点验收与已知限制
