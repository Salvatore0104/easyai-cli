---
name: easyai
description: EasyAI CLI 的兼容入口，用于已有 EasyAI 账号自动化、媒体任务和无限画布请求；创作统一交给随包安装的 wowidea Skill。
---

# EasyAI 兼容入口

读取同一安装根目录中的 [Wowidea 主 Skill](../wowidea/SKILL.md)，按其模型路由、API Key、异步恢复与 Seedance 审批规则执行。`easyai`、`easyai-canvas` 和 `wowidea` 是同一个 CLI 的别名。
若 Wowidea 缺失，重新运行本仓库安装器完成配套安装，不临时下载其他模型 Skill。
