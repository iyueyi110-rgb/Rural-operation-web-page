import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  ADMIN_SESSION_EXPIRED_EVENT,
  ADMIN_WRITE_LOGIN_MESSAGE,
  adminAccessReducer,
  adminWriteControlProps,
  useAdminAccess,
} from "../components/admin-access"
import {
  adminApiBase,
  fetchWithTimeout as fetchAdminWithTimeout,
} from "./admin-api"

function source(relativePath: string) {
  const url = new URL(relativePath, import.meta.url)
  return existsSync(url) ? readFileSync(url, "utf8") : ""
}

const accessSource = source("../components/admin-access.tsx")
const layoutSource = source("../app/layout.tsx")
const shellSource = source("../app/admin-shell.tsx")
const sidebarSource = source("../components/admin-sidebar.tsx")
const copySource = source("./admin-copy.ts")

interface ControlSurface {
  marker: string
  count?: number
}

interface SourceControlSurfaces {
  relativePath: string
  controls: ControlSurface[]
}

const protectedMutationSurfaces: SourceControlSurfaces[] = [
  {
    relativePath: "../components/active-alerts-panel.tsx",
    controls: [{ marker: "onClick={() => assign(alert)}" }],
  },
  {
    relativePath: "../components/recommendation-review-panel.tsx",
    controls: [
      { marker: 'onClick={() => review(item.id, "', count: 2 },
    ],
  },
  {
    relativePath: "../app/feedback-admin.tsx",
    controls: [{ marker: "onClick={() => updateStatus(status)}" }],
  },
  {
    relativePath: "../app/(assets-commerce)/activities/page.tsx",
    controls: [
      { marker: "onClick={createActivity}" },
      {
        marker: 'onClick={() => updateStatus(row.id, "cancelled")}',
      },
    ],
  },
  {
    relativePath: "../app/(assets-commerce)/harvest/page.tsx",
    controls: [
      { marker: "onClick={() => updateStatus(row.id,", count: 2 },
      { marker: "onClick={() => updateDestination(row,", count: 2 },
      { marker: "onClick={saveShipment}" },
    ],
  },
  {
    relativePath: "../app/(assets-commerce)/products/page.tsx",
    controls: [{ marker: "onClick={saveProduct}" }],
  },
  {
    relativePath: "../app/(assets-commerce)/trees/page.tsx",
    controls: [
      { marker: "void uploadGrowthPhoto(" },
      { marker: "onClick={saveTree}" },
      { marker: "onClick={addCareLog}" },
    ],
  },
  {
    relativePath: "../app/(ai-system)/ai-assistant/page.tsx",
    controls: [
      { marker: "onClick={() => transferToHuman(item)}" },
    ],
  },
  {
    relativePath: "../app/(ai-system)/devices/page.tsx",
    controls: [{ marker: "onClick={saveDevice}" }],
  },
  {
    relativePath: "../app/(ai-system)/infrastructure/page.tsx",
    controls: [
      { marker: "onClick={submitManualReading}" },
      { marker: "onClick={() => updateCommand(", count: 3 },
    ],
  },
  {
    relativePath: "../app/(command)/reports/page.tsx",
    controls: [{ marker: "onClick={generateReport}" }],
  },
  {
    relativePath: "../app/(field-ops)/alerts/page.tsx",
    controls: [
      { marker: "onClick={() => updateStatus(row.id,", count: 2 },
    ],
  },
  {
    relativePath: "../app/(village-work)/farming/page.tsx",
    controls: [{ marker: "onClick={saveFarming}" }],
  },
  {
    relativePath: "../app/(village-work)/tasks/page.tsx",
    controls: [
      { marker: "onClick={() => void reviewEvidence(", count: 2 },
      { marker: "onClick={() => saveTask(", count: 3 },
    ],
  },
  {
    relativePath: "../app/(village-work)/villagers/page.tsx",
    controls: [{ marker: "onClick={saveVillager}" }],
  },
  {
    relativePath: "../components/simulation/runs-panel.tsx",
    controls: [
      { marker: "onClick={onCreate}" },
      { marker: "onClick={() => onClone(run)}" },
      { marker: "onClick={() => onArchive(run)}" },
    ],
  },
  {
    relativePath: "../components/simulation/comparison-panel.tsx",
    controls: [{ marker: "onClick={onCompare}" }],
  },
  {
    relativePath: "../components/simulation/bad-cases-panel.tsx",
    controls: [{ marker: "onClick={() => onSave(item)}" }],
  },
]

