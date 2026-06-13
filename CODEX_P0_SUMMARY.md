# 走马村 AIGC 云脑 P0 终审流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         走马村 AIGC 云脑 P0 交付全景                           │
│                      审查结论: ✅ 通过    阻塞项: 0                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                  ┌──────────────┐
                                  │   数据底座     │
                                  │   PostgreSQL  │
                                  └──────┬───────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
    ┌────▼────┐                    ┌─────▼─────┐                  ┌──────▼──────┐
    │ 反馈管理  │                    │  AIGC 云脑  │                  │   前台 Web   │
    │ (原有)   │                    │  (新增6表)  │                  │  (零改动)    │
    └────┬────┘                    └─────┬─────┘                  └──────┬──────┘
         │                               │                               │
    ┌────▼────┐              ┌───────────┼───────────┐                   │
    │feedback │              │           │           │                   │
    │_ticket  │         ┌────▼────┐ ┌───▼────┐ ┌───▼────┐               │
    │_record  │         │  space  │ │presence│ │ unified│               │
    │(未改动) │         │  _node  │ │  _log  │ │ _order │               │
    └────────┘         │  17个   │ │ 人群   │ │ 统一   │               │
                       │  点位   │ │ 监测   │ │ 订单   │               │
                       └────┬────┘ └───┬────┘ └───┬────┘               │
                            │          │          │                    │
                       ┌────▼────┐     │    ┌─────▼─────┐              │
                       │  node   │     │    │analytics  │              │
                       │ _daily  │◄────┘    │ /consum-  │              │
                       │ _score  │          │ ption     │              │
                       │ 评分    │          └───────────┘              │
                       └────┬────┘                                     │
                            │                                           │
                       ┌────▼────┐    ┌──────────┐                     │
                       │ scoring │◄───│ QWeather │                     │
                       │ engine  │    │  (已有)  │                     │
                       │ (utils) │    └──────────┘                     │
                       └────┬────┘                                     │
                            │                                           │
              ┌─────────────┼─────────────┐                            │
              │             │             │                            │
         ┌────▼────┐  ┌────▼────┐  ┌─────▼─────┐                       │
         │  daily  │  │ report  │  │  DeepSeek │                       │
         │ _report │◄─│ genera- │◄─│    AI     │                       │
         │  日报   │  │  tor    │  │  (已有)   │                       │
         └────┬────┘  └─────────┘  └───────────┘                       │
              │                                                         │
         ┌────▼────┐                                                    │
         │  cron   │ ◄── GET /api/v1/cron/daily-report?secret=xxx        │
         │  定时   │     (外部 cron 服务 每日 23:00 触发)                 │
         └─────────┘                                                    │
                                                                         │
         ┌─────────────────────────────────────────────┐                 │
         │               Admin 后台 (7 页面)             │                 │
         ├─────────────────────────────────────────────┤                 │
         │  /dashboard  → 云脑总览 (指标+TOP5+日报+告警) │◄───────────────┘
         │  /feedback   → 反馈管理 (保留原有全部功能)    │
         │  /nodes      → 节点管理 (17节点+评分详情)     │
         │  /orders     → 消费订单 (筛选+统计+点位汇总)  │
         │  /reports    → 运营日报 (生成+列表+详情)      │
         │  /infra...   → 设施调度 (硬件待接入占位)      │
         │  /settings   → 系统设置 (不泄露密钥)          │
         └─────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════
                              新增文件 28 个
═══════════════════════════════════════════════════════════════════════════════

  数据库 ─── seed-nodes.ts
  合约   ─── [追加] SpaceNodeData / UnifiedOrderData / DailyReportData ...
  Utils  ─── scoring-engine.ts
  Prompts ─── daily-report.ts + package.json
  
  Web Lib ─── aigc-api.ts / node-scoring.ts / report-generator.ts
  
  API (8个路由):
    /nodes                          GET
    /orders                         POST GET
    /analytics/consumption/by-node  GET
    /presence                       POST GET
    /presence/series                GET
    /nodes/scores                   GET
    /nodes/scores/[slug]            GET
    /reports                        POST GET
    /reports/latest                 GET
    /cron/daily-report              GET
  
  Admin (11个文件):
    admin-shell.tsx / admin-sidebar.tsx
    admin-api.ts / admin-stat-card.tsx / admin-data-table.tsx
    dashboard/ nodes/ orders/ reports/ infrastructure/ settings/


