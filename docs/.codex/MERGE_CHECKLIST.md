# 合并前检查清单

在将 `codex/restructure-05-evidence` 合并到 `main` 前，确认：

## 代码质量

- [x] `pnpm install --frozen-lockfile` 通过
- [x] `pnpm type-check` 通过
- [x] `pnpm test` 通过
- [x] `pnpm build` 通过
- [x] `pnpm docs:check` 通过
- [x] `git diff --check` 通过

## 文档完整性

- [x] 所有 Package/App 有 README（7 个 Package + 2 个 App）
- [x] 根级核心文档存在（ARCHITECTURE、CONTRIBUTING、CHANGELOG）
- [x] `docs/` 分层清晰（product/tech/simulation/operations）
- [x] `.codex/` 目录完整（plans/memory/工具指南）
- [x] 收尾文档存在（`docs/.codex/`）

## 数据验证

- [x] 40 组回归证据完整
- [x] 简历材料可用（文案 + 话术）
- [x] 所有数字可追溯（CSV/JSON/Notebook）
- [x] 模拟数据免责声明到位

## 安全合规

- [x] 无已知密钥、令牌或未脱敏手机号泄漏
- [x] `.env.example` 只含占位值或本地连接示例
- [x] `SECURITY.md` 存在
- [x] 私有授权边界清晰

## Git 状态

- [x] Working tree clean（最终提交前复核）
- [x] 无意外的未跟踪文件（用户原有 `output/` 保持忽略）
- [x] 本轮 commit 使用 Conventional Commits
- [x] 无用户原有 `output/` 被本轮提交

## 后续手动任务

- [x] GitHub Settings 文案已准备（见 `GITHUB_SETTINGS.md`）
- [x] CI Badge 添加和首次 workflow 验证步骤已记录
- [x] 截图补充任务已列入待办

---

**检查通过标准**：所有代码质量和文档完整性项目打勾；远程 GitHub 设置仍需仓库维护者手动执行。

## 合并命令

检查通过后，由维护者在具备远程权限的环境执行：

```bash
git checkout main
git pull origin main
git merge --no-ff codex/restructure-05-evidence -m "feat: complete repository restructure and project showcase"
git push origin main
```

本次任务不会自动切换、合并或推送远程分支。

