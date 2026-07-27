# 仓库重构历史快速说明

> 历史材料，以当前代码、测试和最新报告为准。

本文件曾用于启动仓库重构。原有步骤已执行、调整或失效，当前不应照抄运行。

## 当前阅读顺序

1. 阅读根目录 [`README.md`](../../README.md)，确认产品价值与人机分工。
2. 阅读 [`docs/portfolio/README.md`](../../docs/portfolio/README.md)，核对招聘主张和复现路径。
3. 阅读 [`.codex/execution-rules.md`](../execution-rules.md)，确认工程、隐私和模拟边界。
4. 运行 `pnpm quality:gate` 获取当前质量证据。

## 当前提交规则

使用 Conventional Commits，类型与 scope 保留标准英文，主题使用中文。例如：

```text
docs: 重写作品集首页并补充人机协作边界
chore(docs): 增加中文文档检查
```

## 当前远端原则

- 不强制推送，不改写既有提交 SHA。
- Demo 未通过多网络验活前，不写入 README、About 或 Website。
- Tag 与 Release 只在作品集变更合并到 `main` 后创建。

> 模拟运营数据，不代表真实业务结果。
