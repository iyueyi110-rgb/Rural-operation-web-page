# Codex 工作区整理指令

> 生成日期：2026-06-30
> 目标：清理根目录冗余文件，归类散落资源，保持 Monorepo 整洁

---

## 📊 诊断摘要

根目录共有 **60+ 个文件/文件夹**，其中约 **40 个**属于可清理/需归类的冗余文件。核心问题：

1. **24 个 `CODEX_*.md`** 一次性任务文件散落根目录
2. **图片/PDF/PPT/DWG** 等资源文件未归类
3. **临时提取文件** (txt/ndjson) 未清理
4. **Windows 快捷方式** 在 macOS 环境无用

---

## 🗑️ 第一类：直接删除（共 29 个）

### 1.1 Codex 历史任务文件（24 个）

这些是一次性任务指令，任务完成后应删除：

```
CODEX_DEGRADATION_AUDIT.md
CODEX_FIX_2025-06-26.md
CODEX_FIX_BACK_BUTTON.md
CODEX_FIX_BACK_BUTTON_NOTES.md
CODEX_FIX_ENV_APIS.md
CODEX_FIX_INSTRUCTIONS.md
CODEX_FIX_VILLAGER_SAVE_LOGIN.md
CODEX_P0_AIGC_CLOUD_BRAIN.md
CODEX_P0_ATTENTION_POINTS.md
CODEX_P0_SUMMARY.md
CODEX_P0_VERIFICATION_CHECKLIST.md
CODEX_P1_ATTENTION_POINTS.md
CODEX_P1_INSTRUCTIONS.md
CODEX_P2_ATTENTION_POINTS.md
CODEX_P2_INSTRUCTIONS.md
CODEX_P3_ATTENTION_POINTS.md
CODEX_P3_INSTRUCTIONS.md
CODEX_P4_ATTENTION_POINTS.md
CODEX_P4_INSTRUCTIONS.md
CODEX_P5_ATTENTION_POINTS.md
CODEX_P5_FIX_INSTRUCTIONS.md
CODEX_P5_SECURITY_FIX.md
CODEX_P6_ARCHITECTURAL_RENOVATION.md
CODEX_WEBSITE_EXPRESSION_POLISH.md
```

> ⚠️ 如果仍需保留某些文件的记录，请先将其移动到 `docs/archive/codex-tasks/` 再执行删除。建议直接删除。

### 1.2 调试/临时产物（4 个）

```
走马村1_Part6建筑策略_可编辑版.pptx.inspect.ndjson
走马村1_Part6建筑策略_效果图完整版.pptx.inspect.ndjson
pdf_extracted.txt
pdf_raw.txt
```

### 1.3 无用的 Windows 快捷方式（1 个）

```
走马村云脑系统.lnk
```

> 在 macOS 环境下无效，且 `.command` 版本已存在。

---

## 📁 第二类：移动到正确位置（共 10 个）

### 2.1 图片资源 → `docs/assets/images/`

```
下一步方向流程图.png    → docs/assets/images/下一步方向流程图.png
功能结构图.png           → docs/assets/images/功能结构图.png
建筑节点图.png           → docs/assets/images/建筑节点图.png
```

### 2.2 参考文档 PDF → `docs/reference/`

```
基于AIGC的走马村乡村系统深度研究与两份执行计划.pdf → docs/reference/
走马村系统设计优化方案.pdf                           → docs/reference/
```

### 2.3 演示文稿 PPT → `docs/presentations/`

```
走马村1.pptx                                    → docs/presentations/
走马村1_Part6建筑策略_可编辑版.pptx                → docs/presentations/
走马村1_Part6建筑策略_效果图完整版.pptx             → docs/presentations/
```

### 2.4 其他资源文件

```
2025年毕业设计地形图.dwg        → docs/reference/
走马村云脑系统.command           → scripts/
6,16任务_Codex整理版.md          → docs/archive/
```

