const ignoredDocumentationDirectories = new Set([
  ".git",
  ".next",
  ".playwright-cli",
  ".turbo",
  ".venv",
  ".worktrees",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "outputs",
  "tmp",
])

export function shouldScanDocumentationDirectory(name) {
  return !ignoredDocumentationDirectories.has(name)
}
