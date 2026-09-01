# 认养一棵树

[![持续集成](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/ci.yml/badge.svg)](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/ci.yml) [![文档检查](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/docs-check.yml/badge.svg)](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/docs-check.yml) [![模拟回归](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/simulation-regression.yml/badge.svg)](https://github.com/iyueyi110-rgb/Rural-operation-web-page/actions/workflows/simulation-regression.yml)

“认养一棵树”是一个围绕乡村果树认养和持续履约设计的产品 Demo。项目重点不是完成一次认养交易，而是记录认养之后的养护任务、履约提交、审核和权益领取，让认养人能够持续了解树木状态。

目前项目完成了前后台 Demo 和规则模拟，用于验证角色权限、任务分配、材料提交、人工审核和高风险操作确认。项目不包含真实订单、支付结算或运营收入数据。

**快速入口：** [项目证据](docs/portfolio/README.md) · [功能完成情况](docs/product/FEATURE_STATUS.md) · [规则模拟](packages/simulation/README.md) · [技术架构](ARCHITECTURE.md) · [文档中心](docs/README.md)

![认养一棵树项目预览](docs/assets/social-preview.png)

## 1. 项目解决什么问题

一次认养之后，认养人需要知道树木有没有按计划养护、养护记录是否通过审核、约定权益何时可以领取。村民需要清楚本周做什么、什么时候提交、照片要拍什么。运营人员需要在同一条记录中查看任务、材料、审核和异常处理。

项目使用统一认养 ID 关联演示订单、养护任务和养护记录，主要流程为：

```text
认养 → 养护任务 → 养护记录提交 → 人工审核 → 认养权益领取 → 售后或续养
```

退款、判责和结算会影响认养关系、未领取权益或任务收益，因此这些操作只保留人工确认，不由规则或 AI 直接执行。

## 2. 目标用户与角色

| 角色         | 在 Demo 中可以做什么                                                   |
| ------------ | ---------------------------------------------------------------------- |
| 认养人       | 查看树档案、选择认养方案、查看养护记录和认养权益、提交续养或售后申请   |
| 村民养护人员 | 领取养护任务、查看截止时间和要求、上传养护照片与说明、补充被退回的材料 |
| 运营人员     | 分配任务、审核养护记录、写明退回原因、查看权益与结算状态、人工处理异常 |

当前没有真实村民接单，也没有真实认养人或运营团队使用这些页面。

## 3. 核心流程

1. 认养人查看树档案、模糊位置、养护记录和认养权益。
2. 认养人选择方案并生成待支付演示认养单，不发生真实扣款。
3. 运营人员创建养护任务并分配给村民养护人员。
4. 村民领取任务，完成养护后上传照片和说明。
5. 运营人员检查养护记录；材料不足时写明缺少内容并退回。
6. 养护记录通过后，系统继续展示认养权益、任务结算和续养状态。
7. 退款、异常判责和结算放行由运营人员人工确认。

## 4. 已实现功能

- 游客端：树木列表、树档案、认养方案、演示认养单、成长与养护记录、认养权益展示。
- 认养人端：演示登录、订单与认养记录、互动养护任务、认养权益和物流状态入口。
- 村民端：OTP 登录流程、任务筛选、任务领取、养护照片与说明上传、退回后重新提交。
- 运营后台：任务创建与分配、养护记录查看、人工审核、异常与模拟运行查看。
- 服务端：Next.js Route Handlers 提供认养、任务、审核、权益、退款工单和模拟相关接口。
- 工程验证：固定种子场景测试、权限检查、状态机测试、文档检查和构建门禁。

这些功能使用演示或模拟数据，不表示真实订单、支付、结算、村民接单或权益发放已经上线。

## 5. AI 在项目中的使用边界

AI 只提供辅助结果：

- 整理养护说明；
- 检查提交材料是否完整；
- 生成审核意见草稿；
- 从已审核资料中整理回答并附上引用；
- 为运营日报或内容文案生成可编辑草稿。

AI 不会自动审核养护记录，不会自动判责、退款或完成结算，也不能直接修改订单和任务状态。涉及养护记录审核、退款、责任判断和结算放行时，最终结果由运营人员确认。

## 6. 规则模拟与验证方法

`@zouma/simulation` 使用固定种子和场景运行认养、任务分配、提交、审核、权益和异常规则。V0 与 V1 成对运行时共享 seed、scenario、config 和 `worldHash`，便于比较同一模拟世界中的规则差异。

固定回归矩阵包含 5 个种子和 8 类场景，共 40 组。模拟只用于发现规则缺口、检查状态变化和复现异常，不用于推断真实收入、转化率、村民增收或文旅效果。

> **模拟运营数据，不代表真实业务结果。**

运行一次固定种子场景：

```bash
pnpm simulation:run --seed 20260713 --scenario NORMAL
```

更多口径和复现方式见[模拟系统说明](packages/simulation/README.md)和[方法说明](docs/simulation/methodology.md)。

## 7. 当前完成程度

当前完成的是可运行的前后台 Demo、Next.js Route Handlers、演示数据、规则模拟和自动化测试，适合验证页面流程、角色权限、状态变化与人工确认位置。

当前不包含：

- 真实认养订单；
- 微信、支付宝或其他真实支付；
- 真实退款和资金结算；
- 真实村民接单与收益发放；
- 实际运营收入、用户量或转化率；
- 已验证的乡村增收、文旅消费或社会影响结果。

## 8. 已知问题和下一步计划

- 用脱敏试点样本检查任务要求是否易懂，以及养护照片是否容易一次通过。
- 补充认养权益领取、退款后权益失效和续养提醒的完整页面状态。
- 在真实协议确定后，再细化减产、树木死亡、替代权益和退款处理规则。
- 继续检查手机端长文案、弱网上传、重复提交和版本冲突提示。
- 真实支付、结算和生产部署不在当前阶段范围内。

## 9. 本地运行方式

环境要求：Node.js 20+、`pnpm@11.6.0`。如需连接本地 PostgreSQL 和 Redis，可安装 Docker Desktop。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

默认地址：

- 用户端：`http://localhost:3000/zh-CN`
- 运营后台：`http://localhost:3001`
- 三分钟流程演示：`http://localhost:3000/zh-CN/demo`

Windows 可双击 `start.cmd`，或运行：

```powershell
.\scripts\start.ps1 -SkipBrowser
```

完整质量门禁：

```bash
pnpm quality:gate
```

## 10. 技术栈

| 类别       | 技术                                                          |
| ---------- | ------------------------------------------------------------- |
| Web 应用   | Next.js 14、React 18、TypeScript、Tailwind CSS                |
| 国际化     | next-intl（`zh-CN`、`en`、`ja`）                              |
| 数据       | Prisma、PostgreSQL、Redis                                     |
| 工程       | pnpm workspace、Turborepo                                     |
| 测试与验证 | Node.js Test Runner、固定种子规则模拟、文档检查、Next.js 构建 |
| AI 辅助    | 模型适配层、本地知识检索、可编辑草稿与人工确认                |

详细设计见[技术架构](ARCHITECTURE.md)。隐私、凭证和安全边界见[安全说明](SECURITY.md)。本仓库未授予开源许可；未经权利人明确许可，不得再分发或用于商业用途。
