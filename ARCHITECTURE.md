# Architecture

## System context

The repository is a pnpm/Turborepo monorepo with two Next.js applications and seven shared packages. There is no separate API service: server-side workflows are implemented through Next.js Route Handlers and shared server modules.

```text
Browser
  ├─ apps/web   ── public, adopter and villager experiences + /api/v1
  └─ apps/admin ── operator experience + authenticated admin proxy
                         │
                         ▼
  contracts · database · knowledge · prompts · simulation · ui · utils
                         │
                         ▼
            PostgreSQL / Redis / model providers
```

## Applications

### `apps/web`

- Locale-aware public pages for `zh-CN`, `en`, and `ja`.
- Adoption, fulfilment, interaction, booking, route, renovation, privacy, and villager flows.
- `/api/v1` Route Handlers provide the repository's HTTP boundary.
- Public fallback data keeps demonstration pages buildable when PostgreSQL is unavailable.

### `apps/admin`

- Operator views for assets, tasks, villagers, simulation, AI assistance, alerts, reports, and renovation.
- Browser sessions are HttpOnly and signed; the browser never receives the server-to-server admin token.
- The admin BFF proxies authorised requests to the Web API and normalises upstream responses.

## Shared packages

| Package | Responsibility |
| --- | --- |
| `@zouma/contracts` | Cross-application TypeScript DTOs and domain unions |
| `@zouma/database` | Prisma client, schema, migrations, seed data, Redis access |
| `@zouma/knowledge` | Local BM25 retrieval, role filters, PII cleaning, citation validation |
| `@zouma/prompts` | Versioned prompt templates and reviewed fallback responses |
| `@zouma/simulation` | Deterministic V0/V1 fulfilment-rule evaluation |
| `@zouma/ui` | Small shared React/Next.js component layer |
| `@zouma/utils` | Model adapter, scoring, control, renovation, and timeout utilities |

Dependencies flow from applications toward packages. Packages must not import application code.

## Data flows

### Adoption fulfilment

1. A user adopts a tree through the Web application.
2. Route Handlers validate the request and persist domain records through Prisma.
3. Fulfilment tasks are accepted, performed, submitted, reviewed, and settled.
4. Timelines, notifications, benefits, harvest bookings, and operator reports read the same records.

### Knowledge query

1. The API authenticates an operator or villager and applies rate limits.
2. The question is length-checked, sanitised, and filtered by role.
3. Local BM25 retrieval selects permitted chunks.
4. The answerer validates document metadata and verbatim citations; unsafe or insufficient evidence returns a controlled refusal.

### Rule simulation

1. A seed and scenario generate one immutable world.
2. V0 and V1 run against that same world and preserve the same `worldHash`.
3. Thirteen metrics and traceable Bad Cases are compared against explicit upgrade gates.
4. Eleven export artifacts retain provenance and the simulation disclaimer.

Simulation records are isolated from real users, payments, orders, and reports.

## Reliability and security

- Database-unavailable public pages use reviewed demo fallbacks; privileged mutations do not silently pretend to succeed.
- Model calls use the shared provider adapter and fixed fallbacks rather than direct browser access.
- Exact coordinates, phone numbers, payment identifiers, and user identities must not enter external model prompts.
- Admin login, villager OTP, upload validation, API authentication, and rate limits remain server-side.
- Secrets belong in local/deployment environments and never in tracked files.

See `.codex/execution-rules.md` for implementation constraints and `docs/tech/database-schema.md` for the data model.
