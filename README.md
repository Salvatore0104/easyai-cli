> 帮我安装 https://github.com/Salvatore0104/easyai-cli 的 CLI 和 wowidea Skill。使用账号 API Key，不走浏览器登录；需要密钥时提供本机输入方式。默认图片用 Nano Banana 2，视频用 Seedance 2.0。安装后验证模型、余额和任务查询，并告诉我如何使用 `$wowidea`。

# Wowidea：Codex 驱动的专业视觉 Agent

复制上面的提示词给 Codex 即可开始。版本 0.3.2；命令名 `wowidea`，兼容 `easyai` 和 `easyai-canvas`。无需 GitHub 打包或额外模型服务 Key；安装器从源码构建 npm 实体包，同时安装主 Skill 和模型参考指南。

面向海报、品牌、产品、电商、插画、空间概念、视频及舞台等视觉设计。Codex 按交付用途选择创作方法、参考策略和评审标准；CLI 负责执行、恢复与交付。舞台是按需加载的专门分支，审美和流程随任务调整。

```text
$wowidea 为这款咖啡做新品海报，保留包装上的准确文字
$wowidea 把这张角色插画改成水彩质感，保留人物身份
$wowidea 用 H3 做全能参考提示词：图1提供主体，视频1只提供运动
$wowidea 为演出开场设计 VJ 视觉，先给分镜
```

持续项目可在指定目录保存 `.wowidea/project.json`；单次设计无需建档，试验稿不会自动覆盖已认可风格。通用入口按用途分流，六类VJ方法仅用于舞台分支。海报看文案层级，产品图看商品保真，插画看造型和情绪，视频看声画与连续性；实际输出必须看过再评价。

```text
wowidea --json project init --dir <节目目录> --name <节目名>
wowidea --json project show --dir <节目目录>
wowidea --json project validate --dir <节目目录>
wowidea --json project record --dir <节目目录> --file <创作记录.json>
wowidea --json guides list
wowidea --json guides show minimax-h3
```

以上命令可离线运行，无需账号 Key。`models route` 保留旧 guide 字段并新增 guideInfo（含实际包内路径与版本）。[节目与资源使用说明](docs/visual-agent-v1.md)包含记录格式、模型边界和更新方法；[离线节目示例](docs/examples/vj-programme/project.json)可复制到节目目录的 `.wowidea/project.json`。

## 安装 / 更新

需要 Node.js 20+、npm 和 Git。重复执行就是更新，保留系统凭据与用户修改的 Skill；待合并的新文件存于配置目录 skill-updates，安装结果会列出路径。不要使用 `npm install -g .` 从临时目录安装，会留下失效链接。

