# 认养一棵树项目 GitHub 仓库重构执行计划

> **制定时间**: 2026-07-21  
> **制定角色**: AI 产品经理  
> **执行对象**: Codex AI 编码助手  
> **目标**: 基于诊断报告和简历分析,重新梳理 GitHub 仓库结构,提升项目可维护性、可展示性和商业价值

---

## 📋 执行摘要

### 当前问题诊断

基于对项目的全面分析,发现以下核心问题:

1. **文档碎片化** - 多个 CODEX_*.md 指令文档散落根目录,缺乏统一入口
2. **仓库结构不清晰** - apps/packages/docs 混合,缺少明确的领域边界
3. **模拟系统独立性不足** - @zouma/simulation 作为核心亮点,未充分突出其独立价值
4. **产品价值展示不足** - README 技术导向,未体现产品思维和商业闭环
5. **文档层次混乱** - 技术文档、产品文档、执行计划混在 docs/ 下
6. **缺少中英双语支持** - 面向国际化的项目缺少完整的英文文档

### 重构目标

- ✅ **清晰的仓库结构** - 按业务域和关注点分离重组目录
- ✅ **突出产品价值** - 将"认养一棵树"作为产品而非技术项目展示
- ✅ **模拟系统独立化** - 将规则模拟提升为可独立运行的子产品
- ✅ **文档体系化** - 建立清晰的文档层次(产品/技术/运营)
- ✅ **双语国际化** - 核心文档提供中英双语版本
- ✅ **简历友好** - 优化项目展示以支持产品经理简历和面试

---

## 🎯 核心重构原则

### 1. 产品思维优先
- 从"技术实现"转向"产品价值"
- 强调业务闭环、用户旅程、数据决策
- 突出认养履约规则模拟的创新性

### 2. 分层清晰
```
产品层 (Product) - 为什么做、做什么、给谁做
  ↓
技术层 (Tech) - 怎么做、用什么做
  ↓
运营层 (Operations) - 如何持续运行
```

### 3. 模块化与可复用
- 每个 package 应该有独立的 README
- 核心模块(simulation/knowledge)可独立运行
- 遵循开放封闭原则

### 4. 文档即产品
- 每份文档都有明确的受众
- 技术文档面向开发者,产品文档面向 PM/面试官
- 执行文档面向 AI 助手

---

## 📐 新仓库结构设计

### 根目录文件重组

