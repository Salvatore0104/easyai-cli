# Wowidea 使用与维护

Skill 指令为英文，默认仍用用户语言交流。`$wowidea` 是唯一创作入口，负责按任务选择模型提示词方法；只写提示词时不产生费用。

## 提示词指南

模型提示词方法是随包内部参考，由 `$wowidea` 按任务选择，也可直接读取：

| 模型 | CLI读取 |
| --- | --- |
| H3 | `wowidea --json guides show minimax-h3` |
| Seedance 2.0 | `wowidea --json guides show seedance-20` |
| Seedance 2.5 | `wowidea --json guides show seedance-25` |
| GPT Image 2 / 2.5 | `wowidea --json guides show gpt-image` |
| Nano Banana | `wowidea --json guides show nano-banana` |
| Midjourney v8.2 | `wowidea --json guides show midjourney` |

例如：“用 $wowidea 为咖啡新品写海报提示词，标题保留中文，使用 GPT Image 2.5。”或“用 $wowidea 整理 MiniMax H3 图片全能参考，图1保留商品，背景可以改变。”每份指南包含模式、参考绑定、完整例子与平台缺口。

## 项目与执行

一次性任务无需建档。持续项目可用project init/show/validate/record，文件位于指定目录的.wowidea中。非舞台项目stage字段留空。认可偏好与试验记录分开，不自动跨项目继承。参考编号按各媒体类型独立连续，提示词与请求数组同序。

生成使用UTF-8请求文件和一个UUID幂等键，默认等待并下载。中断后查询原任务或tasks resume，禁止重复付费提交。仅提示词／策划不调用生成。所有Seedance先展示实际分镜图并获明确批准，展示完整设置；所有模型均不设置积分、报价或费用确认门槛。

任务查看分两处：`tasks list`只读本机提交记录，用于恢复和防重复；`tasks remote --page 1 --page-size 20`读取服务器上当前账号的任务，是真正意义上的历史列表。`models list --type image|video`只列出能产出该媒体的模型，过滤在本地完成（平台会忽略 `?type=` 参数），需要平台原始类型时可直接传如 `image_analysis`。`models show <id>` 同时接受平台 id 与随包显示名，例如 `mj-v8.2` 和 `Midjourney v8.2` 都指向同一模型。

图片、文字、产品、插画、视频与舞台各用对应评审标准。媒体必须实际查看后评价。最终格式、印刷源文件、可编辑矢量、无缝循环或现场多屏若未实际实现，明确列为待完成。

## 更新与保留

安装器从当前包发现全部Skill入口并安装，默认保留用户修改与账号状态。新旧冲突文件进入配置目录skill-updates等待合并。随包入口为 `wowidea` 与兼容用 `easyai`，不覆盖用户原装的Flova、H3、Seedance或GRSAI工具。升级后在新对话中使用新Skill；是否即时刷新由宿主决定。

维护者更新来源摘要、许可与资源链接后运行resources:lock，再运行check、Skill校验及实际package:smoke。不得在运行时自动同步上游。当前资料只保留最终说明；源代码历史仍可通过Git查询。
