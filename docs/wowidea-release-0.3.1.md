# 0.3.1：从 Flova 工作方法提炼可复用创作配方

此前Wowidea的模型指南与VJ方法已经齐备，但复杂创作缺少清晰的轮次目标、跨阶段职责与外部Skill复用方法。本版借鉴本机Flova入口和Skill Builder，将这些方法适配为Codex决策、EasyAI执行的本地资源。

- 新增production-rounds指南：按单项素材、完整方案或阶段制作组织本轮目标、保留项、变化、依赖与完成证据，延续同一节目和任务。
- 新增recipe-authoring指南：将外部规则分配到素材分析、分镜、执行、提示词和交付，提供可复制的配方骨架以及“建筑呼吸与节奏爆发”“同一世界中的超现实变体”两份原创舞台配方。
- guides list/show从17份扩展为19份资源，随npm包和安装器分发。现有CLI命令兼容；无新增在线Flova操作或依赖。
- 来源记录包含本地Flova两份文档的SHA-256和核验日期；未取得再分发许可或确认上游版本，因此不捆绑全文、示例媒体或本机账户文件。

## 使用

```text
wowidea --json guides show production-rounds
wowidea --json guides show recipe-authoring
```

给Codex的示例：“用 $wowidea 的建筑呼吸配方规划开场，先给方向和素材计划。”或“把这份工作流固化为Wowidea配方，保留它的变形方法，按当前模型能力适配。”无需安装Flova。

## 验证边界

资源哈希与链接、Skill格式、类型检查、构建及既有行为测试用于验证资源和执行兼容性；实际npm安装测试从不同工作目录读取新增指南，并检查自定义Skill与节目档案保留。离线情境走查见[配方验收](recipe-acceptance-0.3.1.md)。这些不证明模型审美表现，未新增付费生成；0.3.0的媒体实测结论不扩大到新配方。