---

## 🧹 第三类：可选清理

### 3.1 构建缓存

```
.turbo/          # Turborepo 缓存，删除后会自动重建
node_modules/    # 依赖，删除后运行 pnpm install 即可恢复
```

> 仅在需要释放磁盘空间时删除。

### 3.2 docs/ 目录内的一次性修复记录

以下文件属于一次性修复/实现笔记，可归档到 `docs/archive/`：

```
docs/final-fix.md
docs/page-flip-fix.md
docs/change-comparison.md
docs/optimization-execution-supplement.md
docs/villager-system-fixes.md
docs/villager-system-implementation.md
docs/villager-system-notes.md
```

---

## ✅ 保留确认（核心文件，不删除）

| 文件 | 原因 |
|------|------|
| `.env.example` | 环境变量模板 |
| `.gitattributes` / `.gitignore` | Git 配置 |
| `.prettierrc.json` | 代码格式化配置 |
| `eslint.config.mjs` | Lint 配置 |
| `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` | 包管理 |
| `tsconfig.base.json` / `turbo.json` | 构建配置 |
| `start.ps1` | 启动脚本 |
| `PRD.md` / `PRODUCT.md` / `PROJECT_RULES.md` | 核心产品文档 |
| `TASKS.md` / `DATA_STRUCTURE.md` | 任务与数据结构 |
| `API_INTEGRATION_STATUS.md` | 集成状态追踪 |
| `apps/` / `packages/` / `infra/` / `docs/` / `memory/` | 核心目录 |
| `走马岭实地照片/` | 实地参考照片（47 张 JPG） |
| `output/` | 输出产物 |

---

## 🔧 执行步骤

按顺序在终端执行以下命令：

```bash
# 进入项目根目录
cd /Users/limyoon/Desktop/workspace/aigc

# ========== 第一步：创建目标目录 ==========
mkdir -p docs/assets/images
mkdir -p docs/reference
mkdir -p docs/presentations
mkdir -p docs/archive/codex-tasks
mkdir -p scripts

# ========== 第二步：删除冗余文件 ==========
# 2.1 删除 Codex 历史任务文件
rm -f CODEX_DEGRADATION_AUDIT.md
rm -f CODEX_FIX_2025-06-26.md
rm -f CODEX_FIX_BACK_BUTTON.md
rm -f CODEX_FIX_BACK_BUTTON_NOTES.md
rm -f CODEX_FIX_ENV_APIS.md
rm -f CODEX_FIX_INSTRUCTIONS.md
rm -f CODEX_FIX_VILLAGER_SAVE_LOGIN.md
rm -f CODEX_P0_AIGC_CLOUD_BRAIN.md
rm -f CODEX_P0_ATTENTION_POINTS.md
rm -f CODEX_P0_SUMMARY.md
rm -f CODEX_P0_VERIFICATION_CHECKLIST.md
rm -f CODEX_P1_ATTENTION_POINTS.md
rm -f CODEX_P1_INSTRUCTIONS.md
rm -f CODEX_P2_ATTENTION_POINTS.md
rm -f CODEX_P2_INSTRUCTIONS.md
rm -f CODEX_P3_ATTENTION_POINTS.md
rm -f CODEX_P3_INSTRUCTIONS.md
rm -f CODEX_P4_ATTENTION_POINTS.md
rm -f CODEX_P4_INSTRUCTIONS.md
rm -f CODEX_P5_ATTENTION_POINTS.md
rm -f CODEX_P5_FIX_INSTRUCTIONS.md
rm -f CODEX_P5_SECURITY_FIX.md
rm -f CODEX_P6_ARCHITECTURAL_RENOVATION.md
rm -f CODEX_WEBSITE_EXPRESSION_POLISH.md

# 2.2 删除调试/临时产物
rm -f "走马村1_Part6建筑策略_可编辑版.pptx.inspect.ndjson"
rm -f "走马村1_Part6建筑策略_效果图完整版.pptx.inspect.ndjson"
rm -f pdf_extracted.txt
rm -f pdf_raw.txt

# 2.3 删除无用的 Windows 快捷方式
rm -f "走马村云脑系统.lnk"

# ========== 第三步：移动文件到正确位置 ==========
# 3.1 移动图片
mv "下一步方向流程图.png" docs/assets/images/
mv "功能结构图.png" docs/assets/images/
mv "建筑节点图.png" docs/assets/images/

# 3.2 移动 PDF 参考文档
mv "基于AIGC的走马村乡村系统深度研究与两份执行计划.pdf" docs/reference/
mv "走马村系统设计优化方案.pdf" docs/reference/

# 3.3 移动演示文稿
mv "走马村1.pptx" docs/presentations/
mv "走马村1_Part6建筑策略_可编辑版.pptx" docs/presentations/
mv "走马村1_Part6建筑策略_效果图完整版.pptx" docs/presentations/

# 3.4 移动其他资源
mv "2025年毕业设计地形图.dwg" docs/reference/
mv "走马村云脑系统.command" scripts/
mv "6,16任务_Codex整理版.md" docs/archive/

# ========== 第四步：归档 docs/ 中的一次性修复笔记 ==========
mv docs/final-fix.md docs/archive/ 2>/dev/null
mv docs/page-flip-fix.md docs/archive/ 2>/dev/null
mv docs/change-comparison.md docs/archive/ 2>/dev/null
mv docs/optimization-execution-supplement.md docs/archive/ 2>/dev/null
mv docs/villager-system-fixes.md docs/archive/ 2>/dev/null
mv docs/villager-system-implementation.md docs/archive/ 2>/dev/null
mv docs/villager-system-notes.md docs/archive/ 2>/dev/null

# ========== 第五步：清理构建缓存（可选） ==========
# rm -rf .turbo node_modules
# pnpm install

echo "✅ 整理完成！"
```