const guestAndReadSurfaces: SourceControlSurfaces[] = [
  {
    relativePath: "../app/(ai-system)/ai-assistant/page.tsx",
    controls: [{ marker: "onClick={askQuestion}" }],
  },
  {
    relativePath: "../app/(ai-system)/infrastructure/page.tsx",
    controls: [
      { marker: "onClick={runDecision}" },
      { marker: "onClick={loadData}" },
    ],
  },
  {
    relativePath: "../app/(renovation)/renovation/page.tsx",
    controls: [{ marker: "onClick={runDiagnosis}" }],
  },
  {
    relativePath: "../app/(ai-system)/content-factory/page.tsx",
    controls: [{ marker: "onClick={generateContent}" }],
  },
  {
    relativePath: "../app/(assets-commerce)/activities/page.tsx",
    controls: [
      { marker: "onClick={() => setSelectedActivityId(row.id)}" },
    ],
  },
  {
    relativePath: "../app/(assets-commerce)/harvest/page.tsx",
    controls: [{ marker: "onClick={() => setSelectedId(row.id)}" }],
  },
  {
    relativePath: "../app/(field-ops)/alerts/page.tsx",
    controls: [{ marker: "setType(event.target.value)" }],
  },
  {
    relativePath: "../app/(village-work)/tasks/page.tsx",
    controls: [
      { marker: "setFilters({ ...filters, taskType: event.target.value })" },
      { marker: "onClick={loadData}" },
    ],
  },
  {
    relativePath: "../components/simulation/runs-panel.tsx",
    controls: [
      { marker: "onClick={onRefresh}" },
      { marker: "onClick={() => onOpen(run)}", count: 2 },
    ],
  },
  {
    relativePath: "../components/simulation/bad-cases-panel.tsx",
    controls: [{ marker: "onClick={onLoad}" }],
  },
  {
    relativePath: "../app/(village-work)/simulations/page.tsx",
    controls: [
      { marker: "onClick={() => exportArtifact(selectedArtifact)}" },
    ],
  },
]

interface OpeningTag {
  markerIndex: number
  source: string
}

function openingTagsContaining(fileSource: string, marker: string) {
  const tags: OpeningTag[] = []
  let markerIndex = fileSource.indexOf(marker)

  while (markerIndex !== -1) {
    const tagStart = fileSource.lastIndexOf("<", markerIndex)
    assert.notEqual(tagStart, -1, `missing JSX tag before ${marker}`)
    assert.match(
      fileSource.slice(tagStart, tagStart + 32),
      /^<[A-Za-z][\w.]*/,
      `marker is not inside a JSX opening tag: ${marker}`,
    )

    let braceDepth = 0
    let quote = ""
    let tagEnd = -1

    for (let index = tagStart + 1; index < fileSource.length; index += 1) {
      const character = fileSource[index]!
      const previous = fileSource[index - 1]

      if (quote) {
        if (character === quote && previous !== "\\") quote = ""
        continue
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character
        continue
      }
      if (character === "{") braceDepth += 1
      if (character === "}") braceDepth -= 1
      if (character === ">" && braceDepth === 0) {
        tagEnd = index + 1
        break
      }
    }

    assert.notEqual(tagEnd, -1, `unterminated JSX tag for ${marker}`)
    tags.push({
      markerIndex,
      source: fileSource.slice(tagStart, tagEnd),
    })
    markerIndex = fileSource.indexOf(marker, markerIndex + marker.length)
  }

  return tags
}

