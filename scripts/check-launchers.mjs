import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const cmd = readFileSync(resolve(root, "start.cmd"), "utf8")
const powershell = readFileSync(resolve(root, "scripts/start.ps1"), "utf8")
const macWrapper = readFileSync(resolve(root, "走马村云脑系统.command"), "utf8")
const macImplementation = readFileSync(resolve(root, "scripts/走马村云脑系统.command"), "utf8")

if (!cmd.includes('"%~dp0scripts\\start.ps1"')) {
  throw new Error("start.cmd must invoke scripts\\start.ps1 relative to its own directory")
}
if (!powershell.includes("$RootDir = Split-Path -Parent $PSScriptRoot")) {
  throw new Error("scripts/start.ps1 must resolve the repository root from its script directory")
}
if (!macWrapper.includes('exec "$ROOT_DIR/scripts/走马村云脑系统.command"')) {
  throw new Error("root macOS launcher must delegate to scripts/ implementation")
}
if (!macImplementation.includes('ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"')) {
  throw new Error("canonical macOS launcher must resolve its own directory")
}

console.log("Launcher path checks passed.")
