# Codex 执行工具任务清单

> **任务目标**: 为"认养一棵树"项目创建完整的执行工具文档体系  
> **制定时间**: 2026-07-21  
> **执行对象**: Codex AI 编码助手  
> **基于文档**: 诊断报告 + 简历分析计划 + 项目分析

---

## 📦 已完成的工具文档

### 1. 仓库重构主计划
- ✅ **文件**: `docs/CODEX_REPOSITORY_RESTRUCTURE_PLAN.md`
- **内容**: 
  - 8 个 Phase 的完整重构计划
  - 34 小时工时估算
  - 详细的任务清单和验收标准
  - 重构前后对比
- **用途**: Codex 执行 GitHub 仓库重组的完整指南

### 2. 快速启动指南
- ✅ **文件**: `docs/RESTRUCTURE_QUICKSTART.md`
- **内容**:
  - 3 种执行方案(完整/最小可行/简历导向)
  - Codex 执行命令模板
  - 质量检查清单
  - 常见问题解答
- **用途**: 快速理解重构计划并选择执行路径

---

## 🛠️ 需要创建的补充工具文档

### Tool 1: Codex 使用手册
**文件**: `.codex/README.md`

**目的**: 为 Codex 提供项目专属的使用说明

**内容结构**:
```markdown
# Codex 使用手册 - 认养一棵树项目

## 项目概览
- 项目定位
- 技术栈
- Monorepo 结构

## Codex 配置
- 执行规则位置
- 记忆存储位置
- 常用命令

## 执行模式
- 计划驱动开发
- 子任务分解
- 质量门禁

## 常用工作流
- 功能开发流程
- Bug 修复流程
- 文档更新流程
- 重构流程

## 项目专属规则
- Git 分支策略
- Commit 规范
- PR 检查清单
- 测试要求

## 工具文档索引
- 仓库重构计划
- 简历分析计划
- 清理工作流
- GitHub 描述指南
```

---

### Tool 2: 文档导航中心
**文件**: `docs/README.md`

**目的**: 作为所有文档的索引入口

**内容结构**:
```markdown
# 文档中心

## 📚 文档分类

### 产品文档 (Product)
面向: 产品经理、业务方、投资人
- PRD - 产品需求文档
- 产品定位与设计原则
- 用户旅程地图
- 产品路线图
- 项目亮点总结
- 演讲稿

### 技术文档 (Tech)
面向: 开发者、架构师
- 架构设计
- API 设计
- 数据库设计
- 部署指南
- 安全规范

### 模拟系统文档 (Simulation)
面向: 产品经理、数据分析师、面试官
- 系统设计
- 指标定义
- 方法论
- 场景设计
- 简历分析结论

### 运营文档 (Operations)
面向: 运维人员、SRE
- 部署清单
- 监控指南
- 故障排查

### 实施报告 (Reports)
- 认养 V2 实施报告
- Agent 评测报告
- RAG 评测报告
- 视觉回归报告

## 🎯 快速导航

### 我是产品经理
→ 从这里开始: product/PRD.md
→ 项目亮点: product/HIGHLIGHTS.md
→ 简历材料: simulation/resume-analysis.md

### 我是开发者
→ 从这里开始: tech/architecture.md
→ 开发规范: ../.codex/execution-rules.md
→ 贡献指南: ../CONTRIBUTING.md

### 我是面试官
→ 项目概览: ../README.md
→ 产品定位: product/PRODUCT_POSITIONING.md
→ 技术亮点: simulation/system-design.md

### 我是 Codex
→ 使用手册: ../.codex/README.md
→ 重构计划: CODEX_REPOSITORY_RESTRUCTURE_PLAN.md
→ 快速启动: RESTRUCTURE_QUICKSTART.md
```

---

### Tool 3: 模拟系统独立 README
**文件**: `packages/simulation/README.md`

**目的**: 将模拟系统作为独立产品展示