macOS：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Salvatore0104/easyai-cli/master/scripts/install-macos.sh)"
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/Salvatore0104/easyai-cli/master/scripts/install-windows.ps1 | iex
```

Codex 也可以克隆仓库后查看并运行对应安装脚本。npm 全局目录需当前用户可写；不要为了安装默认使用 sudo。Skill 默认安装到 CODEX_HOME/skills（未配置时为 ~/.codex/skills），可通过 WOWIDEA_SKILLS_DIR 指定位置。避免在 .agents/skills 和 .codex/skills 同时安装同名副本。

在自己的交互终端输入密钥：

```text
wowidea auth use-key --prompt
wowidea --json auth status
wowidea --json models route --kind image
wowidea --json balance
wowidea --json tasks list
```

--prompt 隐藏输入并保存系统凭据库。不要把 API Key 发进聊天、写进命令参数、Skill、记忆或 GitHub。无人值守可安全注入 EASYAI_API_KEY 或 --api-key-stdin。凭据库不可用时会报错，不回退明文配置。API Key 是账号级自动化权限，可在网站立即撤销；不会要求浏览器登录。

## 以后如何调用

安装后下一轮对话输入：

```text
$wowidea 帮我生成一张咖啡店开业海报
$wowidea 用 MiniMax 制作产品视频
$wowidea 继续查看刚才的视频任务
```

也可以说“使用 wowidea……”。`/wowidea ……` 会作为文本创作意图识别，不承诺出现在 Codex 原生斜杠菜单。无需每次重复安装、提供 Key 或指定 Skill 文件路径。

图片默认 Nano Banana 2；明确主题和必要文案后直接制作。单张海报优先 3:4、2K（以平台支持为准）。视频默认 Seedance 2.0；用户指定模型优先，模型不可用明确提示，不擅自替换。

内置 Nano Banana 2/Pro/2 Lite、GPT Image 2、MiniMax H3/H3-Max、Google Omni、Wan3.0/Prime、Seedance 2.0/fast/2.5 指南；本次实时目录还发现 2.0-mini，一并支持。运行时以当前账号模型目录为准，Google Omni 不推定上游型号，2.5 不继承 2.0 的参数限制。

## 异步任务与费用控制

图片和视频都按“准备 → 提交一次 → 保存 ID → 轮询 → 下载”处理。`image generate` 和 `video generate` 默认等待完成并下载到 `--dir`（默认 `wowidea-output`），JSON 返回可直接展示的绝对 `paths`；只有明确需要后台提交时才使用 `--no-wait`。提交前保存幂等键、请求 hash 和任务快照；断网、超时或重启只恢复查询。旧服务器不返回幂等键时，仅在快照中恰好出现一个时间和媒体类型匹配的新任务才恢复，绝不取列表第一项或再次 POST。相同 payload 即使换新键也会被阻止；只有用户明确要求另一版时才能使用 `--allow-reroll`。

```text
wowidea --json models route --kind video --model MiniMax
wowidea --json image generate --file request.json --idempotency-key <UUID>
wowidea --json video generate --file minimax-request.json --idempotency-key <UUID>
wowidea --json tasks list
wowidea --json tasks resume <幂等键>
wowidea --json video watch <taskId>
wowidea --json video download <taskId> --dir <绝对目录>
```

watch 最长 30 分钟；超时或中断后再次查询同一 ID。下载仅读取结果媒体。大 JSON 使用全局 --output 导出。

费用监控**只针对 Seedance 视频：预计 ≤200 积分不追加费用确认，>200 积分才确认费用**。恰好 200 不做费用确认。图片、MiniMax、Google Omni、Wan 等其他生成直接提交，不要求预检报价、--yes 或 --max-cost；普通画布任务也不设置费用确认门槛。异步轮询、下载和实际积分报告照常进行。只有用户另行明确设置预算时才使用费用上限参数。

批准生成前始终展示最终镜头、模式、完整计费设置、素材角色／数量、尾帧选择与 watermark:false；200 积分阈值不会免除设置展示。所有 Seedance 都必须先展示经过实际看图与主观审美检查的分镜，由用户明确批准。参考模式下每个分镜镜头必须绑定实际 reference role；分镜图不会自动充当视频输入。批准后仍保持 `watermark:false`：预计 ≤200 不再问费用，>200 再确认模型、时长、比例、分辨率、声音、参考数量和费用。素材、分镜或设置变化会使批准失效。

生成完成后输出“本次实际使用 X 积分”。JSON 的 pointsUsage 包含 actualPoints、status、source；status/watch/download/resume/finalize 都报告。实际积分只读取任务结算字段，未返回则显示“平台未返回本任务实际使用积分”，不把估算、token 数或账户余额差当实扣。

[Seedance 操作规范](skill/wowidea/references/seedance-gate.md)包含私有 MinIO、manifest、预检、下载及 QC。未知报价不能提交；报价后端未部署时只完成创作准备并报告阻塞。包含 Seedance 的画布执行目前阻止直提，需走 video generate --manifest。

## 安装保存了什么

系统凭据库保存账号 API Key；~/.config/easyai（或 EASYAI_CONFIG_DIR）保存非秘密默认模型、安装版本、任务索引与报价 hash。任务索引按服务器及凭据分区，换 Key 后可用已知 taskId 查询；不会把旧 Key 的任务错误关联到新账号。
本地 Seedance manifest/请求文件可能包含临时签名 URL，属于私密执行材料，不应提交版本库。日志输出会脱敏。

Skill 来源与许可证见 [来源记录](skill/wowidea/references/sources.md)。社区 Seedance 创作指南固定提交并保留 MIT；MiniMax H3 已依据官方 h3-prompt-writing 结构更新，适配文档不伪称官方原包；Seedance 2.5 官方 sd25-pe 分发端点本次未能取得，采用可核验的官方文档原创总结。生成中不临时下载任何上游代码。

## 开发与验证

```bash
npm ci
npm run check
npm pack --dry-run
```

[0.3.2 通用设计分流](docs/wowidea-release-0.3.2.md)、[0.3.1 创作配方与轮次](docs/wowidea-release-0.3.1.md)、[0.3.0 专业视觉 Agent](docs/wowidea-release-0.3.0.md)、[0.2.4 分镜审美与来源绑定](docs/wowidea-release-0.2.4.md)、[0.2.3 异步结果恢复修复](docs/wowidea-release-0.2.3.md)及[0.2.2 Seedance 费用门槛](docs/wowidea-release-0.2.2.md)区分实测、模拟测试和未验证项。本次已完成GPT Image 2及H3文本／单图全能参考付费冒烟，详见[真实实测记录](docs/live-smoke-20260908.md)；不能扩大为所有模型和模式已验收。

退出码：0 成功，2 参数错误，3 认证失败，4 版本/幂等冲突，5 服务错误或结果不确定，6 缺少审批，7 超费用上限。

## 卸载

`npm uninstall -g @easyai/cli` 删除三个 CLI 命令。需要移除 Skill 时，让 Codex 只删除实际安装目录中的 wowidea/easyai 两个目录；先保留自定义修改。凭据和任务索引默认不删除。撤销账号 Key 是独立操作，需用户明确要求。
