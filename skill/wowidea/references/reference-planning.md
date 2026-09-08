# 素材角色与模式

先实际查看素材，再确定每份素材“参考哪部分、用于哪里、保留什么、允许改变什么”。未经用户确认，不能把来源图自动设为首帧，也不能把审核用故事板自动加入视频请求。

通用创作记录 `references` 按输入顺序保存：`type`（image/video/audio）、唯一 `role`、`source`（本地路径或无签名稳定 URL）、`scope`、`preserve` 和 `change` 字符串数组。`project record` 为每种媒体独立生成连续 index 与 image1/video1/audio1 标签；这些标签服务素材清单，模型提示词另用对应语法。

例：第一张图只提供主物体形状，第二张图只提供发光材质，第一段视频只提供运动路径。不能把第二张图的背景、视频里的角色或视频自带音频无意带入成片。

## 请求对应

- 从同一清单按类型筛选，保持顺序生成 image_urls、video_urls、audio_urls；提示词中的素材编号与这些数组一致。不得按文件名重排。
- Seedance manifest 使用现有 `references:[{type,role,localPath/url}]`；通用记录的 scope/preserve/change 写进最终 prompt，并使用同一个 role 绑定 storyboard.sourceRoles。
- H3 `<Subject N>` 指内容实体，不能机械等同第 N 个文件；一个实体可由多个文件共同定义。`<Picture N>`／`<Video N>` 对应媒体清单；`<Audio N>` 的原视频音轨关系必须另外明确，不能因为视频有声音就默认使用。
- 审核分镜图、正式输入、原始来源三者分别标注；生成了分镜并不证明已把参考传进 API。

## 可执行能力

先运行 models route，并读取 live capabilities 的 supported_modes、mode_constraints、媒体数量／时长和音频组合。官方结构是创作依据，不是 EasyAI 请求 Schema。

若平台未暴露模式、角色参数或时长约束，只交付提示词和缺口说明，不通过改名、丢弃引用或改成纯文本绕过验证。全能参考是创作关系，不意味着任意媒体组合都可执行。验证失败后若改变模式／参考／计费设置，Seedance 必须重新审批。
