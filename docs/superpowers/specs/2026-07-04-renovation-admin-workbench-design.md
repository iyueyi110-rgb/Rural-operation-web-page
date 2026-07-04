# Space Renovation Admin Workbench Design

## Goal

Move the building and spatial renovation experience out of the public web frontend and into the admin backend as an operations workbench. The backend interface should help operators review renovation diagnostics, compare intervention types, inspect strategy status, and understand the spatial relationship between nodes through a clear renovation diagram.

## Confirmed Decisions

- Use layout option A: an admin workbench with stats, filters, a strategy table, and a spatial renovation diagram.
- Remove the public frontend renovation page. The renovation module should live in the admin backend only.
- Keep the existing backend service/API chain as the source of truth.
- Use the existing admin design system and page shell patterns.
- Add a schematic spatial diagram, not a heavy GIS map in this phase.

## Scope

### In Scope

- Delete the public route at `apps/web/src/app/[locale]/renovation`.
- Remove or stop using frontend-only renovation demo page wiring.
- Keep reusable demo/fallback data only if it is consumed by admin fallback behavior.
- Enhance `apps/admin/src/app/(renovation)/renovation/page.tsx` into the primary renovation workbench.
- Add an admin-only renovation diagram component.
- Allow diagram nodes to visually encode realm, intervention type, priority, and status.
- Allow clicking a diagram node to filter or highlight related rows in the strategy table.
- Add a compact single-strategy diagram to the admin detail page.
- Keep all data loading through existing backend API routes under `/api/v1/renovation/*`.

### Out of Scope

- Full GIS map overlay.
- Drawing or editing renovation geometry.
- Uploading CAD, BIM, or EnergyPlus model files.
- New AI provider integration.
- Public visitor-facing renovation explanation page.

## Admin Workbench Layout

The `/renovation` admin page should become a dense operational screen:

1. Header: title, description, and optional refresh action.
2. Stat cards: total strategies, critical strategies, active strategies, completed strategies.
3. Diagram and list area:
   - On desktop, show the strategy table and renovation diagram in a two-column layout.
   - On smaller screens, stack the diagram above the table.
   - The diagram should stay compact and scan-friendly, not hero-sized.
4. Filters:
   - Intervention type.
   - Priority.
   - Status.
   - Realm or spatial node if data is available.

The diagram should present four realm bands or clusters: ancient road, lychee field, resilience valley, and ridge dwelling. Each node appears as a stable marker with:

- Node label.
- Intervention type color.
- Priority emphasis.
- Status indicator.
- Optional count of related strategies.

## Diagram Semantics

Use a simple schematic rather than exact map coordinates:

- Existing building retained or renovated: solid marker.
- Partial demolition and rebuild: split marker.
- Full demolition and rebuild: warning marker.
- New construction or site potential: outlined marker.
- Landscape or ecological intervention: leaf/accent marker.

Connections should communicate the backend logic:

`space node -> diagnosis -> intervention strategy -> expected impact`

This can be shown through a legend, lightweight arrows, and an active-node summary panel.

## Detail Page

The admin strategy detail page should keep existing sections for diagnosis, description, materials, techniques, energy construction, ecological measures, architectural form, building program, and expected impact.

Add a compact single-strategy schematic near the top:

- Current node state.
- Intervention type.
- Old/new relationship.
- Expected impact.

This detail schematic should reuse the same visual language as the workbench diagram.

## Data Flow

Primary data source:

- `GET /api/v1/renovation/strategies`
- `GET /api/v1/renovation/strategies/[id]`

The admin frontend should map strategy rows into diagram nodes locally. If multiple strategies belong to one node, aggregate them by node id and expose counts and highest priority.

Fallback behavior:

- If the API returns an empty or degraded response, the workbench should still render an empty diagram state and a readable table empty state.
- Admin fallback may use deterministic demo data only if needed for visual continuity, but it must be clearly labeled as demo/degraded.

## Frontend Route Removal

Remove the public page:

- `apps/web/src/app/[locale]/renovation/page.tsx`

Also remove public-only supporting data if it has no admin use:

- `apps/web/src/lib/renovation-demo-data.ts`

Before deleting shared demo data, verify no admin or API fallback imports it. If admin still needs demo fallback, move the data into an admin-local helper instead of keeping it in `apps/web`.

## Error Handling

- API failure: show `AdminNotice` and keep the workbench shell visible.
- Empty data: show empty diagram and table states.
- Missing node metadata: show node id and a neutral marker.
- Unknown intervention type: map to a neutral "other" style and preserve the raw label in metadata.

## Testing

- `pnpm --filter @zouma/admin type-check`
- `pnpm --filter @zouma/web type-check`
- `pnpm type-check`
- Browser check:
  - `/renovation` renders the workbench and diagram.
  - `/renovation/[id]` renders the detail schematic.
  - `/zh-CN/renovation` no longer exists as a public page.

## Implementation Notes

- Prefer a reusable admin component such as `RenovationSpatialDiagram`.
- Use existing admin components: `AdminPageShell`, `AdminPanel`, `AdminStatCard`, and `AdminDataTable`.
- Use `lucide-react` icons where useful.
- Keep the diagram CSS-based or SVG-based inside React. Do not add new rendering libraries.
- Keep cards and panels compact; this is an operations screen, not a marketing page.