function nearestFieldsetAt(fileSource: string, markerIndex: number) {
  const stack: string[] = []
  const fieldsetTag = /<\/?fieldset\b[^>]*>/g
  let match = fieldsetTag.exec(fileSource)

  while (match && match.index < markerIndex) {
    if (match[0].startsWith("</")) {
      stack.pop()
    } else {
      stack.push(match[0])
    }
    match = fieldsetTag.exec(fileSource)
  }

  return stack.at(-1) ?? ""
}

function hasWriteGuard(fileSource: string, tag: OpeningTag) {
  return (
    tag.source.includes("adminWriteControlProps") ||
    nearestFieldsetAt(fileSource, tag.markerIndex).includes(
      "adminWriteControlProps",
    )
  )
}

function assertSurfaceGuarded(
  fileSource: string,
  relativePath: string,
  control: ControlSurface,
) {
  const tags = openingTagsContaining(fileSource, control.marker)
  assert.equal(
    tags.length,
    control.count ?? 1,
    `${relativePath}: ${control.marker}`,
  )
  for (const tag of tags) {
    assert.equal(
      hasWriteGuard(fileSource, tag),
      true,
      `${relativePath}: unguarded ${control.marker} in ${tag.source}`,
    )
  }
}

function assertSurfaceUnguarded(
  fileSource: string,
  relativePath: string,
  control: ControlSurface,
) {
  const tags = openingTagsContaining(fileSource, control.marker)
  assert.equal(
    tags.length,
    control.count ?? 1,
    `${relativePath}: ${control.marker}`,
  )
  for (const tag of tags) {
    assert.equal(
      hasWriteGuard(fileSource, tag),
      false,
      `${relativePath}: guest/read control is guarded: ${control.marker}`,
    )
  }
}

function onlyOpeningTag(fileSource: string, marker: string) {
  const tags = openingTagsContaining(fileSource, marker)
  assert.equal(tags.length, 1, marker)
  return tags[0]!.source
}

function AdminAccessDefaultProbe() {
  return createElement("span", null, String(useAdminAccess().canWrite))
}

test("the root layout derives only a boolean write capability from the HttpOnly session", () => {
  assert.match(layoutSource, /cookies\(\)/)
  assert.match(layoutSource, /verifyAdminSession/)
  const adminShellTag = layoutSource.match(/<AdminShell\b[^>]*>/)?.[0] ?? ""
  assert.equal(adminShellTag, "<AdminShell canWrite={canWrite}>")
  assert.doesNotMatch(
    adminShellTag,
    /\b\w*(?:session|secret|token|password)\w*\s*=/iu,
  )
})

test("the Admin access context defaults to read-only access", () => {
  assert.equal(
    renderToStaticMarkup(createElement(AdminAccessDefaultProbe)),
    "<span>false</span>",
  )
})

test("admin write control props disable guests and preserve explicit disabled state", () => {
  assert.deepEqual(adminWriteControlProps(false), {
    disabled: true,
    title: ADMIN_WRITE_LOGIN_MESSAGE,
  })
  assert.deepEqual(adminWriteControlProps(false, true), {
    disabled: true,
    title: ADMIN_WRITE_LOGIN_MESSAGE,
  })
  assert.deepEqual(adminWriteControlProps(true), { disabled: false })
  assert.deepEqual(adminWriteControlProps(true, true), { disabled: true })
})

test("an expired session fails closed and disables protected write controls", () => {
  const expired = adminAccessReducer(
    { canWrite: true, sessionExpired: false },
    { type: "session-expired" },
  )

  assert.deepEqual(expired, { canWrite: false, sessionExpired: true })
  assert.equal(adminWriteControlProps(expired.canWrite).disabled, true)
})