---

## 📋 整理后的根目录预期结构

```
aigc/
├── .env.example
├── .git/
├── .gitattributes
├── .gitignore
├── .prettierrc.json
├── .turbo/                          # 构建缓存
├── API_INTEGRATION_STATUS.md
├── DATA_STRUCTURE.md
├── PRD.md
├── PRODUCT.md
├── PROJECT_RULES.md
├── TASKS.md
├── apps/
│   ├── admin/
│   └── web/
├── docs/
│   ├── archive/                     # 🆕 归档文件
│   ├── assets/
│   │   └── images/                  # 🆕 图片资源
│   ├── presentations/               # 🆕 PPT 演示文稿
│   ├── reference/                   # 🆕 PDF/DWG 参考文档
│   ├── superpowers/
│   ├── acceptance-criteria.md
│   ├── fullstack-integration-guide.md
│   ├── optimization-execution.md
│   ├── optimization-notes.md
│   └── system-overview.md
├── eslint.config.mjs
├── infra/
│   └── docker/
├── memory/
├── node_modules/
├── output/
│   └── concept-sketch/
├── package.json
├── packages/
│   ├── contracts/
│   ├── database/
│   ├── prompts/
│   ├── ui/
│   └── utils/
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── scripts/                         # 🆕 脚本目录
│   └── 走马村云脑系统.command
├── start.ps1
├── tsconfig.base.json
├── turbo.json
└── 走马岭实地照片/                  # 47 张实地照片
```

---

## ⚠️ 注意事项

1. **执行前请先 `git status` 确认工作区干净**，或先 commit/stash 当前改动
2. 如对某些 Codex 文件有保留需求，可先改为 `mv` 到 `docs/archive/codex-tasks/` 而非直接 `rm`
3. 移动 PPT/PDF 后，如有其他文档引用了旧路径，需同步更新引用
4. `.env.local` 已存在于根目录且 `.gitignore` 已忽略，无需处理