```
根目录/
├── README.md                              # 产品化首页(中英双语)
├── README.en.md                           # 英文版 README
├── ARCHITECTURE.md                        # 技术架构总览
├── CONTRIBUTING.md                        # 贡献指南
├── LICENSE                                # 开源协议(待定)
├── CHANGELOG.md                           # 版本变更日志
│
├── .codex/                                # Codex 专用目录(新增)
│   ├── README.md                          # Codex 使用说明
│   ├── execution-rules.md                 # 执行规则(整合自 PROJECT_RULES.md)
│   ├── github-description-guide.md        # GitHub 描述指南
│   ├── cleanup-workflow.md                # 清理工作流
│   └── memory/                            # Codex 记忆存储
│
├── docs/                                  # 文档中心(重组)
│   ├── README.md                          # 文档导航索引
│   │
│   ├── product/                           # 产品文档
│   │   ├── PRD.md                         # 产品需求文档
│   │   ├── PRODUCT_POSITIONING.md         # 产品定位
│   │   ├── USER_JOURNEY.md                # 用户旅程地图
│   │   ├── DATA_MODEL.md                  # 数据模型
│   │   └── ROADMAP.md                     # 产品路线图
│   │
│   ├── tech/                              # 技术文档
│   │   ├── architecture.md                # 架构设计
│   │   ├── api-design.md                  # API 设计
│   │   ├── database-schema.md             # 数据库设计
│   │   ├── deployment.md                  # 部署指南
│   │   └── security.md                    # 安全规范
│   │
│   ├── simulation/                        # 模拟系统专项文档
│   │   ├── README.md                      # 模拟系统总览
│   │   ├── system-design.md               # 系统设计
│   │   ├── metrics-definition.md          # 指标定义
│   │   ├── methodology.md                 # 方法论
│   │   ├── scenarios.md                   # 场景设计
│   │   └── resume-analysis.md             # 简历分析结论
│   │
│   ├── adoption-v2/                       # 认养 V2 实施报告
│   │   ├── implementation-report.md
│   │   ├── agent-eval-report.md
│   │   ├── rag-eval-report.md
│   │   └── visual-regression-report.md
│   │
│   └── operations/                        # 运营文档(新增)
│       ├── deployment-checklist.md        # 部署清单
│       ├── monitoring.md                  # 监控指南
│       └── troubleshooting.md             # 故障排查
│
├── apps/                                  # 应用层
│   ├── web/                               # 前台 PWA
│   │   ├── README.md                      # Web 应用说明
│   │   └── ...
│   └── admin/                             # 运营后台
│       ├── README.md                      # Admin 应用说明
│       └── ...
│
├── packages/                              # 共享包
│   ├── contracts/                         # API 合约
│   │   └── README.md
│   ├── database/                          # 数据库层
│   │   └── README.md
│   ├── knowledge/                         # 知识库系统
│   │   └── README.md
│   ├── prompts/                           # AI 提示词
│   │   └── README.md
│   ├── simulation/                        # 认养履约规则模拟(核心)
│   │   ├── README.md                      # 模拟系统独立说明
│   │   ├── ARCHITECTURE.md                # 模拟系统架构
│   │   └── ...
│   ├── ui/                                # UI 组件库
│   │   └── README.md
│   └── utils/                             # 工具函数
│       └── README.md
│
├── scripts/                               # 自动化脚本
│   ├── start.sh                           # Unix 启动脚本
│   ├── start.ps1                          # Windows 启动脚本
│   └── simulation-launcher.command        # macOS 模拟工作台启动器
│
├── infra/                                 # 基础设施
│   ├── docker/
│   └── terraform/
│
├── outputs/                               # 运行产物(gitignore)
│   └── simulation/                        # 模拟运行结果
│
└── tmp/                                   # 临时文件(gitignore)
```

### 关键变更说明

#### 1. 新增 `.codex/` 目录
将所有 Codex 相关指令集中管理:
- 移动 `PROJECT_RULES.md` → `.codex/execution-rules.md`
- 移动 `CODEX_*.md` → `.codex/`
- 保留根目录清爽,只留产品和技术核心文档

#### 2. 重组 `docs/` 目录
按文档类型和受众分层:
- `product/` - 产品经理、业务方、投资人
- `tech/` - 开发者、架构师
- `simulation/` - 独立的模拟系统文档集
- `operations/` - 运维人员、SRE

#### 3. 每个 Package 增加 README
让每个包可以独立理解和使用:
- `@zouma/simulation` - 突出其作为独立产品的价值
- `@zouma/knowledge` - 说明知识库系统设计
- 其他包 - 明确职责和使用方式

#### 4. 根目录清理
保留以下核心文档:
- `README.md` - 产品化首页
- `ARCHITECTURE.md` - 技术架构总览
- `CONTRIBUTING.md` - 贡献指南
- `CHANGELOG.md` - 版本日志

移除或移动:
- `PRD.md` → `docs/product/PRD.md`
- `PRODUCT.md` → `docs/product/PRODUCT_POSITIONING.md`
- `DATA_STRUCTURE.md` → `docs/tech/database-schema.md`
- `TASKS.md` → 归档或删除(使用 GitHub Issues/Projects)
- `走马村20分钟演讲稿.md` → `docs/product/pitch-deck.md`

---

## 🔧 执行任务清单

### Phase 1: 目录结构重组 (Priority: P0)

- [ ] **Task 1.1: 创建新目录结构**
  ```bash
  mkdir -p .codex/memory
  mkdir -p docs/{product,tech,simulation,operations}
  ```

- [ ] **Task 1.2: 移动 Codex 相关文件**
  ```bash
  mv PROJECT_RULES.md .codex/execution-rules.md
  mv CODEX_CLEANUP_INSTRUCTIONS.md .codex/cleanup-workflow.md
  mv CODEX_GITHUB_DESCRIPTION_INSTRUCTIONS.md .codex/github-description-guide.md
  ```

- [ ] **Task 1.3: 重组产品文档**
  ```bash
  mv PRD.md docs/product/PRD.md
  mv PRODUCT.md docs/product/PRODUCT_POSITIONING.md
  mv 走马村20分钟演讲稿.md docs/product/pitch-deck.md
  ```

