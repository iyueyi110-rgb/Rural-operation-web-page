# Codex 项目整理执行指令

> 生成日期：2026-07-15｜目标分支：`website-expression-polish`｜版本：v3（按仓库实况修订）

## 目标与边界

本指令完成四件事：把本地归档与临时产物移出 Git、同步最新 `origin/main`、验证项目质量、将目标分支单次推送到远程。

明确不做：不自动处理业务代码冲突，不修复与清理无关的测试失败，不删除远程分支，不删除根目录的 macOS 启动快捷方式，不改写已经发布到远程的提交。

## 审查结论

旧版指令不能直接执行，主要问题如下：

- `git merge --no-commit --no-ff main` 不是只读预览，会修改索引和工作区并可能留下未完成的合并。
- 自动执行 `git stash -u` 会隐藏用户文件，旧流程也没有恢复 stash 的步骤。
- 在清理前先推送，会先发布尚未整理好的提交，违背“归档不进入远程当前树”的目标。
- 按目录统一选择 `ours` 或 `theirs` 可能静默覆盖有效代码；冲突必须逐文件人工判断。
- `git reset --hard HEAD~1` 可能删除错误的提交；合并失败应优先 `git merge --abort`。
- `_aigc-archive/`、`docs/codex-*.md`、`tmp/` 和 `.playwright-cli/` 实际已经被最新本地提交跟踪，并非未跟踪文件。
- `tmp/simulation-launcher/` 的删除在旧版中并未真正受进程检查保护。
- 当前新增对象中没有 ≥50 MB 的远程独占 blob；风险重点是仓库内容边界和长期维护，而不是断言此次推送必然触发 GitHub 100 MB 限制。

## 全局安全规则

1. 每个阶段失败立即停止，不继续执行后续命令。
2. 工作区出现未知改动时停止；禁止自动 stash、自动覆盖或自动删除。
3. 只允许普通 push，禁止 `--force` 和 `--force-with-lease`。
4. 合并冲突时执行 `git merge --abort`，记录冲突文件后暂停，不自动选择任一侧。
5. `_aigc-archive/` 仅保留在本机；外部备份不属于本次操作。

## Phase 0：只读预检

```bash
test "$(git branch --show-current)" = "website-expression-polish"
git status --short --branch
git remote get-url origin
git ls-remote --heads origin main website-expression-polish
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
pgrep -fl 'start-adoption-simulation-macos|@zouma/simulation|turbo dev|next dev'
```

预期：位于目标分支；除本次指令和计划外没有未知改动；开发与模拟服务均未运行。端口或进程检查无输出属于正常结果。

记录基线：

```bash
git rev-parse HEAD
git rev-list --left-right --count origin/website-expression-polish...HEAD
git rev-list --left-right --count origin/main...main
```

当前已知基线：目标分支领先远程 29 个提交；本地 `main` 落后 `origin/main` 22 个提交。

## Phase 1：建立本地安全点

```bash
git branch codex/pre-cleanup-backup-20260715 HEAD
git show --no-patch --oneline codex/pre-cleanup-backup-20260715
```

该分支只保留在本地，不得推送。它用于恢复清理前的最新提交以及被移除的临时文件。

## Phase 2：推送前整理最新本地提交

### 2.1 忽略规则

在 `.gitignore` 中加入：

```gitignore
_aigc-archive/
.playwright-cli/
tmp/image-prompts/
tmp/pdfs/
tmp/*.png
```

保留现有的 `tmp/simulation-store/`、`tmp/simulation-launcher/` 与 `outputs/simulation/` 规则。

### 2.2 归档与清理

- 将以下五份历史计划移动到 `_aigc-archive/codex-plans/`：
  - `docs/codex-admin-degradation-plan.md`
  - `docs/codex-demo-login-degradation-plan.md`
  - `docs/codex-renovation-demo-seed.md`
  - `docs/codex-renovation-supplement.md`
  - `docs/codex-renovation-system-execution-plan.md`
- 将 `tmp/image-prompts/` 移到 `_aigc-archive/tmp-archive/`。
- 若模拟进程未运行，将 `tmp/simulation-launcher/` 日志移到 `_aigc-archive/tmp-archive/`。
- 删除 `tmp/pdfs/`、两个 `tmp/*.png` 诊断文件、`.playwright-cli/` 和除 `node_modules/`、`.git/` 外的 `.DS_Store`。
- 保留 `outputs/`；当前没有需要删除的单数 `output/`。
- 保留根目录 `走马村云脑系统.command`；虽然它与 `scripts/` 中版本相同，但可能是用户的双击入口。

