# 文档中心

这里是“认养一棵树”项目的文档导航。文档按受众和用途组织，代码与测试是实现事实的最终依据。

## 快速入口

### 产品与业务

- [产品需求文档](product/PRD.md)
- [产品定位与设计原则](product/PRODUCT_POSITIONING.md)
- [项目亮点](product/HIGHLIGHTS.md)
- [项目演讲稿](product/pitch-deck.md)

### 技术与开发

- [架构总览](../ARCHITECTURE.md)
- [数据结构](tech/database-schema.md)
- [贡献指南](../CONTRIBUTING.md)
- [Codex 执行规则](../.codex/execution-rules.md)

### 规则模拟

- [模拟系统设计](simulation/system-design.md)
- [指标定义](simulation/metrics-definition.md)
- [测评方法](simulation/methodology.md)
- [交付与运行](simulation/delivery-guide.md)
- [40 组回归证据与简历材料](simulation/resume-analysis.md)

### 运营与报告

- [降级执行计划](operations/degradation-execution-plan.md)
- [降级修复计划](operations/degradation-fix-plan.md)
- [认养履约 V2 实施报告](reports/adoption-v2/implementation-report.md)
- [知识库评测报告](reports/adoption-v2/rag-eval-report.md)
- [Agent 评测报告](reports/adoption-v2/agent-eval-report.md)
- [视觉回归报告](reports/adoption-v2/visual-regression-report.md)
- [私有项目发布检查清单](operations/private-release-checklist.md)

### 历史材料

- `superpowers/specs/`：已完成设计规格。
- `superpowers/plans/`：历史实施计划。
- `archive/legacy-tasks.md`：早期未回填任务表，不作为当前进度来源。
- `../.codex/plans/`：本轮仓库治理计划与执行摘要。

## 旧路径迁移

| 旧位置 | 新位置 |
| --- | --- |
| 根目录 `PRD.md`、`PRODUCT.md` | `docs/product/` |
| 根目录 `DATA_STRUCTURE.md` | `docs/tech/database-schema.md` |
| `docs/simulation-*.md` | `docs/simulation/` |
| `docs/adoption-v2/` | `docs/reports/adoption-v2/` |
| 根目录 `PROJECT_RULES.md`、`CODEX_*.md` | `.codex/` |

移动记录保留在 Git 历史中；仓库不保留重复跳转文件。
