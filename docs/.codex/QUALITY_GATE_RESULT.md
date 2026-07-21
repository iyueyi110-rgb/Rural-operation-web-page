# 最终质量门禁结果

执行日期：2026-07-21  
分支：`codex/restructure-05-evidence`

## 执行命令

```powershell
pnpm install --frozen-lockfile
$env:DATABASE_URL='postgresql://zouma:zouma_dev@localhost:5432/zouma'
pnpm quality:gate
```

## 结果

- `pnpm install --frozen-lockfile`：通过
- 启动器路径检查：通过
- `pnpm type-check`：通过
- `pnpm test`：通过；模拟包 62/62，其余 workspace 测试全部通过
- `pnpm docs:check`：通过；66 个 Markdown 文件
- `pnpm build`：通过
- 模拟质量门禁单次运行：通过，产物写入已忽略的 `outputs/simulation/quality-gate-pair.json`
- `git diff --check`：通过

结论：**质量门禁通过，无失败步骤或阻塞问题。**

本机 Node/Turbo 输出了非阻断性提示：部分仅执行类型检查的 Turbo build 任务没有缓存产物，以及 Windows 下调用 `pnpm.cmd` 的 Node 子进程弃用提示；这些提示未影响退出码或验收结果。
