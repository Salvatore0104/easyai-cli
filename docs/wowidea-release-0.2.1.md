# 0.2.1：100 积分确认门槛与实际用量

按 2026-09-08 用户最新要求，图片、视频和画布预计费用 ≤100 积分直接生成；只有 >100 积分才确认。恰好 100 不确认。此规则覆盖 Seedance，取代 0.2.0 的每次分镜/付费审批要求；低价任务仍保留分镜准备、manifest、素材校验、watermark:false 和单任务防重。

超过门槛一次确认内容、设置和费用后，非交互调用使用 --yes --max-cost。低价不要求这两个参数；用户另设更低预算时仍遵守。未知报价、非积分报价、过期报价或请求变化不能假定为低价。

图片增加 image preflight；image generate 没有 --quote 时自动预检。视频及画布继续沿用现有预检。/v1/images/preflight 是新增补充契约，尚未证明线上已部署；未部署时明确阻塞，不在不知道费用时直接扣费。

status、watch（含 JSONL）、download、tasks resume、生成响应及 Seedance finalize 输出 pointsUsage。实际积分来自任务结算字段；未知时 actualPoints:null、status:not_reported，不能以预估、token 或余额差替代。人类可读输出显示“本次实际使用 X 积分”或明确的未返回说明；Seedance ledger 同时保存报告。

验证：完整类型检查、构建与 47 项测试通过。新增边界包括 0、99.99、100、100.001、101；模拟 CLI 验证图片和 Seedance 的 100/101 行为、完成任务 JSONL 实际积分、未知用量及零扣费。未新增线上付费任务。

本机已安装 0.2.1 CLI 和更新后的 Wowidea Skill。线上只读验证已有成功图片任务 6a9e6a2f7e18d7bc6516eb00：任务接口未返回实际积分，已验证 CLI 的人类可读输出和 JSON 都明确报告 not_reported，而非显示估算或 0。

网站需在任务接口提供 billing.actualPoints 等任务级实扣字段，并提供图片有效预检；这些服务器修改不在本 CLI 源码仓库内。前端/后端接好结算前，CLI 将真实报告“未返回”，不会承诺已经能够获取所有任务实扣。