test("only a protected Admin API 401 publishes the session-expired event", async () => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  const eventTarget = new EventTarget()
  let expiredEvents = 0
  eventTarget.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, () => {
    expiredEvents += 1
  })

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: eventTarget,
  })
  globalThis.fetch = async () => Response.json(
    { error: "Unauthorized" },
    { status: 401 },
  )

  try {
    await fetchAdminWithTimeout(`${adminApiBase}/tasks`, { method: "POST" })
    assert.equal(expiredEvents, 1)

    await fetchAdminWithTimeout(`${adminApiBase}/tasks`)
    await fetchAdminWithTimeout(`${adminApiBase}/ai/query`, { method: "POST" })
    assert.equal(expiredEvents, 1)
  } finally {
    globalThis.fetch = originalFetch
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    })
  }
})

test("the Admin shell provides guest access state to client components", () => {
  assert.match(accessSource, /createContext/)
  assert.match(accessSource, /AdminAccessProvider/)
  assert.match(accessSource, /useAdminAccess/)
  assert.match(accessSource, /adminWriteControlProps/)
  assert.match(shellSource, /<AdminAccessProvider canWrite=\{canWrite\}>/)
  assert.match(accessSource, /addEventListener\(ADMIN_SESSION_EXPIRED_EVENT/)
  assert.match(accessSource, /dispatch\(\{ type: "session-expired" \}\)/)
})

test("the JSX guard locator rejects sibling and already-closed fieldset guards", () => {
  const guardedButton =
    '<button {...adminWriteControlProps(canWrite)} onClick={save}>保存</button>'
  const guardedFieldset =
    '<fieldset {...adminWriteControlProps(canWrite)}><button onClick={save}>保存</button></fieldset>'
  const siblingFieldset =
    '<button onClick={save}>保存</button><fieldset {...adminWriteControlProps(canWrite)}>表单</fieldset>'
  const closedFieldset =
    '<fieldset {...adminWriteControlProps(canWrite)}>表单</fieldset><button onClick={save}>保存</button>'

  assert.equal(
    hasWriteGuard(
      guardedButton,
      openingTagsContaining(guardedButton, "onClick={save}")[0]!,
    ),
    true,
  )
  assert.equal(
    hasWriteGuard(
      guardedFieldset,
      openingTagsContaining(guardedFieldset, "onClick={save}")[0]!,
    ),
    true,
  )
  assert.equal(
    hasWriteGuard(
      siblingFieldset,
      openingTagsContaining(siblingFieldset, "onClick={save}")[0]!,
    ),
    false,
  )
  assert.equal(
    hasWriteGuard(
      closedFieldset,
      openingTagsContaining(closedFieldset, "onClick={save}")[0]!,
    ),
    false,
  )
})

test("every protected mutation control has its own or nearest fieldset write guard", () => {
  for (const { relativePath, controls } of protectedMutationSurfaces) {
    const fileSource = source(relativePath)
    for (const control of controls) {
      assertSurfaceGuarded(fileSource, relativePath, control)
    }
  }
})

test("guest capabilities and read-only controls are outside protected fieldsets", () => {
  for (const { relativePath, controls } of guestAndReadSurfaces) {
    const fileSource = source(relativePath)
    for (const control of controls) {
      assertSurfaceUnguarded(fileSource, relativePath, control)
    }
  }
})

test("guest capability controls preserve their original business disabled conditions", () => {
  const aiAssistant = source("../app/(ai-system)/ai-assistant/page.tsx")
  const infrastructure = source("../app/(ai-system)/infrastructure/page.tsx")
  const renovation = source("../app/(renovation)/renovation/page.tsx")
  const contentFactory = source("../app/(ai-system)/content-factory/page.tsx")

  assert.match(
    onlyOpeningTag(aiAssistant, "onClick={askQuestion}"),
    /disabled=\{isAsking \|\| !question\.trim\(\)\}/,
  )
  assert.match(
    onlyOpeningTag(infrastructure, "onClick={runDecision}"),
    /disabled=\{isDeciding\}/,
  )
  assert.match(
    onlyOpeningTag(renovation, "onClick={runDiagnosis}"),
    /disabled=\{isGenerating\}/,
  )
  assert.match(
    onlyOpeningTag(contentFactory, "onClick={generateContent}"),
    /disabled=\{isGenerating\}/,
  )
})

test("write guards merge representative pre-existing disabled conditions", () => {
  const activeAlerts = source("../components/active-alerts-panel.tsx")
  const recommendations = source(
    "../components/recommendation-review-panel.tsx",
  )
  const feedback = source("../app/feedback-admin.tsx")
  const harvest = source("../app/(assets-commerce)/harvest/page.tsx")
  const trees = source("../app/(assets-commerce)/trees/page.tsx")
  const reports = source("../app/(command)/reports/page.tsx")
  const aiAssistant = source("../app/(ai-system)/ai-assistant/page.tsx")
  const runs = source("../components/simulation/runs-panel.tsx")
  const badCases = source("../components/simulation/bad-cases-panel.tsx")

  assert.match(
    onlyOpeningTag(activeAlerts, "onClick={() => assign(alert)}"),
    /adminWriteControlProps\(\s*canWrite,\s*busyId === alert\.id \|\| assigned,\s*\)/,
  )
  for (const tag of openingTagsContaining(
    recommendations,
    'onClick={() => review(item.id, "',
  )) {
    assert.match(
      tag.source,
      /adminWriteControlProps\(canWrite, busyId === item\.id\)/,
    )
  }
  assert.match(
    onlyOpeningTag(feedback, "onClick={() => updateStatus(status)}"),
    /adminWriteControlProps\(\s*canWrite,\s*updatingStatus !== "" \|\| selectedRecord\.status === status,\s*\)/,
  )
  assert.match(
    onlyOpeningTag(harvest, "onClick={saveShipment}"),
    /adminWriteControlProps\(canWrite, !selectedRow\)/,
  )
  assert.match(
    onlyOpeningTag(trees, "void uploadGrowthPhoto("),
    /adminWriteControlProps\(canWrite, isUploading\)/,
  )
  assert.match(
    onlyOpeningTag(trees, "onClick={saveTree}"),
    /adminWriteControlProps\(canWrite, isUploading\)/,
  )
  assert.match(
    onlyOpeningTag(reports, "onClick={generateReport}"),
    /adminWriteControlProps\(canWrite, isGenerating\)/,
  )
  assert.match(
    onlyOpeningTag(aiAssistant, "onClick={() => transferToHuman(item)}"),
    /adminWriteControlProps\(\s*canWrite,\s*transferredIds\.has\(item\.id\),\s*\)/,
  )
  assert.match(
    onlyOpeningTag(runs, "onClick={onCreate}"),
    /adminWriteControlProps\(canWrite, busyAction === "create"\)/,
  )
  assert.match(
    onlyOpeningTag(badCases, "onClick={() => onSave(item)}"),
    /adminWriteControlProps\(\s*canWrite,\s*busyAction === `bad-case:\$\{item\.id\}`,\s*\)/,
  )
})

test("the sidebar distinguishes guest and administrator modes", () => {
  assert.match(copySource, /guestMode: "访客模式"/)
  assert.match(copySource, /adminMode: "管理员模式"/)
  assert.match(
    sidebarSource,
    /const \{ canWrite, sessionExpired \} = useAdminAccess\(\)/,
  )
  assert.match(
    sidebarSource,
    /sessionExpired[\s\S]*adminCopy\.shell\.sessionExpired/,
  )
  assert.match(
    sidebarSource.slice(sidebarSource.indexOf("!canWrite ? ("), sidebarSource.indexOf("!canWrite ? (") + 800),
    /<Link className="text-xs font-extrabold text-white" href="\/login">/,
  )
  assert.doesNotMatch(sidebarSource, /访客模式|管理员模式/u)
})
