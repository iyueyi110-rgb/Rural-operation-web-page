# 认养一棵树，连接一个村

[![CI](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/ci.yml/badge.svg)](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/ci.yml) [![Docs](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/docs-check.yml/badge.svg)](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/docs-check.yml) [![Simulation regression](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/simulation-regression.yml/badge.svg)](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/simulation-regression.yml)

[English](README.en.md) · [文档中心](docs/README.md) · [产品需求](docs/product/PRD.md) · [规则模拟](packages/simulation/README.md)

![认养一棵树项目预览](docs/assets/social-preview.png)

> 从一棵荔枝树开始，建立人与土地的长期关系，让数字能力真正服务乡村运营。

“认养一棵树”是面向乡村文旅的认养履约与权益管理系统。它把游客选树、签约、成长陪伴、养护参与、权益兑现和收获履约，与村民任务协作、运营审核和异常处理连接成一个可追踪闭环。

## 为什么做这套系统

传统认养项目往往只完成“销售一棵树”，后续养护、凭证、权益、异常和村民协作缺少统一记录。本项目把认养关系视为一项持续履约服务：用户能看到承诺如何完成，村民知道下一步做什么，运营人员能定位风险和追溯证据。

```text
选树与签约 → 树档案与成长记录 → 养护任务与凭证 → 审核与异常处理 → 权益兑现与收获
                                  ↘ 村民协作 ↗
```

## 三项核心能力

### 1. 认养履约闭环

- 用户侧覆盖选树、认养、成长时间线、养护互动、续期、退款、采收和配送。
- 村民侧覆盖任务、通知、凭证提交和收益记录。
- 运营侧覆盖认养、任务、审核、结算、预警和报表。

### 2. 确定性规则模拟

`@zouma/simulation` 是可独立运行的 V0/V1 同世界成对测评引擎：固定种子可复现，覆盖 8 类运营场景、13 项指标和 11 类导出物。当前模拟包拥有 60 项自动化测试。

> **证据边界：模拟运营数据，不代表真实业务结果。** 当前固定 5 种子 × 8 场景回归的结果用于发现规则缺口和建立升级门槛，不应表述为真实效率或收益提升。

### 3. 知识助手与固定评测

本地知识系统使用 BM25 检索、角色过滤、PII 清洗和逐字引用校验。固定 24 题评测中，20 条可回答问题的检索召回为 20/20，运营专属内容泄漏为 0；依赖真实模型输出的完整评测仍需在模型可用时补齐。

## 产品截图

| 用户端认养入口 | 运营端规则模拟 |
| --- | --- |
| ![用户端认养入口](docs/assets/screenshots/web-adoption.png) | ![运营端规则模拟](docs/assets/screenshots/admin-simulation.png) |

截图使用演示数据，不包含真实手机号、订单、坐标或支付信息。

## 技术架构

```text
游客 / 认养用户 / 村民协作者              运营人员
              │                              │
              ▼                              ▼
     apps/web（Next.js）          apps/admin（Next.js）
              └──────────────┬───────────────┘
                             ▼
 contracts · database · knowledge · prompts · simulation · ui · utils
                             │
                             ▼
                   Prisma · PostgreSQL · Redis
```

| 类别 | 技术 |
| --- | --- |
| 应用 | Next.js 14、React 18、TypeScript |
| 数据 | Prisma、PostgreSQL、Redis |
| 工程 | pnpm workspace、Turborepo |
| 智能能力 | 本地知识检索、模型适配与安全降级、确定性规则模拟 |

详细设计见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 本地运行

要求 Node.js 20+、pnpm 11.6 和可选的 Docker Desktop。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Windows 可双击 `start.cmd`，或运行：

```powershell
.\scripts\start.ps1 -SkipBrowser
```

只演示仓库内公开降级数据时可增加 `-SkipDB`。macOS 的完整系统入口为根目录 `走马村云脑系统.command`；规则模拟工作台使用 `scripts/start-adoption-simulation-macos.sh`。

## 运行规则模拟

```bash
# 单种子、单场景 V0/V1 成对运行
pnpm simulation:run --seed 20260713 --scenario NORMAL --output outputs/simulation/pair.json

# 5 个固定种子 × 8 个场景
pnpm simulation:regression --output outputs/simulation/regression-summary.json

# 比较两个已序列化运行
pnpm simulation:compare --v0 run-v0.json --v1 run-v1.json --output comparison.json

# 导出 11 类审阅材料
pnpm simulation:export --seed 20260713 --scenario NORMAL
```

支持 `NORMAL`、`ADOPTION_PEAK`、`STAFF_SHORTAGE`、`CONTINUOUS_RAIN`、`LOW_SUBMISSION_QUALITY`、`REMOTE_ZONE_LOAD`、`REVIEW_BACKLOG`、`HARVEST_PEAK`。

## 质量门禁

```bash
pnpm quality:gate
```

该命令统一执行类型检查、测试、文档检查、构建和模拟 smoke test。各模块命令见对应 package README。

## 文档

- [产品需求与用户旅程](docs/product/PRD.md)
- [产品定位与设计原则](docs/product/PRODUCT_POSITIONING.md)
- [项目亮点](docs/product/HIGHLIGHTS.md)
- [技术架构](ARCHITECTURE.md)
- [模拟系统设计](docs/simulation/system-design.md)
- [指标口径](docs/simulation/metrics-definition.md)
- [回归结论与简历材料](docs/simulation/resume-analysis.md)
- [贡献指南](CONTRIBUTING.md)

## 使用边界

本仓库当前未声明开源许可证。未经权利人明确许可，不得再分发或用于商业用途。安全问题和敏感信息报告方式见 [SECURITY.md](SECURITY.md)。
