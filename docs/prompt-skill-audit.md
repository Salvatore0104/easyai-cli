# 生成提示词 Skill 审查

审查时间：2026-09-14。目标是确认 Wowidea 的模型提示词方法可发现、可路由且不会绕过网站平台。

| 模型族 | 当前使用方式 | 审查结论 |
| --- | --- | --- |
| GPT Image 2.5 / Flare / Sunburst | 独立 `$gpt-image-25-prompt` + `gpt-image-25` 路由指南 | 0.6.2 新增。负责生成、编辑和润色；只改提示词，不提交任务。 |
| GPT Image 2 | 内部 `gpt-image` 指南 | 合理。与 2.5 分离，避免继承 2.5 参数能力。 |
| Nano Banana | 内部 `nano-banana` 指南 | 合理。机器上另有 `$nanobanana`，但它直接调用 GRSAI，不应被 Wowidea 自动路由使用。 |
| MiniMax H3 / H3-Max | 内部 `minimax-h3` 指南 | 合理。机器上有 `$h3-prompt-writing`，但不是 npm 包的稳定依赖；随包指南保留必要结构并由模型路由选择。 |
| Seedance 2.0 / 2.5 | 分版本内部指南 | 合理。机器上的大型 Seedance Skill 套件是独立工作流；Wowidea 继续允许直接生成，不引入其审批或平台假设。 |
| Midjourney v8.2 | 内部 `midjourney` 指南 | 合理。比例和高清选项由平台脚本转换，不把 GPT/Nano 写法混用。 |
| Wan 3.0 | 内部 `wan` 指南 | 合理。由 Wan 模型路由选择，不声明独立 Skill。 |
| Google Omni | 内部 `google-omni` 指南 | 合理。固定规格以实时 capability 和平台审计为准。 |

`guideRegistry` 负责所有内部指南可读性；`promptSkills` 只登记随 npm 包一起安装且可稳定解析的独立 Skill。测试验证 GPT Image 2.5 路由能解析 `$gpt-image-25-prompt`，其他模型不会误用该 Skill。
