# Repository Instructions

## Scope

These instructions apply to the entire repository.

## Working rules

- Use Node.js 20+ and `pnpm@11.6.0`; this is a pnpm/Turborepo monorepo.
- `apps/web` and `apps/admin` are Next.js 14 applications. Server APIs are Next.js Route Handlers; do not assume a separate NestJS service.
- Preserve user-owned and generated state. Never commit `.env.local`, `output/`, caches, local databases, or ignored simulation artifacts.
- Keep simulation claims explicitly labeled as simulated evidence: “模拟运营数据，不代表真实业务结果”.
- Do not change Prisma schema/migrations, HTTP contracts, or package exports unless the task explicitly requires it.
- Use `git mv` for tracked file moves and keep move-only commits separate from content edits.
- Use Conventional Commits and `codex/` branch names.

## Required checks

Run the checks relevant to the change, and run the full gate before handoff:

```bash
pnpm type-check
pnpm test
pnpm docs:check
pnpm build
git diff --check
```

For simulation changes, also run `pnpm --filter @zouma/simulation test` and a fixed-seed smoke run.

## Reference

Read `.codex/execution-rules.md` for the complete engineering, privacy, simulation, Git, and documentation rules. Use `.codex/README.md` as the project-specific Codex index.