- [ ] **Task 1.4: 重组技术文档**
  ```bash
  mv DATA_STRUCTURE.md docs/tech/database-schema.md
  ```

- [ ] **Task 1.5: 整合模拟系统文档**
  ```bash
  mv docs/simulation-*.md docs/simulation/
  mv docs/adoption-simulation-delivery.md docs/simulation/delivery-guide.md
  mv docs/degradation-*.md docs/operations/
  ```

- [ ] **Task 1.6: 创建文档索引**
  - 创建 `docs/README.md` 作为文档导航中心
  - 创建 `.codex/README.md` 说明 Codex 使用方式

### Phase 2: README 产品化改造 (Priority: P0)

- [ ] **Task 2.1: 重写根目录 README.md**
  - 采用"问题-方案-价值"叙事结构
  - 突出三大核心亮点:
    1. 认养履约规则模拟系统(可独立运行)
    2. 知识助手与 RAG 评测体系
    3. 完整的乡村文旅数字化闭环
  - 增加视觉化截图(树认养流程、模拟对比、后台界面)
  - 添加 GitHub badges(build status, coverage, license)

- [ ] **Task 2.2: 创建英文版 README.en.md**
  - 完整翻译核心内容
  - 保留技术术语的准确性
  - 符合国际开源项目规范

- [ ] **Task 2.3: 优化 Social Preview**
  - 设计并生成 `docs/assets/social-preview.png`
  - 尺寸: 1200×630px
  - 主题: 认养一棵树,连接一个村
  - 上传至 GitHub Settings → Social preview

### Phase 3: Package 独立化 (Priority: P1)

- [ ] **Task 3.1: 为 @zouma/simulation 创建完整 README**
  内容包括:
  - 系统定位: 认养履约规则的确定性验证引擎
  - 核心能力: 8 场景 × 5 种子成对回归测试
  - 独立运行: 不依赖主应用的模拟 CLI
  - 指标体系: 13 项指标定义与计算逻辑
  - 使用示例: 从单次运行到回归对比
  - 架构设计: 事件驱动、确定性随机、可复现

- [ ] **Task 3.2: 为 @zouma/knowledge 创建 README**
  内容包括:
  - 知识库系统设计
  - BM25 索引与检索
  - PII 清洗与角色过滤
  - 评测集与召回率
  - 安全降级策略

- [ ] **Task 3.3: 为其他 packages 补充 README**
  - @zouma/contracts - API 合约设计理念
  - @zouma/database - Prisma schema 组织原则
  - @zouma/prompts - AI 提示词管理规范
  - @zouma/ui - 设计系统与组件库
  - @zouma/utils - 工具函数分类

### Phase 4: 文档完善与体系化 (Priority: P1)

- [ ] **Task 4.1: 创建 ARCHITECTURE.md**
  - Monorepo 架构总览
  - 技术栈选型理由
  - 数据流与状态管理
  - 模型编排策略
  - 安全与隐私设计

- [ ] **Task 4.2: 创建 CONTRIBUTING.md**
  - 开发环境搭建
  - 分支策略与 PR 规范
  - Commit message 规范
  - Code review checklist
  - 测试要求

- [ ] **Task 4.3: 创建 CHANGELOG.md**
  - 基于 git log 整理版本历史
  - 采用 Keep a Changelog 格式
  - 区分 Added/Changed/Deprecated/Removed/Fixed/Security

- [ ] **Task 4.4: 编写模拟系统专项文档**
  - `docs/simulation/README.md` - 总览
  - `docs/simulation/system-design.md` - 从当前 simulation-system.md 整合
  - `docs/simulation/metrics-definition.md` - 从 simulation-metrics.md 整合
  - `docs/simulation/methodology.md` - 从 simulation-methodology.md 整合
  - `docs/simulation/resume-analysis.md` - 基于简历分析计划生成的结论

- [ ] **Task 4.5: 编写运营文档**
  - `docs/operations/deployment-checklist.md`
  - `docs/operations/monitoring.md`
  - `docs/operations/troubleshooting.md`

### Phase 5: 简历友好优化 (Priority: P2)

