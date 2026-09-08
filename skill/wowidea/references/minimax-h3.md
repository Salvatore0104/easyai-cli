# MiniMax H3 / H3-Max

依据 [MiniMax官方H3提示词Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/h3-prompt-writing) 的 base-en.txt 与 ref-en.txt 编写的项目适配摘要，非原Skill拷贝。已核实官方仓库提供可供Codex使用的提示词Skill，旧版“没有官方H3规范”已过时。版本与许可状态见 [来源记录](sources.md)。

## 模式选择

| 模式 | 意图 | 提示方法 |
| --- | --- | --- |
| T2VA | 纯文本 | 构建完整声画时间线 |
| I2VA | 严格首帧 | 从图中状态向前发展 |
| FL2VA | 严格首尾帧 | 起态→连续变化→终态，不只复述静态图 |
| L2VA | 严格尾帧 | 设计前态并在结束时落到尾帧 |
| Ref2VA | 全能参考 | 定义各内容单元、参考关系及实际作用 |

这些不是 EasyAI mode 别名。不可把 L2VA 当 I2VA，不可把普通图参考当严格首帧。官方开源变体4–15秒、Ref2VA 9图／3视频／3音频及总12文件的规格不自动等于H3-Max或平台限制。

## 文本／关键帧：三段结构

字段按顺序：integrated_multimodal_description、overall_soundscape、non_diegetic_music。正文英文；台词、歌词、画面文字保留用户原文。静音声音字段写 N/A；若平台不能关音频，先说明，不用提示词冒充参数支持。

关键帧模式在三段之前写图像对齐指令。I2VA：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`
FL2VA：`How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.`
L2VA：`How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.`
用实际末镜编号替换N，S.SS为总时长两位小数，对齐行后空一行。不是 API 字段。

项目原创8秒静音示例（执行前校验能力）：

```text
integrated_multimodal_description: [Shot 1] A wide frontal view reveals a floating black prism above a reflective floor. Its planes peel outward into broad crimson ribbons while the camera holds a static shot. The ribbons keep the central void readable. [Shot 2] At 00:05.000, the camera cuts to a low-angle view as the ribbons fold into a luminous arch, preserving the dark opening at its centre.

overall_soundscape: N/A

non_diegetic_music: N/A
```

第一镜不加时间戳；后续切镜用递增 `[Shot N] At MM:SS.mmm`，小于总时长。运镜用自然动作，必要时给幅度和速度；区分推镜与变焦。对白主体稳定编号(S1)/(S2)，用 `<d>[Chinese] 原文台词</d>`；声线、表情写标签外。画面文字用英文双引号包裹原文。环境／动作声音和背景配乐分段，不重复台词。

## 全能参考：六段结构

全部段落按以下顺序用英文，细节应足以指导画面，不仅列素材关系：

1. subject_definitions：`<Subject N>` 为主体、场景、动作或风格内容；`<Picture N>` 为图源／帧锚点；`<Video N>` 为编辑、延长或时间结构来源；`<Audio N>` 为明确启用的声音来源。一个内容实体可由多份素材定义。
2. summary：方括号任务类型从 reference generation、video editing、video continuation、keyframe completion、audio reuse、audio reference 选择实际适用项，可用 ` + ` 组合。
3. retention_analysis：逐标签解释出现镜头与保留维度。视觉标记为 fully_preserved / partially_preserved / attribute_transfer / weak_reference；声音标记为 fully_copy / partially_copy / reference / weak_reference。
4. detailed_description：按播放顺序写构图、主体状态、环境光线、动作、镜头与声音，在实际生效处使用标签。
5. overall_soundscape：全片环境及动作声音。
6. non_diegetic_music：仅观众听到的非场内配乐；无配乐写N/A。

音视频标签独立编号；视频含音轨不等于批准参考声音。fully_preserved 只针对定义的参考维度，新增背景不必然降低主体身份保真。禁止未定义标签；参考来源和模型标签映射参见 [素材计划](reference-planning.md)。

## 当前 EasyAI 适配

只使用账号目录内精确H3/H3-Max ID与已验证supported_modes、mode_constraints。全参考、尾帧或音频复用未被验证时，只交付提示词与缺口，不切换供应商。官方H3-Regenerate-2K是另一阶段，不自动增加第二个付费任务。执行遵守 [异步恢复](workflow.md)。


CLI 已核验纯文本的 `prompt → content[type=text]` 映射，以及图片参考的 `mode:image_reference → videoGenerateMode:omni_reference` 映射。图片按 `image_urls` 顺序写入 `content`，每项为 `type:image_url`、`role:reference_image` 和 `image_url:{url}`；提示词的 `<Picture N>` 必须使用同一顺序。这是 Ref2VA 普通参考，不是严格首帧。重复图片会使上游去重后编号变化，因此提交前拒绝重复 URL。

此适配器暂限纯文本和仅图片参考：图参考必须有图，不接受偷偷加入音视频或与原生 content／mode 冲突的参数。视频、音频混合全能参考及严格关键帧的原生提交仍需独立契约验证，不能凭本次图片测试宣称全部模式通过。实时目录仍负责数量、时长、分辨率及音频能力校验。
