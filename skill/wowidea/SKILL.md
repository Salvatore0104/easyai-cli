---
name: wowidea
description: 使用 Wowidea 网站账号生成海报、图片和视频，选择 Nano Banana、MiniMax、Seedance 等模型，制作提示词、管理异步任务与无限画布。用户写 $wowidea、使用 wowidea 或 /wowidea 创作意图时使用。
---

# Wowidea 创作入口

使用已安装的 `wowidea` CLI（兼容 `easyai`）。`$wowidea` 是 Skill 调用；`/wowidea` 作为消息文本理解，不承诺原生斜杠菜单。全程使用网站账号 API Key；不要要求浏览器登录、其他提供商 Key 或临时下载安装上游 Skill。

## 需求与模型

先判断是新创作还是继续任务。“继续刚才的视频”先 `wowidea --json tasks list`，按时间和上下文确定任务，查询/恢复，不再生成。
新图片运行 `wowidea --json models route --kind image`；新视频使用 `--kind video`。用户指定模型时加 `--model <名称>`。默认图片 Nano Banana 2，视频 Seedance 2.0；平台不可用时说明具体原因，不能静默换模。
读取返回 guide 对应的本 Skill 参考文件，然后按实时 capabilities 校验参数；不要把建议默认值当作已验证能力。指南覆盖：
- [Nano Banana 系列](references/nano-banana.md)
- [GPT Image 2](references/gpt-image.md)
- [MiniMax H3 / H3-Max](references/minimax-h3.md)
- [Google Omni](references/google-omni.md)
- [Wan3.0 / Prime](references/wan.md)
- [Seedance 2.0 / fast](references/seedance-20.md)
- [Seedance 2.5](references/seedance-25.md)

需求足够时直接制作提示词和执行已授权图片生成，不重复询问模型。海报缺少主题、必填文案或必需素材时一次问齐。未给比例的单张海报优先 3:4、2K（仅当平台支持）；其他风格细节自行补全并简述。用户只要求提示词或策划时不提交生成。

## 执行与恢复

读取 [网站执行流程](references/workflow.md)。请求写入 UTF-8 JSON 文件，调用 CLI，不拼接私有 HTTP。
图片和视频均可能异步：先生成并记住一个 UUID 幂等键 → 提交一次 → 保存 taskId → watch → download → 展示本地结果。
断网、超时、未知归属或进程重启只用 tasks list/resume、status/watch；绝不重新 POST。不同创作才用新键。
视频必须先网站预检。未知报价、未部署预检或不完整能力阻止提交；不能把本地估算当扣费批准。
任何 Seedance 版本都必须遵循 [分镜审批与付费门禁](references/seedance-gate.md)。修改后重新审批；每次批准一个任务，不自动重试。

## 凭据、画布与大响应

密钥只通过用户本机隐藏输入或已有系统凭据库获取，不让用户在聊天或命令参数粘贴。API Key 不写 Skill、记忆、仓库、任务清单。通过安装器保存非秘密默认值和版本，任务索引由 CLI 保存。
大响应使用 `--output <绝对路径>`；媒体使用 download 的本地路径。不要下载输入素材或任意响应 URL。
画布先 `canvas project show <id>` 精确读取，再按 `canvas --help` 选择操作；版本冲突刷新并说明，不覆盖协作者修改。删除、取消、Key 管理必须有对应用户意图。
