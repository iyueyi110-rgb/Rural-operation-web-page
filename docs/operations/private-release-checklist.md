# 私有项目发布检查清单

这是交付前的人工清单，不会自动修改 GitHub 远程设置。

## GitHub About 文案

> 面向乡村文旅的认养履约与权益管理系统：覆盖认养、村民任务、审核、权益履约和异常处置，并提供确定性规则模拟与可追溯评测证据。

## Topics 建议

`rural-tourism`、`adoption-fulfillment`、`operations-platform`、`nextjs`、`prisma`、`simulation`、`knowledge-assistant`

## Social Preview 上传

1. 打开仓库 Settings → General → Social preview。
2. 上传仓库内的 [Social Preview](../assets/social-preview.png)（1200×630）。
3. 保存后用仓库首页和分享链接检查裁切、中文字体和免责声明是否清晰。

## 交付前复核

- 确认仓库保持 Private，成员权限按最小必要原则配置。
- 确认 `.env.local`、密钥、运行产物、Notebook `.venv`、缓存和原始截图均未被跟踪。
- 确认不添加 `LICENSE`、`CODE_OF_CONDUCT` 或开源 package 元数据；许可证选择留待权属确认后单独决策。
- 确认 README 中的 CI、文档检查和模拟回归 badge 已对应实际 workflow。

