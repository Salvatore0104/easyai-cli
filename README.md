> 帮我安装 https://github.com/Salvatore0104/easyai-cli 的 CLI 和 wowidea Skill。使用账号 API Key，不走浏览器登录；需要密钥时提供本机输入方式。默认图片用 Nano Banana 2，视频用 Seedance 2.0。安装后验证模型、余额和任务查询，并告诉我如何使用 `$wowidea`。

# Wowidea：Codex 驱动的专业视觉 Agent

复制上面的提示词给 Codex 即可开始。版本 0.5.0；命令名 `wowidea`，兼容 `easyai` 和 `easyai-canvas`。无需 GitHub 打包或额外模型服务 Key；安装器从源码构建 npm 实体包，同时安装主 Skill 和模型参考指南。

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

以上命令可离线运行，无需账号 Key。`models route` 保留旧 guide 字段并新增 guideInfo（含实际包内路径与版本）。[项目与资源使用说明](docs/usage.md)包含记录格式、模型边界和更新方法；[离线节目示例](docs/examples/vj-programme/project.json)可复制到节目目录的 `.wowidea/project.json`。

## 模型提示词指南

模型提示词方法随包安装为 `$wowidea` 的内部参考，由单一入口按任务选择；指令为英文，交流和准确文案仍保留用户语言：

| 模型 | 随包指南 |
| --- | --- |
| MiniMax H3 / H3-Max | `references/minimax-h3.md` |
| Seedance 2.0 系列 | `references/seedance-20.md` |
| Seedance 2.5 | `references/seedance-25.md` |
| GPT Image 2 / 2.5 系列 | `references/gpt-image.md` |
| Nano Banana 系列 | `references/nano-banana.md` |
| Midjourney v8.2 / 8.2-fast | `references/midjourney.md` |

只写提示词不会调用付费生成。可用 `wowidea --json guides list` 查看随包资源，用 `wowidea --json guides show <id>` 读取具体指南。更新后新对话可发现入口，不覆盖本机原有同类Skill。

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
wowidea --json models list --type image
wowidea --json balance
wowidea --json tasks list
wowidea --json tasks remote --page 1 --page-size 20
```

`tasks list`是本机提交记录（恢复和防重复用），`tasks remote`才是当前账号在服务器上的任务列表，可按页翻查。`models list --type image`只列出真正能产出图片的模型；平台会忽略 `?type=`，所以过滤在本地完成。若要用平台原始类型（例如 `image_analysis`）精确匹配，直接传入该类型即可。

--prompt 隐藏输入并保存系统凭据库。不要把 API Key 发进聊天、写进命令参数、Skill、记忆或 GitHub。无人值守可安全注入 EASYAI_API_KEY 或 --api-key-stdin。凭据库不可用时会报错，不回退明文配置。API Key 是账号级自动化权限，可在网站立即撤销；不会要求浏览器登录。

默认服务地址是 `https://wowidea.top`。旧的 `ai.wowidea.top` 会 301 跳到该地址，普通 HTTP 客户端在跨站跳转时会丢掉 `Authorization` 头并表现为 401；CLI 已改为手动跟随跳转并保留凭据，但仍建议使用默认地址或显式 `--base-url https://wowidea.top`。

## 以后如何调用

安装后下一轮对话输入：

```text
$wowidea 帮我生成一张咖啡店开业海报
$wowidea 用 MiniMax 制作产品视频
$wowidea 继续查看刚才的视频任务
```

也可以说“使用 wowidea……”。`/wowidea ……` 会作为文本创作意图识别，不承诺出现在 Codex 原生斜杠菜单。无需每次重复安装、提供 Key 或指定 Skill 文件路径。

图片默认 Nano Banana 2；明确主题和必要文案后直接制作。单张海报优先 3:4、2K（以平台支持为准）。视频默认 Seedance 2.0；用户指定模型优先，模型不可用明确提示，不擅自替换。

内置 Nano Banana 2/Pro/2 Lite、GPT Image 2 与 2.5（含 Sunburst／Flare）、Midjourney v8.2/8.2-fast、MiniMax H3/H3-Max、Google Omni、Wan3.0/Prime、Seedance 2.0/2.0-fast/2.0-mini/2.5 指南。运行时以当前账号模型目录为准，Google Omni 不推定上游型号，2.5 不继承 2.0 的参数限制，Midjourney 只走参数尾部语法。

## 异步任务与生成

生成不设置积分确认阈值。结果返回任务状态、媒体路径、预估价格与可查询余额；实际扣费未知时明确标记。
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

当前发布保留[使用与维护](docs/usage.md)、[项目创作闭环](docs/creative-workflow.md)、[验证范围](docs/validation.md)和必要示例。英文Skill与内部模型提示词指南随包安装，由 `$wowidea` 单一入口选择；既有实测不扩大为所有模型或模式均已验收。

退出码：0 成功，2 参数错误，3 认证失败，4 版本/幂等冲突，5 服务错误或结果不确定，6 能力未验证或需要补充确认。

## 卸载

`npm uninstall -g @easyai/cli` 删除三个 CLI 命令。需要移除 Skill 时，让 Codex 只删除实际安装目录中的 安装记录 installedSkills 列出的本包目录；先保留自定义修改。凭据和任务索引默认不删除。撤销账号 Key 是独立操作，需用户明确要求。

## 项目创作闭环

运行 `wowidea project setup --dir <项目目录>` 将 CLI 和 Skill 固定到项目，后续媒体需求自动使用 Wowidea。详见 docs/creative-workflow.md。
