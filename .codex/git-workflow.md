# Git 工作流

## 分支

- Codex 自动任务使用 `codex/<task>`。
- 人工功能分支使用 `feature/<task>`，修复使用 `fix/<task>`，文档使用 `docs/<task>`。
- 每个分支只解决一个可审查目标，并从最新目标分支创建。

## 提交

提交遵循 Conventional Commits；类型与 scope 使用标准英文，主题使用中文：

```text
feat(web): 增加认养续期流程
fix(admin): 保留上游响应编码
docs: 说明模拟证据边界
refactor(docs): 重组仓库文档
test(simulation): 覆盖调用方相对输出路径
chore(ci): 增加文档检查
```

- 文件移动使用 `git mv`，先提交纯移动，再修改内容。
- 按路径精确暂存，不用 `git add .` 混入用户未跟踪文件。
- 禁止提交 `.env.local`、`output/`、模拟产物、缓存、日志和本地数据库。
- 未经明确授权，不使用 `git reset --hard`、强制推送或共享历史改写。

## 拉取请求

PR 标题与说明使用中文，并包含目标、主要变更、测试证据、截图（涉及 UI 时）、数据/隐私影响和回滚方式。创建 PR 前运行：

```bash
pnpm quality:gate
git status --short
```

确认提交只包含目标文件，再推送 `codex/` 分支。合并方式由仓库维护者决定。
