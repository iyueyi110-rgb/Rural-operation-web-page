# Project Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely remove local-only archives and temporary artifacts from the unpublished branch tip, merge the latest `origin/main`, validate the monorepo, and push `website-expression-polish` once without force.

**Architecture:** Treat cleanup as a guarded transaction. Preserve the original unpublished tip on a local safety branch, amend only that tip to remove local-only files from the Git tree, commit the hardened runbook separately, merge the remote mainline, then publish only after fresh quality and remote-state checks.

**Tech Stack:** Git, zsh/macOS process checks, pnpm 11, Turborepo, TypeScript, Next.js.

## Global Constraints

- Work in `/Users/limyoon/Desktop/aigc` on `website-expression-polish`.
- Do not auto-stash, force-push, delete remote branches, or resolve merge conflicts automatically.
- Keep `_aigc-archive/` on local disk and out of the target branch tree.
- Preserve `outputs/`, `走马村云脑系统.command`, `lizhi-renling`, and `gudaoshushi`.
- Baseline tests have two known unrelated contract failures (one Web and one Admin); no additional failure is allowed.

---

### Task 1: Harden the cleanup documentation

**Files:**
- Modify: `CODEX_CLEANUP_INSTRUCTIONS.md`
- Create: `docs/superpowers/plans/2026-07-15-project-cleanup.md`

- [ ] Replace the unsafe merge preview, automatic stash, blanket conflict strategy, and hard reset instructions with guarded stop conditions.
- [ ] Record the verified repository facts, baseline checks, rollback rules, single-push policy, and explicit exclusions.
- [ ] Run `git diff --no-index /dev/null CODEX_CLEANUP_INSTRUCTIONS.md` and review the complete runbook.

### Task 2: Preserve and amend the unpublished cleanup tip

**Files:**
- Modify: `.gitignore`
- Remove from Git tracking: `_aigc-archive/`, `.playwright-cli/`, `tmp/`, `docs/codex-*.md`
- Preserve locally: `_aigc-archive/`

- [ ] Verify the target branch, known working-tree changes, remote refs, and absence of development/simulation processes.
- [ ] Create `codex/pre-cleanup-backup-20260715` at the original `HEAD` and verify its SHA.
- [ ] Add ignore rules for the archive, Playwright state, PDF/image-prompt temp folders, and diagnostic PNGs.
- [ ] Move the five explicit historical Codex plans and reusable image prompt into `_aigc-archive/`; archive inactive simulation logs.
- [ ] Delete disposable PDF extractions, diagnostic PNGs, Playwright logs, and non-dependency `.DS_Store` files.
- [ ] Remove `_aigc-archive/` and the cleaned tracked artifacts from the index, run staged diff checks, and amend the unpublished `整理` commit without changing its message.
- [ ] Verify no archive/temp paths remain tracked and all intended local archive paths are ignored.

### Task 3: Commit the reviewed runbook

**Files:**
- Add: `CODEX_CLEANUP_INSTRUCTIONS.md`
- Add: `docs/superpowers/plans/2026-07-15-project-cleanup.md`

- [ ] Stage only the two documentation files.
- [ ] Run `git diff --cached --check` and inspect `git diff --cached --stat`.
- [ ] Commit as `docs: harden project cleanup workflow`.

### Task 4: Synchronize and validate the branch

**Interfaces:**
- Consumes: `origin/main`, `origin/website-expression-polish`
- Produces: a tested merge commit on `website-expression-polish`

- [ ] Fetch and prune `origin`, fast-forward local `main` to `origin/main`, and return to the target branch.
- [ ] Merge `origin/main` with `--no-ff --no-edit`; on conflict list unmerged files, abort, and stop.
- [ ] Verify `origin/main` is an ancestor of `HEAD` and the branch diff has no whitespace errors introduced by the merge.
- [ ] Run `pnpm type-check`; require exit 0.
- [ ] Run `pnpm build`; require exit 0.
- [ ] Run `pnpm -r --if-present test` plus the Admin test command separately when recursive execution stops at Web; require the failure names to match the recorded Web and Admin contract baseline exactly.

### Task 5: Publish once and close out

- [ ] Confirm no new remote-exclusive blob is 50 MB or larger and review the final commit range/status.
- [ ] Push `website-expression-polish` once with no force option.
- [ ] Compare local `HEAD` with `git ls-remote` for the target branch; require exact equality.
- [ ] Delete only the merged local `feature/phase-a-optimization` branch after an ancestry check.
- [ ] Verify a clean worktree, local `main == origin/main`, target contains `origin/main`, ignored archive remains present, and the safety branch still points to the original tip.
