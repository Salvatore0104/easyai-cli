# 网站执行流程

先运行 `wowidea --help` 与具体子命令 help；所有命令都支持全局 --json、--output。
认证：`wowidea auth use-key --prompt` 由用户在本机终端输入，保存在系统凭据库；验证 `auth status`、`balance`、`models list`。不调用 auth login。

模型目录返回具体输入能力及选项。model 使用目录 ID，保持精确版本。写入 JSON 前核对模式、时长、音频、分辨率、比例和引用限制；没有确认的限制不能猜测。指南只负责创作，不是 API Schema。

图片：`wowidea --json image generate --file request.json --idempotency-key <UUID>`，CLI 自动调用图片预检，也可先 image preflight 并在提交时带 --quote。
视频：`wowidea --json video preflight --file request.json`，再 `wowidea --json video generate --file request.json --quote <quoteId> --idempotency-key <UUID>`。Seedance 必须改用 --manifest。有效报价 ≤100 积分直接执行，不需要 --yes 或用户确认；>100 才展示预计积分与内容，一次确认后加 --yes --max-cost <用户批准上限>。用户另设更低上限时继续遵守该上限。
接口不存在、参数不合法或费用未知时报告阻塞，不提交、换接口或绕过费用门禁。

已有任务：`image|video status <taskId>`、`image|video watch <taskId>`、`image|video download <taskId> --dir <绝对目录>`。watch 最长 30 分钟，连接中断退出后可再 watch 相同 ID。
`tasks list` 返回当前服务器与凭据作用域下本地提交索引；`tasks resume <idempotencyKey>` 只查询，不能创建任务。任务归属不明确时保持 uncertain，报告幂等键。
下载完成后用本地绝对路径展示结果并做质量检查，同时输出 pointsUsage 中的实际使用积分。status、watch（含 JSONL）、download、tasks resume、Seedance finalize 均提供积分报告。未返回实际用量时明确标注，不能把预检估算或余额差写成实际费用。失败或质量不佳不代表授权自动重投。
