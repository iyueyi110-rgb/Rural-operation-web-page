import { spawnSync } from "node:child_process"

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
const steps = [
  [pnpm, ["type-check"]],
  [pnpm, ["test"]],
  [pnpm, ["docs:check"]],
  [pnpm, ["build"]],
  [
    pnpm,
    [
      "simulation:run",
      "--seed",
      "20260713",
      "--scenario",
      "NORMAL",
      "--output",
      "outputs/simulation/quality-gate-pair.json",
    ],
  ],
  ["git", ["diff", "--check"]],
]

for (const [command, args] of steps) {
  process.stdout.write(`\n> ${command} ${args.join(" ")}\n`)
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

process.stdout.write("\nQuality gate passed.\n")
