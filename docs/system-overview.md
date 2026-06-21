# 走马村「云脉寿岭·荔水走马」AIGC 云脑系统

> **一句话定位：** 以 AIGC 云脑为核心的乡村数字化运营平台，将分散的人、树、园、道、院编织成可感知、可预订、可认养、可复访的服务网络。

---

## 一、项目愿景

走马村是重庆长寿区一座普通的山地村落。它没有著名景点，荔枝也不是唯一优势，古道、水系、院落各自孤立。项目的核心命题是：**如何让一座普通村庄被看见、被参与、被持续运营？**

答案是：不做景区复制，不搞炫技大屏。以真实乡村资源为核心，用数字技术做三件事：

1. **前置传播** — AIGC 生成内容，让人先在云端产生兴趣
2. **到访入口** — 认养、预约、路线生成，把"逛一下"变成"参与一次"
3. **持续运营** — 通知推送、互动任务、数据反馈，让村庄在每次活动后继续迭代

**服务人群：** 游客（认养/研学/活动）、村民（生产/任务/收益）、运营人员（监测/分析/调度）。

---

## 二、四境空间

系统围绕走马村的四类场景空间组织所有内容与功能：

| 境 | 场景 | 核心体验 | 数字能力 |
|---|---|---|---|
| **古道叙事境** | 古道节点、驿站记忆、长寿文化 | 慢行游线、村史讲述、文化研学 | AI 导览词生成、AIGC 路线规划 |
| **荔田共生境** | 荔枝种植、采摘加工、果树认养 | 从一棵树到一桌宴的消费体验 | 果树数字档案、认养系统、采摘预约 |
| **韧谷研学境** | 龙溪河、雨洪管理、水电记忆 | 自然观察、水安全教育、生态工坊 | IoT 生态感知、告警引擎、研学内容 |
| **岭上共居境** | 院落民宿、乡创办公、村民生活 | 游客停留、青年驻留、村民共享 | 院落预约、活动管理、农事日历 |

---

## 三、系统架构

### 3.1 整体架构

```
游客端 (Web/PWA, :3000)          运营后台 (:3001)           村民轻门户 (:3000/villager)
        │                              │                          │
        └──────────────┬───────────────┘                          │
                       │                                          │
              Next.js App Router (BFF 模式)                       │
                       │                                          │
        ┌──────────────┼──────────────┬───────────────┐          │
        ↓              ↓              ↓               ↓          │
    四境内容       预约票务       认养养护        通知互动  ←─────┘
        │              │              │               │
        └──────────────┴──────────────┴───────────────┘
                       │
            ┌──────────┼──────────┐
            ↓          ↓          ↓
       PostgreSQL   和风天气    AIGC 模型编排层
       + PostGIS    (实时+预报)  (DeepSeek/OpenAI/Claude)
            │
    ┌───────┼───────┐
    ↓       ↓       ↓
   IoT      告警    AI 日报
  传感器    引擎    自动生成
```

### 3.2 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | Next.js 14 App Router, React 18, TypeScript strict, Tailwind CSS, Leaflet 地图 |
| 国际化 | next-intl（zh-CN / en / ja） |
| 后端 | Next.js API Routes (BFF), Prisma ORM |
| 数据库 | PostgreSQL 16 |
| AI 模型 | DeepSeek-Chat (默认), 支持 OpenAI / Claude 扩展 |
| 天气 | 和风天气 API |
| 基础设施 | Docker Compose, pnpm + Turborepo monorepo |

### 3.3 Monorepo 结构

```
zouma-village-system/
├── apps/
│   ├── web/              # 前台 Web/PWA + API Routes (端口 3000)
│   └── admin/            # 运营后台 (端口 3001)
├── packages/
│   ├── database/         # Prisma Schema + 迁移 + 种子数据
│   ├── contracts/        # TypeScript 类型定义
│   ├── utils/            # 共享工具 (ModelProviderAdapter, 评分引擎, 控制引擎)
│   ├── prompts/          # AI 提示词模板
│   └── ui/               # 共享 UI 组件 (Section, PageHeader, StatusBadge)
├── infra/
│   └── docker/
│       └── docker-compose.dev.yml   # PostgreSQL 16
├── docs/                 # 项目文档
├── start.bat             # Windows 双击启动
├── start.ps1             # PowerShell 一键启动
└── start.sh              # Bash/Mac 一键启动
```

---

## 四、核心功能

### 4.1 六大业务域

