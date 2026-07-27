# 认养一棵树 V2 实施报告

日期：2026-07-20
基线：`3f21c9d` 及实施前工作区既有修改
分支：`codex/adoption-v2-knowledge-assistant`

## 已实现

- 兼容迁移：认养任务关联、凭证版本、审核、权益 V2、结算、续养、反馈关联、Agent 运行与工具日志、审计关联。
- 认养与履约动作式状态机、乐观锁、409 冲突、人工审核和结算门禁。
- LZ018 幂等黄金案例：业务编号 `ADOPT-2026-LZ018-001`，保留模糊退回、重提通过、权益、结算、下一任务和续养节点。
- 五份带元数据的 Demo 知识草案、21 个本地 BM25 chunk、角色过滤、PII 清洗、引用校验和 24 题评测集。
- 后台制度知识/运营数据双模式、引用折页卡、转人工；村民任务局部问答、双图凭证提交；运营任务页凭证查看与审核。
- 履约协调 Agent 影子运行、只读工具日志、结构化建议校验和 Recommendation 审批隔离。
- 功能开关：`ADOPTION_V2_ENABLED`、`KNOWLEDGE_ASSISTANT_ENABLED`、`ADOPTION_AGENT_SHADOW_ENABLED`。

## 验证结果

- Web 103 项、Admin 52 项、Simulation 60 项、Knowledge 4 项测试通过。
- 全仓类型检查、Prisma validate、生产构建通过。
- 24 题固定知识评测中，20 条可回答问题召回命中率为 100%，运营专属章节泄漏为 0。
- 本地数据库已应用全部 12 个迁移；`prisma migrate status` 返回 `Database schema is up to date!`。
- Playwright 已覆盖后台助手与村民任务的 375、768、1440px 视口，并验证运营端凭证审核界面。
- 后台知识助手空状态插画已由豆包 Seedream 5.0 pro 生成，完成透明背景处理并优化为 93 KB WebP。

## 发布门禁

- 五份知识源仍为 `draft`；生产环境不会召回，必须完成人工审核后将目标版本改为 `active` 并重建索引。
- 本机无模型密钥，知识问答和 Agent 已验证安全降级，但未完成回答忠实度、引用准确率和 Agent 成功建议评测。
- 未把现有 V0/V1 规则模拟改写成虚构的 V2-Agent 指标；需模型可用并获得真实建议记录后再运行同条件 Agent Eval。
