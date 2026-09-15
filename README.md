# Wowidea：Codex 驱动的视觉创作 Agent

通过网站账号生成图片和视频，默认自动等待并下载。安装 Skill 后可直接描述需求；需要固定项目规则时再初始化项目。命令名 `wowidea`，兼容 `easyai` 与 `easyai-canvas`。

## 日常使用

```text
wowidea image generate --prompt "浅蓝背景上的陶瓷杯产品照" --model "Nano Banana 2" --resolution 4K --ratio 3:4
wowidea image edit --prompt "只把背景改成绿色" --reference ./product.png --model "Nano Banana 2"
wowidea video generate --prompt "镜头缓慢靠近陶瓷杯" --model "Wan3.0-Video" --duration 5 --resolution 480p --ratio 16:9 --no-audio
```

默认自动保存请求标识、等待完成并下载。无需初始化项目、手写请求文件或分镜；网站负责平台冗余。直接参数与 `--file` 二选一。中断后使用 `wowidea tasks resume <返回的key> --wait`，明确需要再生成一份时添加 `--allow-reroll`。连接诊断使用 `wowidea doctor`。

## 安装

### 方式一：让 Codex 代你安装

先在网站获取账号 Key：登录 [wowidea.top](https://wowidea.top) → 用户中心 → **API Key**（[wowidea.top/user/api-key](https://wowidea.top/user/api-key)）→ 新建并复制。

将下面的 `sk-你的Key` 替换为刚复制的 Key，再把整段发给 Codex：

> 帮我安装 https://github.com/Salvatore0104/wowidea-cli 的 CLI 和 wowidea Skill。我的账号 API Key 是 sk-你的Key，请直接用它完成认证（wowidea auth use-key），不要走浏览器登录。安装后运行 doctor，验证模型、余额和任务查询，并告诉我怎么在项目里持续使用。

Codex 会构建并安装 CLI 与随包 Skill，接收你在聊天中提供的 Key，通过 `auth use-key --key-stdin` 直接保存到系统凭据库，随后运行 `doctor` 验证连接。后续调用自动使用已保存的 Key；换 Key 时直接发给 Codex 更新即可。

### 方式二：自己运行安装脚本

需要 Node.js 20+、npm 和 Git。安装器从源码构建 npm 实包，同时安装 CLI 与随包 Skill；重复执行即为更新，会保留系统凭据和你自定义的 Skill。

macOS：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Salvatore0104/wowidea-cli/master/scripts/install-macos.sh)"
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/Salvatore0104/wowidea-cli/master/scripts/install-windows.ps1 | iex
```

安装后在自己的交互终端输入账号 API Key（隐藏输入，保存到系统凭据库）：

```text
wowidea auth use-key --prompt
wowidea --json auth status
```

手动安装、密钥与安全规则、服务地址、安装内容、更新、卸载、开发验证和退出码见 **[安装与维护](docs/install.md)**。

## 在 Codex 项目中持续调用

第一次在新项目中使用时，把下面这段发给 Codex：

> 请将当前文件夹初始化为 Wowidea 创作项目，将所需的 CLI、Skill 和项目规则保存到当前项目。以后本项目的图片、视频生成、修改和生成任务提交默认使用 Wowidea，无需我重复调用 /wowidea。根据用途、模型能力和网站定价自动选择合适方案，兼顾质量、经济性与效率。用途或测试、成片阶段不明确时先简短询问，我明确指定的模型和规格优先。图片优先高质量，正式输出默认 4K；视频先按需要测试，确定方向后再出高清成片。所有模型自动审查参数后继续；Seedance 可直接生成，分镜和 manifest 仅为可选工具，并固定 watermark:false。每轮默认一个候选，保留原版和修改记录，不自动重复付费生成。

Codex 会执行 `wowidea project setup --dir <项目目录>`：把固定版本的 CLI 写入 `.wowidea/runtime`，把 Wowidea 与 GPT Image 2.5 提示词润色 Skill 写入 `.agents/skills`，并在 `AGENTS.md`（已存在 `AGENTS.override.md` 时用后者）维护一段可重复更新的 Wowidea 规则。重复初始化不会覆盖你的文件、偏好和历史记录。

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