**内容结构**:
```markdown
# 认养履约规则模拟系统

## 系统定位

一个用于验证认养履约规则的确定性模拟引擎，支持 V0/V1 策略成对对比。

## 核心能力

### 1. 确定性模拟
- 基于固定种子的可复现模拟
- 事件驱动的时间推进
- 确定性随机数生成

### 2. 多场景压力测试
支持 8 种场景:
- NORMAL - 正常运营
- ADOPTION_PEAK - 认养高峰
- STAFF_SHORTAGE - 人手不足
- CONTINUOUS_RAIN - 连续降雨
- LOW_SUBMISSION_QUALITY - 低提交质量
- REMOTE_ZONE_LOAD - 偏远区域负载
- REVIEW_BACKLOG - 审核积压
- HARVEST_PEAK - 采收高峰

### 3. 成对回归对比
- V0/V1 同世界同条件对比
- 13 项指标全方位评估
- 自动生成推荐结论

### 4. 完整导出能力
11 类导出物:
- 指标对比报告
- 事件时间线
- Bad Case 清单
- 资源分配记录
- ...

## 快速开始

### 独立运行
```bash
# 单次运行
pnpm simulation:run --seed 20260713 --scenario NORMAL --output result.json

# 回归测试 (5种子 × 8场景 = 40组)
pnpm simulation:regression --output regression.json

# 对比两个运行
pnpm simulation:compare --v0 run-v0.json --v1 run-v1.json --output comparison.json

# 生成完整导出
pnpm simulation:export --seed 20260713 --scenario NORMAL
```

### 作为包使用
```typescript
import { runSimulationPair, compareSimulationRuns } from '@zouma/simulation'

const pair = runSimulationPair({ seed: 20260713, scenario: 'NORMAL' })
const comparison = compareSimulationRuns(pair.v0, pair.v1)

console.log(comparison.recommendation) // 'SUPPORT_UPGRADE' | 'NOT_SUPPORT' | ...
```

## 架构设计

[详细架构图和说明]

## 指标体系

### 主要指标
- 模拟接单率
- 按时提交率
- 首次审核通过率
- 逾期率

### 护栏指标
- 平均接单时间
- 重新分配率
- 人工介入次数
- 分配公平性 CV

## 应用场景

1. **规则迭代验证** - 新规则上线前的风险评估
2. **压力测试** - 极端场景下的系统表现
3. **数据驱动决策** - 基于模拟数据的策略优化
4. **简历与面试** - 展示产品经理的数据分析能力

## 相关文档

- [系统设计](../../docs/simulation/system-design.md)
- [指标定义](../../docs/simulation/metrics-definition.md)
- [方法论](../../docs/simulation/methodology.md)
- [简历分析结论](../../docs/simulation/resume-analysis.md)
```

---

### Tool 4: 知识库系统 README
**文件**: `packages/knowledge/README.md`

**目的**: 说明知识库系统的设计和使用

**内容结构**:
```markdown
# 知识库系统

## 系统定位

基于 BM25 的轻量级知识检索系统，支持角色过滤、PII 清洗和引用溯源。

## 核心特性

### 1. 本地 BM25 索引
- 无需外部向量数据库
- 21 个预分块知识片段
- 中文分词优化

### 2. 角色过滤
- 运营专属章节不泄漏给用户
- 基于 `audience` 字段自动过滤

### 3. PII 清洗
- 手机号脱敏
- 精确坐标模糊化
- 订单信息过滤

### 4. 引用校验
- 每个回答必须包含引用
- 引用可折叠查看
- 防止幻觉内容

### 5. 安全降级
- 无模型密钥时返回固定提示
- 不阻塞主业务流程

## 评测结果

24 题固定评测集:
- 可回答问题召回命中率: 100% (20/20)
- 运营专属章节泄漏率: 0% (0/4)

## 快速开始

[使用示例代码]

## 架构设计

[架构图和说明]

## 相关文档

- [RAG 评测报告](../../docs/reports/adoption-v2/rag-eval-report.md)
- [知识源管理规范](./docs/knowledge-sources.md)
```

---

### Tool 5: Git 工作流指南
**文件**: `.codex/git-workflow.md`

**目的**: 标准化 Git 操作流程

**内容结构**:
```markdown
# Git 工作流指南

## 分支策略

### 主分支
- `main` - 生产就绪代码
- `develop` - 开发主线(如果需要)

### 功能分支
- `feature/{epic-n}-{description}` - 新功能
- `fix/{description}` - Bug 修复
- `refactor/{description}` - 重构
- `docs/{description}` - 文档更新

### 特殊分支
- `codex/{task-description}` - Codex 自动化任务
- `hotfix/{description}` - 紧急修复

## Commit 规范

### 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档变更
- `style` - 格式调整(不影响代码逻辑)
- `refactor` - 重构
- `test` - 测试相关
- `chore` - 构建/工具链相关

### 示例
```bash
feat(simulation): add harvest peak scenario

