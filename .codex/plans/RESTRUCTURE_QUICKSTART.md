# 仓库重构快速启动指南

> 这是 `CODEX_REPOSITORY_RESTRUCTURE_PLAN.md` 的执行摘要，帮助快速理解和启动重构工作。

---

## 🎯 为什么要重构？

基于对项目的诊断分析，当前仓库存在以下问题：

1. **产品价值不突出** - README 像技术文档，没体现"认养一棵树"的产品闭环
2. **模拟系统被埋没** - 作为核心创新点的规则模拟系统，没有独立展示
3. **文档碎片化** - 产品文档、技术文档、Codex 指令混在一起
4. **简历不友好** - 缺少可直接引用的数据结论和面试话术
5. **国际化缺失** - 没有英文文档，限制了项目影响力

---

## ✨ 重构后的样子

### 根目录对比

**重构前**：
```
├── README.md              # 技术说明
├── PRD.md                 # 产品文档
├── PRODUCT.md             # 产品定位
├── PROJECT_RULES.md       # Codex 规则
├── CODEX_*.md             # 多个 Codex 文档
├── DATA_STRUCTURE.md      # 数据结构
├── TASKS.md               # 任务清单
├── 走马村20分钟演讲稿.md  # 演讲稿
└── ...                    # 15+ 个文件
```

**重构后**：
```
├── README.md              # 产品化首页(中英双语)
├── README.en.md           # 英文版
├── ARCHITECTURE.md        # 技术架构
├── CONTRIBUTING.md        # 贡献指南
├── CHANGELOG.md           # 版本日志
├── .codex/                # Codex 专用目录
│   ├── execution-rules.md
│   └── ...
├── docs/                  # 文档中心(分层清晰)
│   ├── product/           # 产品文档
│   ├── tech/              # 技术文档
│   ├── simulation/        # 模拟系统专项
│   └── operations/        # 运营文档
├── apps/                  # 应用层
└── packages/              # 共享包(每个都有 README)
```

### 关键改进

| 改进点 | 效果 |
|-------|------|
| 📦 模拟系统独立化 | `@zouma/simulation` 有完整文档，可独立运行展示 |
| 📝 README 产品化 | 突出业务价值、规则迭代、数据决策三大亮点 |
| 🌍 中英双语 | 国际化展示，提升项目影响力 |
| 📊 简历友好 | 输出可直接用于简历的数据结论和面试话术 |
| 🗂️ 文档分层 | 产品/技术/模拟/运营四层，各有受众 |

---

## 🚀 快速执行路径

### 方案 A: 完整重构 (推荐)

按 8 个 Phase 顺序执行，每个 Phase 一个 PR：

```bash
# Phase 1: 目录重组 (2h)
git checkout -b feature/repo-restructure-phase-1
# 执行 Task 1.1 - 1.6

# Phase 2: README 产品化 (4h)
git checkout -b feature/repo-restructure-phase-2
# 执行 Task 2.1 - 2.3

# Phase 3: Package 独立化 (6h)
git checkout -b feature/repo-restructure-phase-3
# 执行 Task 3.1 - 3.3

# ... 以此类推
```

**总工时**: 34 小时  
**建议周期**: 1-2 周

### 方案 B: 最小可行版 (快速)

只执行核心任务，快速提升项目展示效果：

1. **创建 `.codex/` 目录并移动文件** (30min)
2. **重写 README.md 为产品化版本** (2h)
3. **为 `@zouma/simulation` 创建完整 README** (2h)
4. **整理 `docs/` 为产品/技术两层** (1h)
5. **生成英文 README.en.md** (1h)

**总工时**: 6.5 小时  
**适合场景**: 快速准备简历或面试

### 方案 C: 简历导向版

聚焦在简历和面试需求上：

1. **执行模拟系统回归分析** (完成 Task 5.1)
   - 运行 40 组 V0/V1 成对测试
   - 生成可引用的数据结论
   - 输出面试话术

2. **创建项目亮点文档** (完成 Task 5.2)
   - 总结业务闭环设计
   - 提炼规则迭代方法论
   - 梳理数据驱动框架

3. **优化 README 突出产品价值** (完成 Task 2.1)

**总工时**: 8 小时  
**适合场景**: 近期有面试需求

