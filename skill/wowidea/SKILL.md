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
费用监控仅用于 Seedance 视频：有效报价 ≤200 积分直接执行（含恰好 200），只有 >200 才确认。图片、MiniMax、Google Omni、Wan 等其他生成直接提交，不主动获取费用报价或询问费用确认；普通画布任务同样不设置费用门槛。用户明确设置额外预算时仍遵守。此规则取代 0.2.0/0.2.1 的审批策略。
Seedance 仍遵循 [分镜准备与积分门槛](references/seedance-gate.md)：准备分镜与 manifest，≤200 自动校验执行，>200 一次展示分镜、设置与预计积分并取得确认。Seedance 未知报价不能猜成低价；其他模型不因缺少报价被阻止。修改 Seedance 请求后重新预检，只有新报价 >200 才重新询问。所有异步任务仍轮询、下载并报告结果，“不监控费用”不代表放弃等待生成完成。每个请求只提交一个任务，不自动重试。
每次完成生成必须向用户输出“本次实际使用 X 积分”，包括免费任务的 0 积分。使用 CLI 的 pointsUsage.actualPoints，不把预计费用、token 数或余额差当实扣；若 status 为 not_reported，明确说“平台未返回本任务实际积分”，可继续查询同一任务结算，不能编造数字。

## 凭据、画布与大响应

密钥只通过用户本机隐藏输入或已有系统凭据库获取，不让用户在聊天或命令参数粘贴。API Key 不写 Skill、记忆、仓库、任务清单。通过安装器保存非秘密默认值和版本，任务索引由 CLI 保存。
大响应使用 `--output <绝对路径>`；媒体使用 download 的本地路径。不要下载输入素材或任意响应 URL。
画布先 `canvas project show <id>` 精确读取，再按 `canvas --help` 选择操作；版本冲突刷新并说明，不覆盖协作者修改。删除、取消、Key 管理必须有对应用户意图。
