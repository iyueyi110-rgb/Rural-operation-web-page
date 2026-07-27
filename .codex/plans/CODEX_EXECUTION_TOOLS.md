# Codex 历史执行工具说明

> 历史材料，以当前代码、测试和最新报告为准。

原文件记录过一次仓库重构所使用的命令、审查步骤和人工操作说明。为避免过期命令与当前规则冲突，现保留用途摘要。

## 工具用途

- 用 `git` 检查分支、差异和提交范围。
- 用 `pnpm` 执行类型检查、测试、文档检查和构建。
- 用仓库脚本运行确定性模拟与质量门。
- 用 GitHub 页面或授权工具完成 About、Topics、PR、Tag 和 Release 等远端操作。

## 当前有效命令

```bash
pnpm type-check
pnpm test
pnpm docs:check
pnpm build
git diff --check
pnpm quality:gate
```

模拟相关变更还需运行：

```bash
pnpm --filter @zouma/simulation test
pnpm simulation:run --seed 20260713 --scenario NORMAL
pnpm simulation:regression
```

## 安全与证据边界

- 不提交凭证、个人信息、本地数据库、缓存或被忽略的模拟原始产物。
- 未经授权不改写历史、不强制推送、不修改生产环境。
- 远端状态必须从 GitHub 实际页面复核，不能用历史报告替代。
- 模拟结论必须保留固定免责声明。

> 模拟运营数据，不代表真实业务结果。
