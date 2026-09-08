# Wowidea 视觉 Agent v1 使用与维护

保持 `$wowidea`、wowidea/easyai/easyai-canvas 和既有 image/video/tasks/canvas 命令兼容。所有创作仍由当前 Codex 驱动，CLI 不另起语言模型或增加第三方账号。

## 节目档案

使用 project init --dir 初始化空模板，Codex根据用户节目资料编辑，再 project validate --dir 校验。init拒绝覆盖已存在档案；project show读取并校验。stage保存现场屏幕规格，单次creation.settings保存模型生成规格，两者不能混用。

project record --dir --file 接收 wowidea.creation/v1，要求独立id、完整prompt、精确model、mode、settings、素材角色列表、taskId（草案为null）、outputs及qc。相对素材路径均相对节目目录。参考按各媒体类型独立编号，保持原列表顺序。重复id拒绝覆盖，修订使用新id。记录不修改长期偏好，也不提交API。

准备、提交后、完成后保存独立修订记录；真实taskId一旦取得立刻记下，记录失败只修复本地文件。QC的pass/revise需要真实输出、reviewedAt与evidence。字段校验只能确保记录结构，不能证明Codex确实看过画面，也不能替代用户审批。

凭据保留原系统凭据库机制，签名URL和可执行manifest放 `.wowidea/private/` 并加入节目仓库忽略规则。共享节目档案前核对素材可移交范围。

## 模型指南

使用 guides list 得到本地资源列表，guides show <id>读取内容；无认证、无远程请求。运行时根据节目加载所需指南，不一次读取所有内容。安装包内resources.json固定摘要，models route的guideInfo定位包内资源，不依赖当前工作目录。

H3三段／六段结构和Seedance 2.0／2.5差异只负责创作。提交仍以当前EasyAI实际supported_modes、mode_constraints和计费设置为准。官方模式未暴露时给出明确缺口，不发起降级任务。v1不改网站后端、不自动后期，也不保证超宽屏原生输出、无缝循环或逐拍同步。

## 上游更新与发布

1. 读取目标官方文档／源文件与许可证，锁定Git提交或页面核验日期；不执行上游安装脚本。
2. 更新upstream-lock.json的适用模型、来源摘要和源文件sha256。无明确再分发授权采用原创总结与链接；可复制内容保留许可和修改说明。
3. 适配为项目所需指南，复核与节目审美冲突的建议；新增指南同时更新guideRegistry和Skill入口。
4. 审阅本地差异后运行 npm run resources:lock，然后 npm run check、npm pack --dry-run 和 npm pack。
5. 运行 npm run package:smoke -- <打包文件.tgz>，从实际npm包验证在其他工作目录运行guides/project，并验证安装器保留自定义Skill、凭据和节目档案。

用户重复运行现有安装器即可升级CLI与Skill，用户修改的Skill保留、候选新文件进入skill-updates。运行时不自动同步上游。resources:lock是维护命令，不能在CI中用来自动掩盖摘要不一致。官方文档和社区来源可能有更新，必须按上述流程人工审查。

## 来源边界

sd25-pe由官方页面推荐，但本次分发端点404，未打包原Skill。MiniMax H3官方提示规范已读取，但未建立独立Skill许可，采用原创适配与必要格式说明。PicoTrex许可声明冲突，采用索引。freestylefly四类元数据按MIT打包并保留许可；其他图片／视频不随包复制。

资源摘要将文本规范化为UTF-8/LF后计算，避免Windows/macOS换行差异触发误报；二进制文件按原始字节计算。上游文件摘要仍记录固定提交的原始字节。