- [ ] **Task 5.1: 生成模拟系统结论文档**
  - 执行 `docs/superpowers/plans/2026-07-17-adoption-simulation-resume-analysis.md` 计划
  - 生成 40 组 V0/V1 成对回归证据
  - 输出可用于简历的数据和结论
  - 创建面试话术文档

- [ ] **Task 5.2: 创建项目亮点总结**
  - 在 `docs/product/HIGHLIGHTS.md` 中总结:
    - 业务闭环设计
    - 规则迭代方法论
    - 数据驱动决策框架
    - 技术创新点
  - 面向产品经理简历和面试场景

- [ ] **Task 5.3: 优化 GitHub About**
  - 精简到 150 字以内
  - 突出"认养经济 + 规则模拟 + 乡村数字化"
  - 添加合适的 Topics 标签

### Phase 6: 代码组织优化 (Priority: P2)

- [ ] **Task 6.1: 规范 apps/ 结构**
  - 确保 web/admin 各自有完整的 README
  - 统一路由组织规范
  - 统一环境变量命名

- [ ] **Task 6.2: 优化 scripts/ 组织**
  - 移除根目录脚本,统一放入 scripts/
  - 保留根目录的 start.cmd 作为快捷入口(指向 scripts/)
  - 添加脚本使用说明

- [ ] **Task 6.3: 清理临时文件和归档**
  - 确认 outputs/ 和 tmp/ 在 .gitignore
  - 归档不需要的历史文档到 memory/ 或删除
  - 清理 .next、.turbo 等构建产物

### Phase 7: CI/CD 与自动化 (Priority: P3)

- [ ] **Task 7.1: 添加 GitHub Actions workflows**
  - `.github/workflows/ci.yml` - 类型检查、测试、构建
  - `.github/workflows/simulation-regression.yml` - 定期模拟回归
  - `.github/workflows/docs-check.yml` - 文档链接检查

- [ ] **Task 7.2: 添加 PR 模板**
  - `.github/pull_request_template.md`
  - 包含变更清单、测试要求、文档更新提醒

- [ ] **Task 7.3: 添加 Issue 模板**
  - Bug report
  - Feature request
  - Documentation improvement

### Phase 8: 开源准备 (Priority: P3)

- [ ] **Task 8.1: 选择合适的开源协议**
  - 评估 MIT / Apache 2.0 / GPL
  - 添加 LICENSE 文件
  - 在 package.json 中声明 license

- [ ] **Task 8.2: 安全审计**
  - 检查是否有硬编码的 secrets
  - 确认 .env.example 完整且不包含真实凭证
  - 审查是否有敏感业务信息

- [ ] **Task 8.3: 添加行为准则**
  - 创建 CODE_OF_CONDUCT.md
  - 参考 Contributor Covenant

---

## 📊 执行优先级与时间估算

| Phase | 优先级 | 预计工时 | 依赖关系 | 说明 |
|-------|-------|---------|---------|------|
| Phase 1 | P0 | 2h | 无 | 目录重组是后续工作基础 |
| Phase 2 | P0 | 4h | Phase 1 | README 是项目门面 |
| Phase 3 | P1 | 6h | Phase 1 | 体现模块化设计思想 |
| Phase 4 | P1 | 8h | Phase 1 | 完善文档体系 |
| Phase 5 | P2 | 4h | Phase 4 | 简历场景优化 |
| Phase 6 | P2 | 3h | Phase 1 | 代码组织清理 |
| Phase 7 | P3 | 4h | Phase 6 | 自动化流程 |
| Phase 8 | P3 | 3h | All | 开源准备 |

**总预计工时**: 34 小时  
**建议执行周期**: 1-2 周(分多个 PR 逐步完成)

---

## ✅ 验收标准

### 1. 仓库结构验收
- [ ] 根目录文件数量 ≤ 15 个
- [ ] 所有 Codex 指令在 `.codex/` 目录
- [ ] docs/ 按产品/技术/模拟/运营四大类组织
- [ ] 每个 package 有独立 README

### 2. 文档质量验收
- [ ] README.md 突出产品价值,包含视觉化内容
- [ ] 所有文档链接可访问(无 404)
- [ ] 文档采用一致的 Markdown 风格
- [ ] 中英双语核心文档完整