Add HARVEST_PEAK scenario to test system performance during harvest season.
The scenario simulates 3x normal adoption submission rate.

Closes #123
```

## PR 流程

### 1. 创建 PR 前
- [ ] 本地测试通过
- [ ] 代码格式化完成
- [ ] Commit message 规范
- [ ] 无冲突

### 2. PR 描述
使用 PR 模板(见 .github/pull_request_template.md)

### 3. Code Review
- 至少一人 approve
- CI 全部通过
- 解决所有 review comments

### 4. 合并策略
- 小功能: Squash and merge
- 大功能: Create a merge commit
- 禁止: Rebase and merge(保持历史清晰)

## 文件操作规范

### 移动文件
```bash
# 使用 git mv 保留历史
git mv old/path/file.md new/path/file.md

# 单独 commit 文件移动
git commit -m "refactor(docs): move file.md to new location"
```

### 大规模重命名
```bash
# 先移动,再修改内容
git mv ...  # 第一个 commit
# 修改内容  # 第二个 commit
```

## 安全检查

### 提交前检查
```bash
# 检查是否有敏感信息
git diff --cached | grep -i "password\|secret\|key\|token"

# 检查空白字符问题
git diff --check

# 检查文件大小
git diff --cached --stat
```

### 历史清理
如果不小心提交了敏感信息:
```bash
# 使用 git-filter-repo 清理历史
# 参考: https://github.com/newren/git-filter-repo
```

## 常见操作

### 修改最后一次 commit
```bash
# 修改 commit message
git commit --amend

# 添加遗漏的文件
git add forgotten-file.ts
git commit --amend --no-edit
```

### 暂存当前工作
```bash
# 暂存所有改动(包括未跟踪文件)
git stash push -u -m "WIP: feature description"

# 恢复暂存
git stash pop
```

### 撤销操作
```bash
# 撤销最后一次 commit(保留改动)
git reset --soft HEAD~1

# 丢弃工作区改动
git restore <file>

