# “认养一棵树”V0/V1 规则模拟交付说明

> 项目处于 Demo 与业务验证设计阶段。模拟运营数据，不代表真实业务结果。

## 交付概览

本次交付在现有 Next.js 14 + TypeScript + Prisma 单体仓库中增加独立规则模拟域。核心引擎位于 `packages/simulation`，公共 DTO 位于 `packages/contracts`，管理员 API 位于 `apps/web/src/app/api/v1/simulations`，管理工作台位于 `apps/admin/src/app/(village-work)/simulations`。

系统覆盖 8 个场景、V0/V1 成对运行、认养与任务状态机、分配/接单/提交/审核/退回/延期/履约/结算事件、13 个统一指标、固定 Bad Case、三级存储、管理员 API、CLI、管理端和 11 类导出。

## V0/V1 差异

| 环节 | V0                           | V1                                                   |
| ---- | ---------------------------- | ---------------------------------------------------- |
| 分配 | 出勤与日容量约束下名单轮转   | 技能 30%、距离 20%、负荷 20%、可靠性 20%、可用性 10% |
| 接单 | 12 小时，拒单/超时后人工重派 | 2 小时自动转派，最多 3 人后升级人工                  |
| 提醒 | 截止前一次                   | 截止前 24/6 小时并附风险规则                         |
| 提交 | 自由文本与基础凭证           | 结构化提交与“基于规则的模拟凭证检查”                 |
| 天气 | 人工处理                     | 暴雨暂停浇水、追加排水/病虫检查、更新有效截止时间    |
| 审核 | FIFO 人工审核                | 高优先级和临近权益优先，受审核员日容量约束           |

## 隔离与可追溯性

- 仅新增 `SimulationWorld`、`SimulationRun`、`SimulationEvent`、`SimulationBadCase`，不关联真实业务表。
- 所有产物标记 `dataOrigin=simulation`、运行 ID、策略版本和不可变规则修订。
- V0/V1 使用相同固定世界与 `worldHash`；不一致比较返回 422。
- 完成运行的结果、事件和 Bad Case 原子最终化后不可追加；DELETE 仅软归档，复盘字段可单独编辑。
- Prisma 不可用时降级到仓库根目录 `tmp/simulation-store/`，再降级到内存，并显式返回 `meta.degraded`。

## 操作路径

管理员先通过 `/login` 建立 8 小时 HttpOnly 会话，再进入“村民协作 → 规则模拟”，依次执行：配置/运行列表 → 运行详情 → V0/V1 对比 → 事件日志 → Bad Case → 导出。浏览器只访问 Admin 同源 BFF，不接触 Web API 服务密钥。默认一键运行同一世界的 V0/V1；全部页面持续展示来源、种子、策略版本、统计窗口和真实性声明。

CLI 入口：

```bash
pnpm simulation:run --seed 20260713 --scenario NORMAL --output outputs/simulation/pair.json
pnpm simulation:regression --output outputs/simulation/regression-summary.json
pnpm simulation:compare --v0 run-v0.json --v1 run-v1.json
pnpm simulation:export --seed 20260713 --scenario NORMAL
```

## 验收结果与环境限制

- 默认世界抽验：100 笔认养、100 棵树、20 名村民、3 名审核员、412 个任务（每单 3—5 个），并预生成 600 条按村民/日期隔离的出勤与可用性快照。
- 固定回归：5 个种子 × 8 个场景，共 40 组成对运行；每对 V0/V1 `worldHash` 相同。全矩阵状态重放断言幽灵前态、非法跳转、最终状态不一致均为 0；逾期指标、事件与 Bad Case 的任务集合完全一致。
- 自动化验证：模拟引擎 60/60、Web 模拟 API/服务 32/32、Admin 安全与模拟模块 36/36 通过；工作区类型检查 6/6、Prisma validate、Web/Admin 生产构建均通过。
- 全量基线：Web 95/96、Admin 51/52；唯一失败分别为实施前已存在的首页翻页契约与村民页错误文案契约，本次未新增失败。
- 导出：`outputs/simulation/<comparisonId>/` 下固定 11 个文件；抽验文件数为 11，报告首段包含 Demo 阶段和模拟数据免责声明。
- 无数据库生产联调通过：管理员页面未登录跳转 `/login`，未鉴权 BFF/Web API 返回 401，登录成功后通过 HttpOnly 会话与 server-only BFF 访问 Web；Prisma 不可用时自动使用 JSON 仓库并返回 `meta.degraded=true`，摘要分页、成对运行、详情、对比、事件、Bad Case 与报告导出均可用。
- 管理员登录默认使用单实例双层失败限速和 350ms 最小比较时长；多实例生产部署必须按部署文档配置共享限速存储或平台级 WAF 全局限流。
- 当前环境没有可连接的 PostgreSQL，因此未执行真实数据库事务集成测试；Prisma schema 的生成与校验已通过。JSON/内存数据不应作为长期生产审计存储。
- 不接入大模型、真实图像审核或外部网络；质量判断均为确定性规则。

详细设计见 [模拟系统](system-design.md)、[指标口径](metrics-definition.md) 与 [模拟方法](methodology.md)。
