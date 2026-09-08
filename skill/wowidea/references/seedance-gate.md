# Seedance 审批与费用控制
适用于全部 Seedance 版本。
1. 明确文本/图片/视频/音频/首尾帧/编辑/续写模式，每个参考的角色与数量；不推断包括或遗漏素材。
2. 先制作分镜表与分镜图。预计 ≤100 积分时不等待分镜批准，直接继续；预计 >100 时展示图片、设置与预计积分并取得一次明确确认。用户的新积分门槛取代旧的逐次审批规则。
3. 使用 UTF-8 manifest：state:storyboard_ready、prompt、model、duration、aspectRatio、resolution、audio、watermark:false、mode、lastFrameRequested、storyboard:[{shot,description,image:本地路径}]、references:[{type,role,localPath或url}]、referenceCounts:{images,videos,audio}。
4. 用户请求中使用的本地参考通过 `seedance upload-references manifest.json` 上传配置的私有 MinIO，校验签名 URL 可读。上传会改变 manifest；先完成最终请求再预检。MinIO 凭据单独由用户环境配置，不记入文档。manifest 是本地私密执行文件，不提交 Git，不展示签名参数。
5. 核对模式、参考数量/时长、音频组合和平台限制。展示精确提示词、模型、时长、比例、分辨率、声音、参考角色/数量与尾帧请求。
6. `seedance payload manifest.json --file request.json` 导出最终私密请求，再 video preflight --file 获取服务器报价。≤100 积分时保留 storyboard_ready，不调用 approve，不提确认问题，直接 video generate --manifest --quote --idempotency-key，CLI 自动绑定分镜字节与请求。
7. 仅 >100 积分时一次展示分镜、设置、参考及报价并请用户确认；确认后调用 `seedance approve manifest.json --confirmation "I APPROVE STORYBOARD"`，通过 video generate --manifest --quote --yes --max-cost --idempotency-key 执行。不要再问第二次付费确认。任何创意/设置变化重新准备 manifest 与报价，仅新报价 >100 时再确认。未知费用不能假定低于门槛。
8. CLI 将批准绑定到素材字节与请求，单个批准仅提交一次。得到 taskId 后只查询该 ID；未得到 ID 用 tasks resume，不能重新生成或自动比较。
9. 成功后 `seedance finalize manifest.json --dir <绝对路径>` 下载视频、返回尾帧并生成 ledger 和 QC 素材。检查接触表、尾帧及多个时点右下区域；记录真实 QC 结论，不把自动生成裁剪图当作通过。向用户报告 pointsUsage 的实际使用积分，未返回则明确标注，不能以预估代替。若 ffmpeg 不可用说明缺失检查。无授权不重生成。