# 丢弃暂存区改动
git restore --staged <file>
```

## Codex 特别注意

### 自动化任务
- 总是创建 `codex/*` 分支
- 每个逻辑步骤独立 commit
- 大规模变更分多个 PR

### 文件移动
- 优先使用 `git mv`
- 移动和修改分开 commit
- 更新所有内部链接

### 提交前验证
```bash
# 必须通过的检查
pnpm type-check
pnpm build
git diff --check
```
```

---

### Tool 6: 质量门禁脚本
**文件**: `scripts/quality-gate.sh`

**目的**: 自动化质量检查

**内容**:
```bash
#!/bin/bash
set -e

echo "🚀 Running Quality Gate Checks..."

echo ""
echo "📦 Step 1: Installing dependencies..."
pnpm install --frozen-lockfile

echo ""
echo "🔍 Step 2: Type checking..."
pnpm type-check

echo ""
echo "🏗️  Step 3: Building..."
pnpm build

echo ""
echo "🧪 Step 4: Running simulation test..."
pnpm simulation:run --seed 20260713 --scenario NORMAL --output tmp/quality-gate-test.json

echo ""
echo "✨ Step 5: Checking git..."
git diff --check

echo ""
echo "✅ All quality gate checks passed!"
```

---

### Tool 7: 包管理器使用指南
**文件**: `.codex/package-manager-guide.md`

**目的**: 规范 pnpm workspace 使用

**内容结构**:
```markdown
# Package Manager 使用指南

## Workspace 结构

本项目使用 pnpm workspace + Turborepo 管理 Monorepo。

## 常用命令

### 根目录操作
```bash
# 安装所有依赖
pnpm install

# 在所有包中运行脚本
pnpm -r dev
pnpm -r build
pnpm -r test

# 使用 Turbo 并行运行
pnpm dev       # turbo dev
pnpm build     # turbo build
```

### 特定包操作
```bash
# 在特定包中运行命令
pnpm --filter @zouma/web dev
pnpm --filter @zouma/simulation test

# 添加依赖到特定包
pnpm --filter @zouma/web add react-query

# 添加开发依赖到根目录
pnpm add -D -w typescript
```

### 依赖管理
```bash
# 查看依赖树
pnpm list --depth=1

# 检查过期依赖
pnpm outdated

# 更新依赖
pnpm update

# 清理 node_modules
pnpm store prune
```

## 包间依赖

### 声明依赖
在 package.json 中:
```json
{
  "dependencies": {
    "@zouma/simulation": "workspace:*",
    "@zouma/utils": "workspace:*"
  }
}
```

### 开发时的链接
pnpm 自动处理 workspace 协议,无需手动 link。

## Turborepo 配置

### turbo.json 结构
```json
{
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

### 缓存策略
- `dev` - 不缓存,持久运行
- `build` - 缓存输出,依赖包先构建
- `test` - 依赖构建完成

## 故障排查

### 依赖安装失败
```bash
# 清理并重新安装
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Turbo 缓存问题
```bash
# 清理 Turbo 缓存
rm -rf .turbo
pnpm build --force
```

### 类型错误
```bash
# 重新生成 Prisma Client
pnpm --filter @zouma/database exec prisma generate

# 重新安装类型定义
pnpm install
```
```

---

## 📝 执行任务清单

### Phase 1: 创建基础工具文档 (2h)

- [ ] **Task 1: 创建 Codex 使用手册**
  - 文件: `.codex/README.md`
  - 内容: 项目概览、配置、工作流、规则

- [ ] **Task 2: 创建文档导航中心**
  - 文件: `docs/README.md`
  - 内容: 分类索引、快速导航、受众指引

- [ ] **Task 3: 创建 Git 工作流指南**
  - 文件: `.codex/git-workflow.md`
  - 内容: 分支策略、Commit 规范、PR 流程

- [ ] **Task 4: 创建包管理器指南**
  - 文件: `.codex/package-manager-guide.md`
  - 内容: Workspace 使用、依赖管理、故障排查

### Phase 2: 创建 Package README (3h)

- [ ] **Task 5: 创建模拟系统 README**
  - 文件: `packages/simulation/README.md`
  - 重点: 突出独立性、完整性、可复用性

- [ ] **Task 6: 创建知识库系统 README**
  - 文件: `packages/knowledge/README.md`
  - 重点: BM25 检索、角色过滤、评测结果

- [ ] **Task 7: 创建其他 Package README**
  - `packages/contracts/README.md`
  - `packages/database/README.md`
  - `packages/prompts/README.md`
  - `packages/ui/README.md`
  - `packages/utils/README.md`

### Phase 3: 创建自动化脚本 (1h)

- [ ] **Task 8: 创建质量门禁脚本**
  - 文件: `scripts/quality-gate.sh`
  - 功能: 自动化检查(类型/构建/模拟/Git)

- [ ] **Task 9: 创建文档检查脚本**
  - 文件: `scripts/check-docs.sh`
  - 功能: Markdown lint、链接检查

### Phase 4: 目录结构调整 (1h)

- [ ] **Task 10: 创建 .codex 目录**
  ```bash
  mkdir -p .codex/memory
  ```

- [ ] **Task 11: 创建 docs 子目录**
  ```bash
  mkdir -p docs/{product,tech,simulation,operations}
  ```

---

## ✅ 验收标准

### 文档完整性
- [ ] 所有工具文档已创建
- [ ] 每份文档有明确的目的和受众
- [ ] 文档间链接正确

### Codex 可用性
- [ ] Codex 能根据文档独立执行任务
- [ ] 工作流清晰无歧义
- [ ] 包含足够的示例

### 自动化程度
- [ ] 质量门禁脚本可运行
- [ ] 不依赖人工检查

---

## 🎯 下一步行动

完成这些工具文档后,Codex 就可以:

1. **自主执行仓库重构** - 基于 `CODEX_REPOSITORY_RESTRUCTURE_PLAN.md`
2. **独立开发新功能** - 遵循 `.codex/execution-rules.md`
3. **维护文档体系** - 参考 `docs/README.md`
4. **处理 Git 操作** - 按照 `.codex/git-workflow.md`
5. **管理依赖** - 使用 `.codex/package-manager-guide.md`

---

> **下一个执行命令**: 
> ```
> 请按照 docs/CODEX_EXECUTION_TOOLS.md 的 Phase 1 开始创建基础工具文档。
> 为每个文档创建独立的 commit。
> 完成后提交到 feature/codex-tools-setup 分支。
> ```