═══════════════════════════════════════════════════════════════════════════════
                              修改文件 12 个 (全部增量式)
═══════════════════════════════════════════════════════════════════════════════

  schema.prisma     ← +6模型 (现有模型未改)
  contracts/index   ← +10类型 (现有类型未改)
  utils/index       ← +scoring导出 (现有导出未改)
  seed.ts           ← +seedNodes()调用 (现有seed未改)
  
  admin-copy.ts     ← +菜单+nodeNameMap+文案 (原有文案未删)
  layout.tsx        ← 引入AdminShell
  page.tsx          ← 改为redirect(/dashboard)
  feedback-admin.tsx← 抽取为FeedbackContent (业务逻辑未改)
  feedback/page.tsx ← 改import名
  
  web/package.json  ← +@zouma/prompts依赖
  web/next.config   ← +transpilePackages
  .gitignore        ← +*.out.log *.err.log
  pnpm-lock.yaml    ← 自动更新


═══════════════════════════════════════════════════════════════════════════════
                         审查历程: 3轮 → 0阻塞
═══════════════════════════════════════════════════════════════════════════════

  第一轮审查 (10项)
  ├─ 🔴 日志文件提交 ──────────────┐
  ├─ 🔴 重复reports/generate端点 ──┤
  ├─ 🟡 FeedbackContent本地刷新 ───┤ ab9eccfd
  ├─ 🟡 nodeNameMap中文名不准 ─────┤ fix: clean up p0
  ├─ 🟡 Reports调/generate ────────┤ admin report flow
  ├─ 🟡 title字段类型不一致 ───────┤ ✅ 5/5 修复
  ├─ 🟢 severityTone顺序 ──────────┤
  ├─ 🟢 时间线分隔符 ──────────────┤
  └─ 🟢 console.error残留 ────────┘
  
  第二轮审查 (3项残留)
  ├─ 🔴 web/dev-server.err.log ────┐
  ├─ 🟡 Nodes页noSelection文案 ────┤ 156f059d
  └─ 🟢 空reports/generate目录 ────┤ fix: remaining p0 review items
                                    │ ✅ 3/3 修复
  第三轮终审                        │
  └─ 🟢 severityTone顺序 ──────────┘ 功能等价, 无需修复
  
  最终: 0 阻塞 | 0 日志文件跟踪 | 工作树干净


═══════════════════════════════════════════════════════════════════════════════
                              下一步建议
═══════════════════════════════════════════════════════════════════════════════

  P1 短期 ──────────────────────────────────────────────────────────┐
  │                                                                  │
  │  1. 天气接入评分 ── QWeather → weatherCondition → 安全风险分     │
  │  2. 传感器API ──── POST /api/v1/infrastructure/sensors 实现      │
  │  3. 控制决策引擎 ── 传感器+天气 → AI → ControlCommand             │
  │  4. 告警引擎 ───── safetyRisk>70/水位/火险 → InfrastructureAlert │
  │  5. Infrastructure页面激活 ── 从占位→真实数据                    │
  │  6. 游客动线分析 ── 转移概率矩阵/逆行/滞留检测                   │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘

  P1→P2 中期 ───────────────────────────────────────────────────────┐
  │                                                                  │
  │  7. 消费转化漏斗 ── PresenceLog × UnifiedOrder × SpaceNode       │
  │  8. 日报增强 ──── 天气纳入建议, nuanced AI 决策                  │
  │  9. 用户管理 ──── /users 页面从占位升级                          │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘

  P2 长期 ──────────────────────────────────────────────────────────┐
  │                                                                  │
  │  10. 数字孪生地图 ── Leaflet/MapLibre + SpaceNode标注            │
  │  11. 生态趋势图 ──── 温度/降水/土壤/水质                         │
  │  12. IoT设备管理 ── Device + DeviceReading + /devices页面        │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
```