### 3. 可运行性验收
- [ ] `pnpm install` 成功
- [ ] `pnpm dev` 启动前后台
- [ ] `pnpm simulation:run` 独立运行
- [ ] `pnpm type-check` 通过
- [ ] `pnpm build` 成功

### 4. 简历友好验收
- [ ] 模拟系统结论文档完成
- [ ] 包含可引用的数据和指标
- [ ] 有清晰的面试话术
- [ ] 项目亮点总结完整

### 5. 开源准备验收(如适用)
- [ ] LICENSE 文件存在
- [ ] 无硬编码 secrets
- [ ] CONTRIBUTING.md 完整
- [ ] CODE_OF_CONDUCT.md 存在

---

## 🎯 关键改进对比

### 改进前 vs 改进后

| 维度 | 改进前 | 改进后 |
|------|-------|-------|
| **仓库定位** | 技术项目 | 产品 + 技术项目 |
| **文档组织** | 扁平化混乱 | 分层清晰(产品/技术/模拟/运营) |
| **模拟系统** | 嵌入式包 | 可独立运行的子产品 |
| **README** | 技术说明 | 产品化展示 + 视觉内容 |
| **国际化** | 仅中文 | 中英双语 |
| **可维护性** | 依赖口口相传 | 文档化、自动化 |
| **简历价值** | 需要额外整理 | 开箱即用的结论和话术 |

---

## 📝 执行注意事项

### 1. Git 操作规范
- 每个 Phase 创建独立分支 `feature/repo-restructure-phase-{n}`
- 每个 Task 独立 commit,使用规范的 commit message
- 大规模移动文件使用 `git mv` 保留历史
- 文件移动和内容修改分开提交

### 2. 向后兼容
- 重要文档移动时,在原位置留下跳转说明
- 更新所有内部文档链接
- 检查 CI/CD 中的文件路径引用

### 3. 团队协作
- 提前通知团队成员重构计划
- 关键文件移动前确认无人正在编辑
- 提供迁移指南文档

### 4. 质量保证
- 每个 Phase 完成后运行完整测试
- 检查所有文档链接有效性
- 验证启动脚本在 Windows/macOS/Linux 都能运行

---

## 🚀 后续演进方向

### Short-term (1-3 个月)
- 完善 CI/CD 自动化测试
- 增加代码覆盖率报告
- 建立定期的模拟回归自动运行

### Mid-term (3-6 个月)
- 提取 @zouma/simulation 为独立仓库
- 发布 npm packages
- 建立文档网站(VitePress/Docusaurus)

### Long-term (6-12 个月)
- 社区化运营
- 多语言支持扩展
- 提供 SaaS 版本

---

## 📚 参考资源

### 优秀开源项目参考
- [shadcn/ui](https://github.com/shadcn-ui/ui) - Monorepo 组织
- [cal.com](https://github.com/calcom/cal.com) - 产品化 README
- [Supabase](https://github.com/supabase/supabase) - 文档结构
- [n8n](https://github.com/n8n-io/n8n) - 贡献指南

### 文档规范
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

### Markdown 最佳实践
- [markdownlint](https://github.com/DavidAnson/markdownlint)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)

---

## 🤝 Codex 执行建议

### 执行模式
建议使用 **subagent-driven-development** 模式:
1. 为每个 Phase 创建独立的子任务
2. 每个 Task 使用 checkbox 跟踪进度
3. 重要变更前使用 `EnterPlanMode` 确认方案
4. 大规模文件操作前先 dry-run 验证

### 风险控制
- Phase 1 涉及大量文件移动,先在 feature 分支操作
- Phase 2 README 改写影响首次印象,需人工 review
- Phase 3-4 文档编写可并行,但需保持风格一致
- Phase 7-8 涉及 CI 和开源,需额外安全审查

### 质量门禁
每个 Phase 完成后必须通过:
```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm build
pnpm simulation:run --seed 20260713 --scenario NORMAL
git diff --check
```

---

## 📞 联系与反馈

如在执行过程中遇到问题或需要调整优先级,请:
1. 在对应 Task 的 checkbox 旁标注 `⚠️ BLOCKED: [原因]`
2. 提出替代方案或需要澄清的决策点
3. 保持渐进式重构原则,避免"大爆炸"式变更

---

> **最后更新**: 2026-07-21  
> **版本**: v1.0  
> **状态**: 待执行
