# 平台与模型参数契约审计（0.6.1）

审计时间：2026-09-14。数据来自 Wowidea 管理接口的只读快照及公开模型目录。本文件已脱敏，不包含平台内部 ID、构筑脚本源码、密钥、token、签名 URL 或私有配置。生产平台配置未作修改。

## CLI 标准契约

CLI 表达生成意图，平台构筑脚本负责上游字段转换。图片统一提交 `resolution + aspect_ratio`；`size` 仅作输入别名，推导完成后删除。别名冲突、非法比例和 capability 不支持的值在提交前失败。默认 `n=1`；自动平台调度下不承诺多输出。CLI 不提交 `platform_id` 或平台私有字段。

## 14 个启用平台、36 个启用绑定

| 平台 | 数量 | 启用绑定 | 已审查参数规则 |
| --- | ---: | --- | --- |
| APIMart MiniMax H3 | 1 | MiniMax-H3 | 4–15 秒；CLI 720p/1440p 分别转 768P/2K；图/视频/音频参考上限 9/3/3。 |
| Midjourney | 2 | mj-v8.2、mj-v8.2-fast | 比例写入 prompt；编辑仅取首图；2K/4K 转 `--hd`；Fast 文生图最高 2K。 |
| DeepSeek | 1 | deepseek-flash | OpenAI 兼容文本链路，不进入 Wowidea 媒体生成路由。 |
| GrsAI GPT Image | 4 | GPT Image 2、gpt-image-2.5、flare、sunburst | `aspect_ratio` 优先于 `size`，再结合 resolution 映射像素；最多 16 张参考图；脚本当前不转发 `n`。 |
| kkFlow | 2 | GPT Image 2、gpt-5.6-sol | OpenAI 兼容链路；GPT Image 使用标准图像生成/编辑参数。 |
| 阿里云百炼 | 1 | Qwen3.7-Plus | OpenAI 兼容文本/理解链路，不进入媒体生成路由。 |
| Wuyin Multimodal（后台显示“速创 API”） | 8 | GPT 2.5 三款、Nano 三款、Google Omni、MiniMax-H3 | 各模型独立转换；GPT 2.5 基础版限 1K，flare/sunburst 支持 1K/2K/4K；Omni 固定 720p/10 秒；H3 使用 768P/2K。 |
| APIMart GPT Image 2.5 | 2 | flare、sunburst | 脚本读取 `size + resolution`；`n=1..4`；支持格式、质量、moderation；最多 16 张参考图。CLI 仍只发标准字段与单输出。 |
| GrsAI Nano Banana | 2 | Nano Banana 2、Nano Banana Pro | 比例转 `aspectRatio`，分辨率转 `imageSize`；参考图从 `image` 读取；当前单输出。 |
| 火山引擎（豆包） | 4 | Seedance 2.0、fast、mini、2.5 | Volces 链路；2.0 为 4–15 秒，2.5 为 4–30 秒；模式、参考数量、音频以实时 capability 为准。 |
| MiniMax Official H3 | 2 | MiniMax-H3、MiniMax-H3-Max | H3 为 4–15 秒、768P/2K；Max 为 5–15 秒、480P/768P且不支持多模态参考；强制无水印。 |
| 智谱AI | 1 | glm-5.3-flash | OpenAI 兼容文本/理解链路，不进入媒体生成路由。 |
| Aliyun Bailian Wan 3.0 Native | 2 | Wan3.0-Video、Wan3.0-Video-Prime | 2–30 秒；480p/720p/1080p；支持首尾帧、多模态参考和可选音频。 |
| Xiaomi MiMo Official | 2 | mimo-v2.5、mimo-v2.5-pro | OpenAI 兼容文本/多模态理解链路，不进入媒体生成路由。 |

同名模型按平台分别审查，不能把一条平台脚本的字段或限制迁移到另一平台。公开 capability 是模型级聚合，可能比任一候选平台的实际脚本更宽；因此 CLI 只采用跨自动路由可移植的共同契约。

## 未修改的生产平台问题

- GrsAI GPT Image 对 `aspect_ratio` 的优先级会覆盖 `size`，是本次方图错误的直接放大因素；CLI 现删除 `size` 并只发无冲突的标准字段。
- GrsAI GPT Image 未转发 `n`，而 APIMart GPT Image 支持 1–4；自动调度无法保证多输出，CLI 暂时拒绝 `n>1`。
- APIMart GPT Image 仍读取 `size`，与新的 CLI 标准契约不一致；需要平台后续独立改为从 `aspect_ratio + resolution` 构造上游尺寸。
- Wuyin 的 Google Omni 固定 720p/10 秒，不能把公开聚合 capability 中更宽的规格当作该平台可用。
- H3 在 APIMart、MiniMax Official 和 Wuyin 使用不同上游 payload 与分辨率名称；CLI 仅验证公共意图字段。
- Midjourney 编辑仅使用首张参考图。若公开 capability 聚合显示多图，仍须按该候选平台限制收窄。

任何生产脚本修正、平台绑定调整或 capability 重构都需要单独授权、部署和回归，不属于 0.6.1。