| 业务域 | 功能 | 主要 API |
|---|---|---|
| **四境内容** | 四境首页、场景内容页、品牌故事、推荐玩法 | `GET /nodes`, `GET /nodes/scores` |
| **游线天气** | AIGC 路线生成（按时长/人群/天气）、和风天气实时+预报 | `POST /routes/generate`, `GET /weather` |
| **预约票务** | 院落预约（日历库存）、门票预购、套餐票 | `POST /courtyard-bookings`, `POST /ticket-orders` |
| **认养养护** | 荔枝树认养（季节/年度）、树档案、养护日志、采摘预约、物流发货 | `POST /tree-adoptions`, `GET /trees/[code]` |
| **反馈增长** | 意见反馈、工单流转（5 状态）、满意度评价 | `POST /feedback`, `PATCH /feedback` |
| **IoT 设施** | 传感器数据接入、设备台账、AI 决策引擎、告警系统 | `POST /infrastructure/sensors`, `GET /alerts` |

### 4.2 村民系统（Phase 7 新增）

| 功能 | 说明 |
|---|---|
| 村民登录 | 手机号 + OTP 验证码（试运营阶段明文返回，后续接入短信） |
| 任务中心 | 查看/接取/开始/完成任务，四级状态流转 |
| 收益看板 | 累计收益、本月收益、近期趋势柱状图 |
| 通知中心 | 任务分配通知、全部已读、点击跳转 |

### 4.3 通知推送系统

| 触发源 | 接收者 | 通知内容 |
|---|---|---|
| 告警触发 | 运营人员 | 夜间滞留/人流拥堵/近水风险/逆向穿行/天气预警 |
| 日报生成 | 运营人员 | 每日运营日报摘要 |
| 养护建议 | 认养游客 | 果园本周养护建议 |
| 任务分配 | 村民 | 新任务/改派通知 |
| 认养激活 | 认养游客 | 认养已激活，可开始互动任务 |

### 4.4 游客互动任务

认养激活后自动生成 7 个任务（4 次浇水 + 1 次施肥 + 1 次拍照 + 1 次日记），游客可在树详情页完成：

- 💧 浇水（10 分）| 🪴 施肥（10 分）| 📸 拍照上传（15 分）| 📝 养护日记（20 分）| 📤 分享（15 分）

---

## 五、数据模型

### 5.1 核心实体（36 个 Prisma 模型）

```
空间域                  果园认养域              预约订单域
────────              ──────────             ──────────
SpaceNode             OrchardTree            CourtyardActivity
PresenceLog           TreeCareLog            ActivityBooking
Visitor               TreeAdoption           UnifiedOrder
NodeDailyScore        HarvestBooking         Product
Device                HarvestShipment
DeviceReading
SensorReading         运营域                  通知互动域
Alert                 ──────                ──────────
ControlCommand        Villager               Notification
                      Task                   VisitorInteractionTask
                      FarmingCalendar
                      FeedbackTicket         AI 日报域
                      FeedbackHandlingRecord ────────
                      RouteGenerationLog     DailyReport
```

### 5.2 实体关系简图

```
SpaceNode ──┬── PresenceLog ─── Visitor
            ├── UnifiedOrder
            ├── Villager ─── Task
            ├── Device ─── DeviceReading
            └── Product

OrchardTree ──┬── TreeCareLog
              ├── TreeAdoption ─── VisitorInteractionTask
              └── HarvestBooking ─── HarvestShipment

CourtyardActivity ─── ActivityBooking
FeedbackTicket ─── FeedbackHandlingRecord
Alert ─── (独立，关联 nodeId)
Notification ─── (独立，关联 recipientType + recipientId)
```

---

## 六、API 概览（50 个路由）

