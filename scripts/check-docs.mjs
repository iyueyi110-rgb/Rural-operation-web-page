import { access, readdir, readFile } from "node:fs/promises"
import { dirname, extname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".playwright-cli",
  ".turbo",
  ".venv",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "outputs",
  "tmp",
])

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)))
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md")
      files.push(path)
  }
  return files
}

function localTargets(markdown) {
  const targets = []
  let fence = null
  for (const [index, line] of markdown.split(/\r?\n/u).entries()) {
    const fenceMatch = line.match(/^\s*(```|~~~)/u)
    if (fenceMatch) {
      fence = fence === null ? fenceMatch[1] : fence === fenceMatch[1] ? null : fence
      continue
    }
    if (fence) continue
    const linkPattern = /!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\)/gu
    for (const match of line.matchAll(linkPattern)) {
      const raw = match[1].replace(/^<|>$/gu, "")
      if (
        raw.startsWith("#") ||
        raw.startsWith("/") ||
        /^[a-z][a-z0-9+.-]*:/iu.test(raw)
      )
        continue
      const withoutFragment = raw.split("#", 1)[0].split("?", 1)[0]
      if (!withoutFragment) continue
      targets.push({ line: index + 1, target: decodeURIComponent(withoutFragment) })
    }
  }
  return { targets, unclosedFence: fence }
}

const failures = []
const files = await markdownFiles(repositoryRoot)
for (const file of files) {
  const markdown = await readFile(file, "utf8")
  const { targets, unclosedFence } = localTargets(markdown)
  if (unclosedFence) failures.push(`${file}: unclosed ${unclosedFence} fence`)
  for (const item of targets) {
    const destination = resolve(dirname(file), item.target)
    try {
      await access(destination)
    } catch {
      failures.push(`${file}:${item.line}: missing ${item.target}`)
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Documentation check passed (${files.length} Markdown files).\n`)
}
