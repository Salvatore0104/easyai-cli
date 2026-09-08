# Seedance 审批与费用控制
适用于全部 Seedance 版本。
1. 明确文本/图片/视频/音频/首尾帧/编辑/续写模式，每个参考的角色与数量；不推断包括或遗漏素材。
2. 先制作分镜表与分镜图，并按 [分镜审美与参考忠实度](storyboard-quality.md) 对照实际素材审查。所有 Seedance 都必须展示合格分镜并取得用户明确批准；200 积分阈值只决定是否追加费用确认，不能代替创意审批。
3. 使用 UTF-8 manifest：state:storyboard_ready、prompt、model、duration、aspectRatio、resolution、audio、watermark:false、mode、lastFrameRequested、storyboard:[{shot,description,image:本地路径,sourceRoles:[参考角色]}]、storyboardQc、references:[{type,role,localPath或url}]、referenceCounts:{images,videos,audio}。图片/视频参考模式的每个镜头必须指向真实 reference role，分镜图本身不会自动成为视频输入。
4. 用户请求中使用的本地参考通过 `seedance upload-references manifest.json` 上传配置的私有 MinIO，校验签名 URL 可读。上传会改变 manifest；先完成最终请求再预检。MinIO 凭据单独由用户环境配置，不记入文档。manifest 是本地私密执行文件，不提交 Git，不展示签名参数。
5. 核对模式、参考数量/时长、音频组合和平台限制。展示精确提示词、模型、时长、比例、分辨率、声音、参考角色/数量与尾帧请求。
6. 生成分镜图时只使用一个幂等键。超时、下载失败或任务仍运行时继续恢复同一键/任务，禁止换新键再次 POST。CLI 会阻止相同 payload 使用新键；只有用户明确要求重新生成时才能使用 `--allow-reroll`。
7. 用户确认合格分镜后，填写最终 manifest，运行 `seedance validate manifest.json --for-approval`，再以 `seedance approve manifest.json --confirmation "I APPROVE STORYBOARD"` 绑定分镜、质检、参考素材和请求。不得代替用户填写确认。
8. `seedance payload manifest.json --file request.json` 导出最终私密请求，再 video preflight --file 获取服务器报价。预计 ≤200 积分时不再追加费用确认，直接用已批准 manifest 提交；>200 时展示模型、时长、比例、分辨率、声音、参考数量与报价，取得费用确认后加 --yes --max-cost。任何创意/设置变化都需重新批准分镜并预检；未知费用不能假定低于门槛。
9. CLI 将批准绑定到素材字节与请求，单个批准仅提交一次。得到 taskId 后只查询该 ID；未得到 ID 用 tasks resume，不能重新生成或自动比较。
10. 成功后 `seedance finalize manifest.json --dir <绝对路径>` 下载视频、返回尾帧并生成 ledger 和 QC 素材。检查接触表、尾帧及多个时点右下区域；记录真实 QC 结论，不把自动生成裁剪图当作通过。向用户报告 pointsUsage 的实际使用积分，未返回则明确标注，不能以预估代替。若 ffmpeg 不可用说明缺失检查。无授权不重生成。

批准生成前始终展示完整镜头、准确模式、模型、时长、比例、分辨率、音频、参考角色与数量、尾帧选择以及 watermark:false，绑定最终 manifest。低于费用门槛不免除这次展示；用户修改或含糊回复不是批准。