| 分组 | 数量 | 端点示例 |
|---|---|---|
| 空间节点 | 4 | `GET /nodes`, `GET /nodes/scores`, `GET /nodes/scores/[slug]` |
| 客流数据 | 2 | `POST /presence`, `GET /presence/series` |
| 天气 | 2 | `GET /weather`, `GET /weather/alerts` |
| 路线 | 1 | `POST /routes/generate` |
| 院落预约 | 2 | `POST /courtyard-bookings`, `GET /activities` |
| 门票 | 1 | `POST /ticket-orders` |
| 活动 | 2 | `POST /activities`, `POST /activity-bookings` |
| 树木认养 | 3 | `GET /trees`, `GET /trees/[code]`, `POST /tree-adoptions` |
| 采摘 | 2 | `POST /harvest-bookings`, `POST /harvest-shipments` |
| 订单 | 1 | `GET /orders` |
| 产品 | 1 | `GET /products` |
| 村民 | 4 | `GET /villagers`, `POST /villagers`, `GET /villager/me`, `PATCH /villager/me/tasks` |
| 村民认证 | 2 | `POST /villager-auth/request-otp`, `POST /villager-auth/verify-otp` |
| 任务 | 2 | `POST /tasks`, `PATCH /tasks` |
| 农事日历 | 1 | `GET /farming-calendar` |
| 反馈 | 1 | `GET /feedback`, `POST /feedback`, `PATCH /feedback` |
| IoT 设施 | 6 | `POST /infrastructure/sensors`, `POST /infrastructure/decide`, `GET /devices` |
| 告警 | 1 | `GET /alerts`, `PATCH /alerts` |
| AI | 3 | `POST /ai/generate-content`, `POST /ai/query`, `GET /cron/daily-report` |
| 通知 | 1 | `GET /notifications`, `POST /notifications`, `PATCH /notifications` |
| 互动 | 2 | `GET /interactions`, `PATCH /interactions`, `POST /interactions/upload` |
| 分析 | 3 | `GET /analytics/consumption/by-node`, `GET /analytics/cross/flow-vs-spend` |
| 日报 | 2 | `GET /reports`, `GET /reports/latest` |
| 上传 | 1 | `POST /upload` |

---

## 七、前端页面

### 7.1 前台（游客 + 村民，:3000）

```
首页 (/)                      村民门户 (/villager)
├── 四境卡片                   ├── login — 村民登录
├── 今日天气                   ├── dashboard — 仪表盘
├── 推荐玩法                   ├── tasks — 任务列表
└── 品牌故事                   ├── earnings — 收益看板
                               └── notifications — 通知中心
四境内容 (/scenes/[slug])
├── 古道叙事境                 游客中心 (/me)
├── 荔田共生境                 ├── 订单/认养查询
├── 韧谷研学境                 └── notifications — 通知中心
└── 岭上共居境
                              其他页面
路线生成 (/routes)             ├── 活动列表 (/activities)
院落预约 (/booking)            ├── 农事日历 (/calendar)
门票预购 (/tickets)            ├── 农产品 (/products)
果树认养 (/trees)              ├── 反馈 (/feedback)
树详情 (/trees/[code])         └── 隐私 (/privacy)
```

### 7.2 运营后台（admin，:3001，21 个页面）

```
云脑总览 | 地图监控 | 反馈管理 | 节点管理 | 消费订单
树木管理 | 采摘管理 | 活动管理 | 告警中心 | 交叉分析
村民管理 | 农事日历 | 任务调度 | 内容工厂 | AI 助手
设备管理 | 农产品管理 | 运营日报 | 设施调度 | 系统设置
```

---

## 八、用户角色与功能路径

### 8.1 游客

```
进入村庄 ─── 浏览四境内容 → AIGC 生成路线 → 预约院落/购买门票
    │
    ├── 认养一棵树 → 查看树档案 → 接收养护通知 → 完成互动任务 → 采摘/收货
    │
    └── 参与活动 → 浏览农事日历 → 报名节气活动 → 留下反馈
```

### 8.2 村民

```
手机号登录 ─── 仪表盘（本月收益/待处理任务/最新通知）
    │
    ├── 任务列表 → 接取任务 → 开始执行 → 完成 → 获得收益
    │
    ├── 收益看板 → 累计 ¥ / 本月 ¥ / 近期趋势
    │
    └── 通知中心 → 新任务提醒 / 运营消息
```

### 8.3 运营人员

```
云脑总览 ─── 实时客流 / 收入 / 评分 / 热点
    │
    ├── 活动组织 → 创建活动 / 分配任务 / 管理村民 / 发布农事日历
    ├── 监测告警 → 夜间滞留 / 人流拥堵 / 近水风险 / 天气预警 / AI 异常检测
    ├── 内容运营 → AIGC 导览词 / 活动脚本 / 社交文案 / 路线生成
    ├── 数据分析 → 客流-消费交叉分析 / 路线排名 / AI 运营问答
    └── 日报复盘 → AI 自动生成日报 / 养护建议 / 设备预测 / 客流预测
```

---

## 九、AIGC 能力矩阵

