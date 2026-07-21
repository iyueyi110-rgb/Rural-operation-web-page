# Codex 项目手册

本目录集中存放面向编码助手的执行规则、工作流和历史计划。仓库事实以代码、测试和最新报告为准。

## 开始工作

1. 阅读根目录 `AGENTS.md` 和本目录的 `execution-rules.md`。
2. 用 `git status --short --branch` 确认分支和用户现有改动。
3. 查阅 `docs/README.md` 找到对应产品、技术或模拟文档。
4. 完成改动后运行 `pnpm quality:gate`；该命令建立前按 `AGENTS.md` 中的命令逐项运行。

## 工作流

- 功能与修复：先定位合约和现有测试，再修改实现并补回归测试。
- 文档：先核验代码事实，更新所有相对链接，不复制已过期结论。
- 重构：文件移动和内容改写分开提交，保持每个提交可审查。
- 模拟分析：产物留在忽略目录，只提交带口径和免责声明的结论。

## 索引

- `execution-rules.md`：当前工程与安全规则。
- `git-workflow.md`：分支、提交和 PR 约定。
- `package-manager-guide.md`：pnpm/Turborepo 使用指南。
- `cleanup-workflow.md`：历史清理工作流，仅作参考。
- `github-description-guide.md`：GitHub 展示文案与人工设置指南。
- `plans/`：仓库重构和产品经理执行计划归档。
- `memory/`：允许提交的长期项目记忆；不得存放凭证或个人信息。

## 保护边界

- `output/` 属于用户现有未跟踪资产，不纳入自动化提交。
- `outputs/simulation/`、Notebook 环境、构建缓存和日志均为运行产物。
- GitHub Settings、部署平台和真实外部服务需要单独授权。
