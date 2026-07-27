# 贡献指南

本仓库公开可见但未授予开源许可。提交贡献不代表获得再分发或商业使用项目的权利。

## 环境准备

需要 Node.js 20+、pnpm 11.6；测试 PostgreSQL/Redis 流程时还需要 Docker Desktop。

```bash
pnpm install --frozen-lockfile
pnpm --filter @zouma/database db:generate
pnpm dev
```

只为本地使用时，将 `.env.example` 复制为 `.env.local`；不要提交复制后的文件。

## 分支与提交规范

- 分支：`codex/<task>`、`feature/<task>`、`fix/<task>`、`docs/<task>`。
- 提交使用 Conventional Commits，类型和作用域保留英文，主题使用中文，例如：

```text
feat(web): 新增认养续期流程
fix(admin): 保留上游响应编码
docs: 说明模拟证据边界
```

- 文件移动与内容修改分开提交，避免无关格式变化。
- 不改写共享历史，不使用强制推送。

## 拉取请求

PR 标题和说明使用中文，并包含：

- 用户可见结果与改动原因；
- 影响范围；
- 验证命令；
- UI 改动截图；
- 数据和隐私影响；
- 回滚方式。

请求审阅前运行：

```bash
pnpm quality:gate
git diff --check
```

模拟改动还需包含固定种子冒烟运行，并确认成对 `worldHash` 一致。数据库改动必须新增迁移，不能改写已发布迁移。

## 安全边界

- 只使用沙箱或演示支付流程。
- 不上传生产数据、个人信息、精确坐标或凭证。
- 不把模拟发现描述为真实业务结果。
- 代码贡献不得擅自修改 GitHub Settings、部署密钥或生产服务。

详细规则见 [Codex 执行规则](.codex/execution-rules.md)。