### 2.3 从 Git 索引移除本地归档并修订提交

```bash
git rm -r --cached _aigc-archive
git add .gitignore
git add -u
git diff --cached --check
git diff --cached --stat
git commit --amend --no-edit
```

修订后验证：

```bash
test -z "$(git ls-files _aigc-archive)"
test -z "$(git ls-files .playwright-cli tmp docs/codex-\*.md)"
git check-ignore _aigc-archive .playwright-cli tmp/pdfs tmp/image-prompts
git status --short
```

注意：这里只修订尚未推送的最新提交；安全分支保存原 SHA。指令文件和实施计划另建文档提交，不混入 `整理` 提交。

## Phase 3：提交优化后的文档

```bash
git add CODEX_CLEANUP_INSTRUCTIONS.md docs/superpowers/plans/2026-07-15-project-cleanup.md
git diff --cached --check
git commit -m "docs: harden project cleanup workflow"
```

## Phase 4：同步与合并

```bash
git fetch --prune origin
git switch main
git merge --ff-only origin/main
git switch website-expression-polish
git merge --no-ff --no-edit origin/main
```

若最后一步产生冲突：

```bash
git diff --name-only --diff-filter=U
git merge --abort
```

随后停止执行并报告冲突，不推送。禁止使用目录级 `ours`/`theirs` 策略。

合并成功后验证：

```bash
git merge-base --is-ancestor origin/main HEAD
git diff --check origin/website-expression-polish...HEAD
```

## Phase 5：质量门禁

```bash
pnpm type-check
pnpm build
pnpm -r --if-present test
```

已记录的执行前基线：

- `pnpm type-check`：通过。
- `pnpm build`：通过；无本地数据库时会打印降级日志，但退出码为 0。
- 测试：Simulation 60/60、Utils 8/8 通过；Web 96/97 通过。
- 唯一既有失败：`apps/web/src/lib/home-route-contract.test.ts` 中 `supports button, wheel, keyboard and touch page navigation`，缺少 `zouma:home-deck-next` 契约字符串。

本次验收允许该已知失败保持不变，但不得出现新的失败。若类型检查、构建失败，或测试失败数量/名称变化，立即停止且不推送。

## Phase 6：单次推送与远程验证

推送前确认没有异常大新增对象：

```bash
git rev-list --objects origin/website-expression-polish..HEAD |
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
  awk '$1=="blob" && $3>=50000000 {printf "%.1f MB\t%s\n", $3/1048576, $4}'
```

预期无输出。随后只推送目标分支：

```bash
git push -u origin website-expression-polish
```

验证远程 SHA：

```bash
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git ls-remote origin refs/heads/website-expression-polish | awk '{print $1}')
test "$LOCAL" = "$REMOTE"
git status --short --branch
```

最后仅清理已合并的本地旧分支：

```bash
git merge-base --is-ancestor feature/phase-a-optimization origin/main
git branch -d feature/phase-a-optimization
```

不删除远程 `feature/phase-a-optimization`，也不处理 `lizhi-renling` 与 `gudaoshushi`。

## 回滚规则

- 合并未完成：`git merge --abort`。
- 推送前需要恢复：从 `codex/pre-cleanup-backup-20260715` 检出或恢复所需文件；不要使用模糊的 `HEAD~1`。
- 推送后需要撤销：创建显式 revert 提交并正常推送；禁止强推覆盖远程历史。

## 验收标准

- [ ] `_aigc-archive/` 保留在本地、被忽略且不在目标分支当前树中。
- [ ] 临时 PDF、诊断图片、Playwright 日志和 `.DS_Store` 已清理。
- [ ] 五份历史 Codex 计划已移入本地归档。
- [ ] `main` 与 `origin/main` 一致，目标分支包含 `origin/main`。
- [ ] 类型检查和构建通过，测试没有新增失败。
- [ ] 目标分支只进行一次普通 push，远程 SHA 与本地 HEAD 一致。
- [ ] 本地 `feature/phase-a-optimization` 已安全删除；其他本地/远程功能分支未动。
- [ ] `codex/pre-cleanup-backup-20260715` 保留在本地供人工确认后再删除。
