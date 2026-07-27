# 仓库重构历史总结

> 历史材料，以当前代码、测试和最新报告为准。

本文记录 2026 年 7 月仓库重构阶段的收尾结论。原报告中的完成率、工时和文件计数只对应当时基线，不作为当前验收结果。

## 当时完成的主要工作

- 建立 `.codex/` 规则与 `docs/` 产品、技术、模拟、运营、报告和归档分层。
- 为应用与共享包补充模块说明。
- 建立 5 个固定种子 × 8 个场景的 40 组成对回归与 13 项指标口径。
- 增加 `pnpm test`、`pnpm docs:check`、`pnpm quality:gate` 和 GitHub 模板。
- 明确密钥、个人信息、模拟证据和未授权开源的边界。

## 当前修订

- 公开入口已调整为纯中文招聘作品集，旧英文首页已移除。
- 当前证据入口为 [`docs/portfolio/README.md`](../portfolio/README.md)。
- 40/40 回归结论仍是“暂不支持升级”，不得包装为线上收益。
- 远端 About、Topics、旧 PR、Tag 和 Release 的状态以 GitHub 实际页面为准。

> 模拟运营数据，不代表真实业务结果。

## 当前验收入口

- 产品需求：[`docs/product/PRD.md`](../product/PRD.md)
- 实现报告：[`docs/reports/adoption-v2/implementation-report.md`](../reports/adoption-v2/implementation-report.md)
- 模拟方法：[`docs/simulation/methodology.md`](../simulation/methodology.md)
- 简历口径：[`docs/simulation/resume-analysis.md`](../simulation/resume-analysis.md)
- 完整质量门：`pnpm quality:gate`