---

## 📋 Codex 执行命令

### 启动完整重构

```
请按照 docs/CODEX_REPOSITORY_RESTRUCTURE_PLAN.md 的 Phase 1 开始执行仓库重构。

要求:
1. 为 Phase 1 创建新分支 feature/repo-restructure-phase-1
2. 按 Task 1.1 到 1.6 的顺序执行
3. 使用 git mv 保留文件历史
4. 每个 Task 独立 commit
5. 完成后运行质量门禁验证
```

### 启动最小可行版

```
请执行仓库重构的最小可行版本(方案 B):

1. 创建 .codex/ 目录并移动所有 CODEX_*.md 和 PROJECT_RULES.md
2. 重写 README.md 为产品化版本，突出:
   - 认养履约规则模拟系统(核心亮点)
   - 完整的乡村文旅数字化闭环
   - 知识助手与 RAG 评测
3. 为 packages/simulation/ 创建独立 README
4. 在 docs/ 下创建 product/ 和 tech/ 子目录
5. 生成英文版 README.en.md

为这个任务创建分支 feature/repo-restructure-mvp
```

### 启动简历导向版

```
我需要准备简历和面试，请执行简历导向的重构(方案 C):

1. 执行 docs/superpowers/plans/2026-07-17-adoption-simulation-resume-analysis.md 计划
   - 生成 40 组 V0/V1 成对回归证据
   - 输出可用于简历的数据结论
   - 创建面试话术文档

2. 在 docs/product/HIGHLIGHTS.md 总结项目亮点:
   - 业务闭环设计
   - 规则迭代方法论
   - 数据驱动决策框架

3. 优化 README.md 突出产品经理视角的价值

为这个任务创建分支 feature/resume-preparation
```

---

## ✅ 质量检查清单

每个 Phase/方案完成后，运行以下检查：

```bash
# 1. 依赖安装
pnpm install --frozen-lockfile

# 2. 类型检查
pnpm type-check

# 3. 构建测试
pnpm build

# 4. 模拟系统独立运行
pnpm simulation:run --seed 20260713 --scenario NORMAL

# 5. Git 检查
git diff --check

# 6. 链接检查(可选)
# 安装 markdown-link-check
npm install -g markdown-link-check
find docs -name "*.md" -exec markdown-link-check {} \;
```

---

## 🎓 重构原则

在执行过程中始终遵循：

1. **产品思维优先** - 从"为什么"到"是什么"再到"怎么做"
2. **渐进式改进** - 每个 PR 独立可审查，不做"大爆炸"变更
3. **向后兼容** - 重要文档移动时留下跳转说明
4. **文档即产品** - 每份文档都有明确受众和目的
5. **模块化设计** - 每个包可独立理解和使用

---

## 🆘 遇到问题？

### 常见问题

**Q: 大量文件移动会丢失 git 历史吗？**  
A: 使用 `git mv` 命令可以保留历史。检查: `git log --follow <new-path>`

**Q: 要不要一次性完成所有 Phase？**  
A: 不建议。建议每个 Phase 一个 PR，便于 review 和回滚。

**Q: README 改成产品化后，开发者文档去哪了？**  
A: 在 `ARCHITECTURE.md` 和 `docs/tech/` 目录下，README 中会引导链接。

**Q: 简历分析的数据从哪来？**  
A: 执行 Phase 5 Task 5.1，运行模拟回归生成 40 组数据，从中提取指标。

### 需要帮助

如果执行过程中遇到阻塞：

1. 在 Task checkbox 旁标注 `⚠️ BLOCKED: [原因]`
2. 提出替代方案或澄清需求
3. 参考详细计划 `docs/CODEX_REPOSITORY_RESTRUCTURE_PLAN.md`

---

## 📚 相关文档

- 📋 [完整重构计划](./CODEX_REPOSITORY_RESTRUCTURE_PLAN.md)
- 📝 [简历分析执行计划](./superpowers/plans/2026-07-17-adoption-simulation-resume-analysis.md)
- 🎯 [产品需求文档 PRD](../PRD.md)
- 🏗️ [项目执行规则](../PROJECT_RULES.md)

---

> **TL;DR**: 选择一个执行方案(A/B/C)，复制对应的 Codex 命令，开始重构！