| 能力 | 说明 | 调用方式 |
|---|---|---|
| **路线生成** | 按时长（半日/一日/两日）、人群（老人/亲子/普通）、天气（晴/雨/热）推荐路线，自动规避高风险节点 | `POST /routes/generate` |
| **内容工厂** | 生成三类内容：导览词（场景讲解）、活动脚本（流程+主持词+安全提示）、社交文案（小红书/公众号/短视频） | `POST /ai/generate-content` |
| **运营日报** | 聚合当日客流、订单、反馈、告警、天气、设备、村民协作等数据，AI 生成结构化日报 | `GET /cron/daily-report` |
| **养护建议** | 基于果树养护日志、天气、农事日历，生成 3-5 条本周养护建议 | 日报管线自动触发 |
| **AI 问答** | 自然语言查询运营数据（"今天客流多少？""哪个节点收入最高？"），仅从给定数据回答 | `POST /ai/query` |
| **IoT 决策** | 规则引擎（土壤湿度<30%→灌溉建议，水位>2.2m→洪水告警）+ AI 覆盖层 | `POST /infrastructure/decide` |
| **客流预测** | 基于 14 天历史数据+天气，预测明日客流量 | 日报管线自动触发 |
| **设备预测** | 分析电池读数趋势，预测设备故障 | 日报管线自动触发 |
| **异常检测** | 客流对比 14 天历史同时间段平均值，超 3σ 触发告警 | `runAnomalyDetection` |
| **反馈分类** | 提交反馈后 AI 异步建议分类与严重程度 | `POST /feedback` |

---

## 十、开发与部署

### 10.1 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 (默认: `postgresql://zouma:zouma_dev@localhost:5432/zouma`) |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（AI 功能必需） |
| `DEEPSEEK_MODEL` | 模型名 (默认: `deepseek-chat`) |
| `QWEATHER_API_KEY` | 和风天气 API Key（天气功能必需） |
| `QWEATHER_LOCATION_ID` | 和风天气城市 ID (默认: `101040100` 重庆) |
| `CRON_SECRET` | 日报生成接口鉴权密钥 |

### 10.2 一键启动

| 平台 | 命令 |
|---|---|
| Windows（双击） | `start.bat` |
| Windows PowerShell | `.\start.ps1` |
| Git Bash / Mac / Linux | `bash start.sh` |

启动流程（6 步，全自动）：

```
环境检查 → pnpm install → prisma generate → PostgreSQL 启动 → 迁移+种子 → turbo dev
```

可选参数：`-SkipDB`（跳过数据库）、`-SkipInstall`（跳过安装）、`-SkipBrowser`（不打开浏览器）。

### 10.3 手动启动

```bash
# 1. 启动 PostgreSQL
docker compose -f infra/docker/docker-compose.dev.yml up -d

# 2. 安装依赖
pnpm install

# 3. 生成 Prisma Client
cd packages/database && npx prisma generate && cd ../..

# 4. 数据库迁移 + 种子
cd packages/database && npx prisma migrate deploy && npx prisma db seed && cd ../..

# 5. 启动开发服务器
pnpm turbo dev --filter=@zouma/web --filter=@zouma/admin
```

### 10.4 访问地址

| 服务 | 地址 |
|---|---|
| 前台（游客 + 村民） | `http://localhost:3000` |
| 村民登录 | `http://localhost:3000/zh-CN/villager/login` |
| 运营后台 | `http://localhost:3001` |

---

## 附录：文档索引

| 文档 | 用途 |
|---|---|
| [PRD.md](../PRD.md) | 产品需求文档 — 目标、画像、功能、架构、时间线 |
| [DATA_STRUCTURE.md](../DATA_STRUCTURE.md) | 数据结构设计 — 实体定义、字段、API 接口列表 |
| [TASKS.md](../TASKS.md) | 任务拆解 — 11 个 Epic，优先级、依赖、验收标准 |
| [PROJECT_RULES.md](../PROJECT_RULES.md) | 编码规范 — 技术栈、目录结构、数据库规则、AI 提示词管理 |
| [fullstack-integration-guide.md](fullstack-integration-guide.md) | 全栈集成执行指令 — 村民系统 9 个 Phase 的完整代码 |
| [villager-system-implementation.md](villager-system-implementation.md) | 村民系统实现详情 — API/前端组件/i18n 代码示例 |
| [villager-system-fixes.md](villager-system-fixes.md) | 审查问题修复指令 |
| [villager-system-notes.md](villager-system-notes.md) | 开发注意事项 — 安全检查、常见错误预防 |
