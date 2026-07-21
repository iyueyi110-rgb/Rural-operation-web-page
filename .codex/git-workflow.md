# Git 工作流

## 分支

- Codex 自动任务：`codex/<task>`。
- 人工功能：`feature/<task>`；修复：`fix/<task>`；文档：`docs/<task>`。
- 每个分支只解决一个可审查目标，从最新目标分支创建。

## 提交

使用 Conventional Commits：

```text
feat(web): add adoption renewal flow
fix(admin): preserve upstream response encoding
docs: explain simulation evidence boundary
refactor(docs): reorganize repository documentation
test(simulation): cover caller-relative output paths
chore(ci): add documentation checks
```

- 文件移动使用 `git mv`，先提交纯移动，再修改内容。
- 不用 `git add .` 暂存包含用户未跟踪文件的工作区；按路径精确暂存。
- 禁止提交 `.env.local`、`output/`、模拟产物、缓存、日志和本地数据库。
- 不使用 `git reset --hard`、强制推送或改写共享历史，除非用户明确授权。

## Pull request

PR 描述应包含：目标、主要变更、测试证据、截图（UI 变更）、数据/隐私影响、回滚方式。创建 PR 前运行：

```bash
pnpm quality:gate
git status --short
```

确认暂存和提交中只有目标文件，再推送 `codex/` 分支。合并方式由仓库维护者决定。
