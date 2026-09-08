# 0.3.0 离线创作验收记录

本记录验证指南能否形成可执行的创作准备，不是模型实测。未生成图片／视频，不对未产生媒体写pass评分；所有示例都需要实际平台能力校验，Seedance还需要生成分镜图和用户批准。

## A：抽象VJ开场

输入：黑色空间，强冲击，金属结构逐渐失控，不提供参考。
方向：铬色薄膜潮汐；固定主裂隙作为识别锚点，层间延迟翻折制造深度，最终向观众推进。素材计划为空，纯文本，不伪造图引用。2.0按镜头顺序描述变化，不承诺精确拍点。使用vj-recipes、seedance-20和seedance-gate，准备阶段不跳过分镜图。
结论：已形成具体运动规则与主次关系，未套统一写实或极简标准；媒体质量未验证。

## B：超现实舞台主视觉

输入：空间内外翻转，多屏节目，现场像素尚未给出。
方向：悬空剧场的看台翻折为晶体叶片，中央通道作为空间锚点。图片提示写机位、尺度、构图和材质关系；安全区作为待确认项，不填假现场尺寸。舞台输出要求与模型比例独立，不承诺原生多屏输出。使用creative-direction、gpt-image与visual-review。
结论：可交付方向及图片提示词，屏幕映射仍需现场资料；没有用过度克制的社区模板覆盖用户需求。

## C：H3带动作参考片段

输入：图1提供发光物体外形，视频1只提供旋转轨迹，无声音参考。
素材关系：image1/hero_shape保留轮廓、改变材质；video1/motion_path保留运动轨迹、舍弃原角色和声音。Ref2VA六段结构中Subject1定义物体，Video1定义时间结构；不因为视频自带音轨而虚构Audio1。

原创提示摘要（实际创作需根据素材观察补足）:

```text
subject_definitions: <Subject 1> is the luminous object from <Picture 1>, preserving its outer silhouette. <Video 1> provides only the rotation path and pacing.
summary: [reference generation] A new stage visual follows <Subject 1> through the motion structure of <Video 1>, with a redesigned translucent material.
retention_analysis: <Subject 1> (appears in [Shot 1]): partially_preserved - preserve the silhouette and replace the surface material. <Video 1> (motion path): fully_preserved - retain the defined trajectory, without using its visible subjects or audio.
detailed_description: [Shot 1] A frontal wide view frames <Subject 1> against a deep violet space. The object follows the rotation path of <Video 1>. Light travels through its translucent layers, making the outer silhouette readable throughout the movement. The camera holds a static shot.
overall_soundscape: N/A
non_diegetic_music: N/A
```

结论：能区分内容实体与源文件，并保持六段结构及素材语义。CLI测试确认平台未支持Ref2VA/L2VA或音频组合时拒绝，不静默删素材。未检查真实素材，因此不能直接付费提交。

## D：沿节目风格继续第二段

输入：沿用用户明确认可的铬色空间，试验增加红色裂隙。
处理：先读指定节目档案，已认可的方向用于第二段；红色试验只入creation记录，用户明确认可后才更新preferences。换节目目录读新档案，不继承其他节目。project测试确认记录写入不改变project.json，重复初始化／重复记录拒绝覆盖。
结论：风格连续性与实验探索分开保存，避免试验污染节目记忆。不存在真实用户审批的演示档案保持approvedDirections为空。

## 未验证项

真实生成质量、卡点、循环接缝、现场LED效果、当前账户所有高级模式，以及sd25-pe原Skill分发均未宣称验证成功。后续真实验收需要单独的节目、素材和计费设置授权；不得把这份离线记录当Seedance分镜批准。
