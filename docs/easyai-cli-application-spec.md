# EasyAI CLI 与 Codex 控制应用规范

版本：0.1.0（账号 beta）

## 1. 目标和边界

`easyai` 是面向人员、脚本和 Codex 的统一命令行客户端。它覆盖账号认证、模型与余额查询、图片和视频任务、无限画布编辑与执行、资产和模板管理。`easyai-canvas` 是同一程序的兼容别名。

首版不提供网站内嵌 Codex Agent 或 MCP Server。CLI 中的 API 客户端是后续 MCP 适配层的唯一建议复用边界。当前工作区不含 EasyAI 后端和前端源码，因此新增服务端接口以 OpenAPI overlay 交付，不能在本包内让线上服务生效。

## 2. 运行和输出契约

- Node.js 20+；npm 包暴露 `easyai` 和 `easyai-canvas`。
- 全局参数：`--profile`、`--base-url`、`--json`、`--jsonl`、`--output`、`--timeout`、`--no-color`。
- 默认 stdout 是短摘要；`--json` 是稳定 JSON；`--jsonl` 用于列表或事件流；`--output` 将完整 JSON 写入指定文件并仅打印绝对路径。
- 媒体下载返回任务 ID 和绝对本地路径。密钥、令牌、Authorization、Cookie 和签名 URL 查询值必须脱敏。
- 退出码：0 成功、2 参数、3 认证、4 版本或幂等冲突、5 服务、6 缺少审批、7 超预算。

## 3. 命令面

认证与发现：`auth login|logout|status|use-key`、`api-key create|list|revoke`、`models list|show`、`balance`。

生成：`image generate|status|watch|download`；`video preflight|generate|status|watch|cancel|download`。请求体由 `--data` 或 `--file` 提供。图片与非 Seedance 视频默认直接提交、轮询和下载；Seedance 必须引用预检产生的 `--quote`，只有预计超过 200 积分时才要求确认或无人值守的 `--yes --max-cost`。

画布：`canvas project`、`node-types`、`node`、`bind|unbind`、`edge`、`group`、`asset`、`template`、`run`、`task`。`canvas operation` 提供低层原子操作，`canvas batch` 最多提交 100 项。

Seedance：`seedance validate|approve|upload-references` 只管理本地清单；实际提交仍走 `video preflight` 和 `video generate --manifest`。

## 4. 认证与权限

交互登录使用浏览器 PKCE 和 loopback callback，要求服务端实现 `/api/auth/cli/authorize` 与 `/api/auth/cli/token`。登录会话请求 `canvas:read`、`canvas:write`、`canvas:execute`、`canvas:collaborate`。CI 使用 `EASYAI_API_KEY` 或 `auth use-key --key-stdin`。

账号 API Key 只有名称、备注、有效期；它代表账号级自动化权限，不承诺细粒度 scope、项目白名单或预算策略。明文只显示一次，可立即撤销。持久凭据使用系统凭据库，配置文件权限设为仅当前用户。

## 5. 一致性、预检和计费

所有原子画布修改包含 `baseVersion`、UUID `clientMutationId` 和 `Idempotency-Key`。未指定版本时 CLI 先精确读取项目状态。409 不自动覆盖，调用者刷新后自行重放。

图片与非 Seedance 视频允许直接提交。Seedance 视频必须预检；quote 绑定规范化 payload 的 SHA-256、费用和过期时间，预计超过 200 积分才触发确认。服务端接口缺失时 CLI 可创建仅供交互评审的本地 quote，其费用为未知；未知 Seedance 费用不能提交。网络结果不确定时 CLI 只按幂等键或安全的提交前快照差分查询既有任务，不自动重提。

图片和视频生成 POST 应快速返回 `202 + taskId`，不应阻塞到生成完成。`GET /v1/tasks?idempotencyKey=...` 必须真正过滤并返回该键；未知键返回空列表。CLI 对旧服务器的快照差分恢复只接受唯一、时间与媒体类型匹配的新任务，不能替代服务端原子幂等约束。

服务端必须实现 `POST /v1/video/preflight` 和 `POST /v1/canvas-workflow/projects/{projectId}/executions/preflight`，并合并 `openapi/easyai-cli-overlay.yaml` 的强类型 Schema。

## 6. Seedance 安全状态机

状态为 `draft -> storyboard_ready -> approved -> submitted -> completed|failed`。提交前必须存在分镜表和可查看的分镜图。预计费用超过 200 积分时用户需以明确批准语句批准；预计不超过 200 积分时 CLI 可在严格校验后记录自动批准。提示词、模式、参考素材、时长、比例、分辨率、模型或音频变化后批准失效并重新预检。

本地参考素材先上传私有 MinIO，再生成并验证短期可读 GET URL；每个参考有唯一角色。UTF-8 manifest 包含完整提示词、全部计费设置、参考角色/数量、尾帧要求和严格的 `watermark: false`。最终 payload 哈希必须与批准后的预检一致。

每次批准只提交一个任务，不自动重试、重投或生成对比版本。拿到任务 ID 后只轮询该任务。成功后应下载视频和尾帧，并在任务 ledger 记录 task ID、设置、参考数量、manifest、路径和 QC；QC 检查接触表、尾帧和右下角可见水印，不自动重新生成。

## 7. 验收

- 契约：全部命令帮助、稳定 JSON 字段、分页、Schema、错误映射和别名兼容。
- 认证：登录、刷新/过期、退出、Key 创建/撤销、跨账号拒绝和日志脱敏。
- 画布：14 类节点发现、动态选项、节点/边/群组/绑定、100 项上限、项目隔离、409 和幂等重放。
- 生成：图片直提；视频预检、费用上限、断网恢复、单任务、取消、事件回放和下载校验。
- Seedance：未批准拒绝、变化后失效、引用不一致、watermark 拒绝和禁止自动重试。
- 发布：在源码目录外验证帮助、只读认证检查、按 ID 读取、画布安全写入、媒体路径，以及 Windows/macOS/Linux 构建产物。

## 8. 分阶段交付

1. 后端合并 overlay，完成预检、幂等查询和认证端点。
2. 发布认证和只读 CLI。
3. 开启画布写入及图片/视频任务 beta。
4. 发布 Codex Skill、三平台单文件程序并逐步开放账号 beta。
