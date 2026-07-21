# Contributing

This repository is currently privately licensed. A contribution does not grant a right to redistribute or commercially use the project.

## Setup

Requirements: Node.js 20+, pnpm 11.6, and Docker Desktop when testing PostgreSQL/Redis flows.

```bash
pnpm install --frozen-lockfile
pnpm --filter @zouma/database db:generate
pnpm dev
```

Copy `.env.example` to `.env.local` only for local use. Never commit the resulting file.

## Branch and commit conventions

- Branches: `codex/<task>`, `feature/<task>`, `fix/<task>`, `docs/<task>`.
- Commits: Conventional Commits such as `feat(web): ...`, `fix(admin): ...`, `docs: ...`.
- Keep moves separate from content edits and avoid unrelated formatting churn.

## Pull requests

Describe the user-visible outcome, affected areas, verification commands, screenshots for UI work, and any data/privacy impact. Update contracts and documentation when changing public behaviour.

Before requesting review:

```bash
pnpm quality:gate
git diff --check
```

For simulation changes, include a fixed-seed smoke run and confirm paired `worldHash` equality. For database changes, add a new migration; never rewrite an existing migration.

## Safety boundaries

- Use sandbox or demo payment flows only.
- Do not upload production data, personal information, exact coordinates, or credentials.
- Do not present simulated findings as real-world outcomes.
- Do not change GitHub Settings, deployment secrets, or production services from a code contribution.

Detailed rules are in [`.codex/execution-rules.md`](.codex/execution-rules.md).
