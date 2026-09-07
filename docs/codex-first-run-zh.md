# Codex 首次使用 EasyAI

## 1. 安装

在 Codex 的终端中执行以下命令。它会从 GitHub 拉取源码，在本机编译，并安装 `easyai` 与 `easyai-canvas`：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Salvatore0104/easyai-cli/master/scripts/install-macos.sh)"
```

Windows PowerShell 使用：

```powershell
git clone https://github.com/Salvatore0104/easyai-cli.git "$env:TEMP\easyai-cli"
Set-Location "$env:TEMP\easyai-cli"
npm install
npm run build
npm install --global .
```

确认安装：

```bash
easyai --version
easyai --help
```

## 2. 注入 API Key

不需要浏览器登录。推荐只在当前终端设置环境变量：

```bash
export EASYAI_API_KEY='你的 API Key'
easyai --json models list
easyai --json balance
```

用完清除：

```bash
unset EASYAI_API_KEY
```

单次调用更安全的方式是 stdin：

```bash
read -s EASYAI_API_KEY
printf '%s' "$EASYAI_API_KEY" | easyai --api-key-stdin --json models list
unset EASYAI_API_KEY
```

不要把真实 Key 写进 Codex 对话、README、GitHub 或普通命令参数。不要让 Codex 输出 Key。

## 3. 首次告诉 Codex 什么

安装 Skill 后，直接用自然语言：

```text
使用 EasyAI CLI 查看我的模型、余额和无限画布项目。只做只读操作，返回 JSON，不要生成图片或视频。
```

如果 Skill 未自动发现，可以明确指定：

```text
请使用仓库中的 skill/easyai Skill，通过 EasyAI CLI 查看我的模型和余额，只读操作。
```

也可以使用显式 Skill 名称：

```text
$easyai 查看我的 EasyAI 画布项目和节点类型，只读操作。
```

## 4. 后续调用模板

查看资源：

```text
使用 EasyAI CLI 读取画布项目 PROJECT_ID 的当前状态，不要修改。
```

修改画布：

```text
使用 EasyAI CLI 在项目 PROJECT_ID 中增加一个 text 节点。先读取当前版本，再用乐观锁写入；如果版本冲突就停止，不要覆盖。
```

视频：

```text
使用 EasyAI CLI 预检这个视频请求，只告诉我模型、时长、分辨率、音频和预计费用，不要提交。
```

得到报价并确认后：

```text
使用刚才的 quote 提交一次视频任务，费用上限是 COST。不要重试、不要创建对比任务，并持续查看这个任务的状态。
```

视频命令必须遵循 `preflight -> 明确费用确认 -> generate -> watch -> download`。图片和视频都是异步任务，网络超时后 CLI 会按幂等键找回任务；找不到时报告 `uncertain`，不会重复提交。

## 5. API Key 生命周期

账号 Key 可以在网站创建，也可以使用：

```bash
easyai api-key list
easyai api-key revoke KEY_ID
```

Key 是账号级自动化权限。测试完成后建议立即撤销临时 Key，并清除环境变量。
