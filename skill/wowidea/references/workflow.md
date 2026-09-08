# 网站执行流程

先运行 `wowidea --help` 与具体子命令 help；所有命令都支持全局 --json、--output。
认证：`wowidea auth use-key --prompt` 由用户在本机终端输入，保存在系统凭据库；验证 `auth status`、`balance`、`models list`。不调用 auth login。

模型目录返回具体输入能力及选项。model 使用目录 ID，保持精确版本。写入 JSON 前核对模式、时长、音频、分辨率、比例和引用限制；没有确认的限制不能猜测。指南只负责创作，不是 API Schema。

图片：`wowidea --json image generate --file request.json --idempotency-key <UUID> --dir <输出目录>`，直接提交，默认轮询并下载，不主动预检费用或询问。
MiniMax 等非 Seedance 视频：`wowidea --json video generate --file request.json --idempotency-key <UUID> --dir <输出目录>`，无需 --quote、--yes、--max-cost，默认轮询并下载。
仅 Seedance：video preflight --file，然后 video generate --manifest --quote --idempotency-key。报价 ≤200 直接执行，>200 一次确认后加 --yes --max-cost <用户批准上限>。用户为其他模型明确指定预算时才自行获取报价并带 --quote --max-cost；不要主动加入这些限制。
接口或参数错误不擅自换模型。仅 Seedance 费用未知时报告报价阻塞，其他模型不依赖费用预检。所有模型仍校验参数、单次提交、轮询、下载和报告实际积分。

已有任务：`image|video status <taskId>`、`image|video watch <taskId>`、`image|video download <taskId> --dir <绝对目录>`。watch 最长 30 分钟，连接中断退出后可再 watch 相同 ID。
`tasks list` 返回当前服务器与凭据作用域下本地提交索引；`tasks resume <idempotencyKey>` 只查询，不能创建任务。生成返回 uncertain 后继续用同一个键恢复；唯一快照差分任务可安全恢复，多个候选则保持 uncertain 并报告幂等键。
generate 的 JSON 成功结果包含 `taskId`、`status`、`paths` 和 `pointsUsage`。必须展示 `paths` 指向的本地结果；不要在网站状态成功后仅报告文字。只有用户明确要求后台运行才传 `--no-wait`，随后必须用相同任务/幂等键继续查询。下载完成后做质量检查并输出实际积分。status、watch（含 JSONL）、download、tasks resume、Seedance finalize 均提供积分报告。未返回实际用量时明确标注，不能把预检估算或余额差写成实际费用。成功但暂时无 URL 时查询同一任务，失败或质量不佳不代表授权自动重投。
