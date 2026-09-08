# Seedance 审批与费用控制
适用于全部 Seedance 版本。
1. 明确文本/图片/视频/音频/首尾帧/编辑/续写模式，每个参考的角色与数量；不推断包括或遗漏素材。
2. 先制作分镜表与分镜图，向用户展示本地图片。没有明确批准图片，不进行付费视频调用。用户提问、修改或沉默都不是批准。
3. 使用 UTF-8 manifest：state:storyboard_ready、prompt、model、duration、aspectRatio、resolution、audio、watermark:false、mode、lastFrameRequested、storyboard:[{shot,description,image:本地路径}]、references:[{type,role,localPath或url}]、referenceCounts:{images,videos,audio}。
4. 已批准本地参考通过 `seedance upload-references manifest.json` 上传配置的私有 MinIO，校验签名 URL 可读。上传会改变 manifest；在批准命令前完成最终设置展示。MinIO 凭据单独由用户环境配置，不记入文档。manifest 是本地私密执行文件，不提交 Git，不展示签名参数。
5. 核对模式、参考数量/时长、音频组合和平台限制。展示精确提示词、模型、时长、比例、分辨率、声音、参考角色/数量与尾帧请求。
6. 只有用户明确批准后才能 `seedance approve manifest.json --confirmation "I APPROVE STORYBOARD"`。不得把用户的首次创作请求当作图片批准。
7. `seedance payload manifest.json --file request.json` 导出最终私密请求，再 video preflight --file。得到服务器报价后告知费用并取得付费确认；非交互提交带 --yes --max-cost、quote 和幂等键，通过 video generate --manifest 执行。任何创意或费用设置变化都使批准失效，需重新展示并批准。
8. CLI 将批准绑定到素材字节与请求，单个批准仅提交一次。得到 taskId 后只查询该 ID；未得到 ID 用 tasks resume，不能重新生成或自动比较。
9. 成功后 `seedance finalize manifest.json --dir <绝对路径>` 下载视频、返回尾帧并生成 ledger 和 QC 素材。检查接触表、尾帧及多个时点右下区域；记录真实 QC 结论，不把自动生成裁剪图当作通过。若 ffmpeg 不可用说明缺失检查。无授权不重生成。
