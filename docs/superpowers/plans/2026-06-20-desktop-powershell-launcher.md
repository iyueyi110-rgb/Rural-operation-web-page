# Desktop PowerShell Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Windows desktop shortcut that opens PowerShell and runs the existing Zouma Village startup script.

**Architecture:** Use the Windows Script Host Shell COM API to create one standard `.lnk` file in the current user's resolved Desktop directory. The shortcut points to Windows PowerShell, passes the existing `start.ps1` path, and uses the repository root as its working directory.

**Tech Stack:** Windows PowerShell 5.1, Windows Script Host Shell COM API

---

### Task 1: Create and verify the desktop launcher

**Files:**
- Create: `%USERPROFILE%\Desktop\走马村云脑系统.lnk`
- Use: `D:\1\AIGC\start.ps1`

- [ ] **Step 1: Run the failing precondition check**

```powershell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop '走马村云脑系统.lnk'
if (-not (Test-Path -LiteralPath $shortcutPath)) {
  throw 'Desktop shortcut does not exist yet'
}
```

Expected: FAIL with `Desktop shortcut does not exist yet` when the launcher has not been created.

- [ ] **Step 2: Validate the source script**

```powershell
$projectRoot = 'D:\1\AIGC'
$startupScript = Join-Path $projectRoot 'start.ps1'
if (-not (Test-Path -LiteralPath $startupScript)) {
  throw "Startup script not found: $startupScript"
}
```

Expected: PASS.

- [ ] **Step 3: Create the shortcut**

```powershell
$desktop = [Environment]::GetFolderPath('Desktop')
$projectRoot = 'D:\1\AIGC'
$startupScript = Join-Path $projectRoot 'start.ps1'
$shortcutPath = Join-Path $desktop '走马村云脑系统.lnk'
$powerShellPath = Join-Path $PSHOME 'powershell.exe'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powerShellPath
$shortcut.Arguments = "-NoExit -ExecutionPolicy Bypass -File `"$startupScript`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = '启动走马村云脑系统前台、后台和数据库'
$shortcut.IconLocation = "$powerShellPath,0"
$shortcut.Save()
```

- [ ] **Step 4: Verify shortcut properties**

```powershell
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$expectedArguments = "-NoExit -ExecutionPolicy Bypass -File `"$startupScript`""

if ($shortcut.TargetPath -ne $powerShellPath) { throw 'Shortcut target mismatch' }
if ($shortcut.Arguments -ne $expectedArguments) { throw 'Shortcut arguments mismatch' }
if ($shortcut.WorkingDirectory -ne $projectRoot) { throw 'Shortcut working directory mismatch' }
```

Expected: PASS without launching services or occupying ports 3000/3001.
