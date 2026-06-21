# 走马村 Phase A 系统验收标准

> 版本：Phase A11
>
> 验收日期：2026-06-21（Asia/Shanghai）
>
> 验收分支：`feature/phase-a-optimization`
>
> 范围：Phase A1—A11；仅本地验收，不推送远端

## 1. 验收结论

Phase A 的数据库、Redis、游客 JWT、首页三阶流线、智策卡、地理隐私、认养体验、云脑后台、五流数据、IoT 心跳和通知联动均已完成集成验收。数据库迁移无漂移，Redis 可用，46 项单元测试、类型检查和 Lint 全部通过；游客端、村民端、运营后台及三语言页面已完成浏览器检查。

生产构建仍只出现任务开始前已经存在的 `/[locale]/routes` 服务端预渲染错误：`ReferenceError: window is not defined`。本阶段未修改该路由，也没有出现新的构建错误。管理员应用构建成功。

本次验收使用测试数据完成后已回滚测试记录，删除上传图片、临时日志并停止 3000/3001 端口的开发进程。

## 2. 核心 KPI 合同

KPI 用于上线后的连续运营评价。本地功能验收只验证计算口径、所需数据和采集链路，不用少量测试数据冒充真实运营达标率。

| KPI | 目标 | 统计口径 | 验证方式 | 当前数据条件 |
|---|---:|---|---|---|
| 认养转化率 | ≥ 8% | `认养发起人数 / 树档案独立访问人数`，同一用户同一天去重 | analytics 事件聚合与 `tree_adoption` 交叉核对 | 认养记录已具备；树档案访问事件尚需上线埋点后形成真实分母 |
| 反馈处理时效 | 中位数 < 4h | 每张工单从 `submitted` 到首次 `processing/resolved` 的时长 | `feedback_ticket` + `feedback_handling_record` SQL | 可计算 |
| 日报准点率 | 09:00 前 ≥ 95% | 统计期内 `generatedAt` 在中国时区当日 09:00 前的日报数 / 日报总数 | `daily_report` SQL | 可计算 |
| 高严重度告警响应率 | 30 分钟内 ≥ 90% | 高严重度告警从创建到首次 `acknowledged` 的时长 | 告警状态历史/API 审计 | 当前 `alert` 仅保留最终状态；上线统计前应保留确认时间或状态事件 |
| 智策卡采纳率 | ≥ 60% | `approved / (approved + rejected)`；草稿不进入已决策分母 | `recommendation` SQL/API | 可计算 |
| IoT 断线检测延迟 | < 2h | `离线告警 created_at - (lastSeenAt + 90min)` | `device` + `alert` SQL | 可计算；心跳阈值为 90 分钟 |

### 2.1 KPI 核验 SQL/API

以下 SQL 均为只读查询。时间区间由验收人替换 `:from`、`:to`；生产环境统一按 `Asia/Shanghai` 解释业务日。

#### KPI-1 认养转化率

```text
分子：analytics 中 adoption_started 的 distinct user_id
分母：analytics 中 tree_profile_view 的 distinct user_id
结果：分子 / NULLIF(分母, 0)
交叉核对：GET /api/v1/tree-adoptions 与 tree_adoption 记录数
```

树档案访问事件尚未持久化到当前 Prisma 模型，因此没有真实分母时不得发布该 KPI 数字。

#### KPI-2 反馈处理时效

```sql
WITH first_handled AS (
  SELECT
    ft.id,
    EXTRACT(EPOCH FROM (MIN(fhr.created_at) - ft.created_at)) / 3600 AS hours
  FROM feedback_ticket ft
  JOIN feedback_handling_record fhr ON fhr.ticket_id = ft.id
  WHERE fhr.status IN ('processing', 'resolved', 'closed')
    AND ft.created_at >= :from
    AND ft.created_at < :to
  GROUP BY ft.id, ft.created_at
)
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY hours) AS median_hours
FROM first_handled;
```

#### KPI-3 日报准点率

```sql
SELECT
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE ("generatedAt" AT TIME ZONE 'Asia/Shanghai')::time < TIME '09:00'
    ) / NULLIF(COUNT(*), 0),
    2
  ) AS on_time_percent
FROM daily_report
WHERE "generatedAt" >= :from AND "generatedAt" < :to;
```

#### KPI-4 高严重度告警响应率

当前表缺少 `acknowledged_at`，正式统计应由状态事件表或审计日志提供首次确认时间：

```text
GET /api/v1/alerts?severity=high&from=:from&to=:to
达标率 = acknowledged_at - created_at <= 30min 的高严重度告警数 / 高严重度告警总数
```

#### KPI-5 智策卡采纳率

```sql
SELECT ROUND(
  100.0 * COUNT(*) FILTER (WHERE status = 'approved') /
  NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')), 0),
  2
) AS adoption_percent
FROM recommendation
WHERE created_at >= :from AND created_at < :to;
```

#### KPI-6 IoT 断线检测延迟

```sql
SELECT
  d."deviceId",
  d."lastSeenAt",
  MIN(a.created_at) AS detected_at,
  EXTRACT(EPOCH FROM (
    MIN(a.created_at) - (d."lastSeenAt" + INTERVAL '90 minutes')
  )) / 60 AS detection_delay_minutes
FROM device d
JOIN alert a
  ON a."alertType" = 'device_offline'
 AND a.message LIKE '%' || d."deviceId" || '%'
WHERE d."lastSeenAt" >= :from AND d."lastSeenAt" < :to
GROUP BY d."deviceId", d."lastSeenAt";
```

## 3. 八项端到端场景

### 场景 1：游客认养全链路

**前置条件**

- PostgreSQL、Redis 和 Web 服务可用。
- 选择 `adoptStatus=available` 的树，并记录原始 `version`。
- 游客已经通过 JWT 登录，或请求包含合法手机号。

**操作步骤**

1. 打开 `/{locale}/trees/{code}`，查看树档案、模糊位置、权益和环境卡片。
2. 向 `POST /api/v1/tree-adoptions` 提交 `treeId`、`plan`、`adopterName`、`adopterPhone`。
3. 向 `PATCH /api/v1/tree-adoptions` 提交认养 ID 和 `status=active`。
4. 查询 `GET /api/v1/interactions?adoptionId=...&adopterPhone=...`。
5. 查看数字证书、互动面板和通知中心。

**预期结果**

- 认养成功，树变为 `reserved`，版本号递增。
- 首次激活异步生成 7 个互动任务，重复激活不重复生成。
- 证书可见，游客收到激活通知；公开响应不返回原始经纬度。

**证据**

```sql
SELECT "treeCode", "adoptStatus", version, "hiddenGeo"
FROM orchard_tree WHERE id = :tree_id;

SELECT id, status, "adopterId", "adopterPhone"
FROM tree_adoption WHERE id = :adoption_id;

SELECT "taskType", status, points
FROM visitor_interaction_task WHERE "adoptionId" = :adoption_id;
```

**本次实测**：认养激活成功；生成 7 个任务；数字证书存在；受保护照片上传成功并获得 15 分。

### 场景 2：村民任务完整流转

**前置条件**

- 存在 `status=active` 的村民和分配给该村民的 `pending` 任务。

**操作步骤**

1. `POST /api/v1/villager-auth/request-otp` 获取试运营验证码。
2. `POST /api/v1/villager-auth/verify-otp` 换取村民 token。
3. 使用 `X-Villager-Token` 请求 `GET /api/v1/villager/me/tasks`。
4. 按 `pending → accepted → in_progress → completed` 逐步更新任务。
5. 上传任务照片，刷新村民收益页；再尝试从 `completed` 回退到旧状态。

**预期结果**

- 合法状态流全部成功；越级、回退和跨村民访问返回 400/401。
- 完成后收益增加，任务创建/改派通知只发送一次。

**证据**

```sql
SELECT id, status, "villagerId", earnings FROM task WHERE id = :task_id;
SELECT "recipientId", category, "refType", "refId"
FROM notification WHERE "recipientType" = 'villager' AND "refId" = :task_id;
```

**本次实测**：三次合法转换均返回 200；非法回退返回 400；完成任务收益为 88；分配通知存在。

### 场景 3：日报生成与通知

**前置条件**

- 数据库包含可聚合的村民、游客、传感、商品/反馈和历史运营数据。
- AI 服务配置可用。

**操作步骤**

1. `POST /api/v1/reports`，请求体为 `{ "date": "YYYY-MM-DD" }`。
2. `GET /api/v1/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` 读取结果。
3. 打开运营后台日报和通知区域。

**预期结果**

- 日报至少包含 7 个业务板块、至少 3 个行动项。
- 心跳健康数据包含在日报中；首次创建日报产生通知，更新已有日报不重复通知。
- AI 或通知钩子失败不阻塞原业务的错误处理约定。

**证据**

```sql
SELECT id, date, jsonb_array_length(sections::jsonb) AS section_count,
       jsonb_array_length("actionItems"::jsonb) AS action_count
FROM daily_report WHERE date = :biz_date;

SELECT id, category, "refType", "refId"
FROM notification WHERE "refType" = 'daily_report' AND "refId" = :report_id;
```

**本次实测**：真实 AI 请求 14.715 秒完成，HTTP 201；日报包含 10 个板块、6 个行动项、设备心跳内容和一条首次生成通知。

### 场景 4：告警到气象智策卡

**前置条件**

- 预警输入可触发天气告警；当日不存在同类 draft/approved 智策卡。

**操作步骤**

1. 调用天气告警入口或执行告警引擎。
2. 立即查询 `GET /api/v1/alerts`。
3. 在 30 秒内查询 `GET /api/v1/recommendations?type=weather_plan&status=draft`。
4. 重复触发相同预警，检查去重。

**预期结果**

- 告警 5 秒内持久化。
- `weather_plan` 智策卡 30 秒内生成且状态为 `draft`。
- 重复触发不产生同日重复卡；智策生成失败不阻塞告警。

**证据**

```sql
SELECT id, "alertType", severity, status, created_at
FROM alert WHERE id = :alert_id;

SELECT id, "biz_date", type, status, created_at
FROM recommendation
WHERE type = 'weather_plan' AND "biz_date" = :biz_date;
```

**本次实测**：告警 234 毫秒创建；气象智策卡 19 毫秒生成，状态为 `draft`。

### 场景 5：IoT 断线降级

**前置条件**

- 创建或选取一台 `active` 设备，使 `lastSeenAt` 早于当前时间 90 分钟以上。

**操作步骤**

1. 执行设备心跳检查或生成日报。
2. 查询设备和当日 `device_offline` 告警。
3. 打开对应树详情环境卡片。
4. 将设备置为 `inactive` 后刷新页面。

**预期结果**

- 设备从 `active` 变为 `warning`；同设备同一天只有一条离线告警。
- `warning` 时环境卡显示季节历史基准并标记传感器离线。
- `inactive` 时数值隐藏为 `--`，显示维护状态。

**证据**

```sql
SELECT "deviceId", status, "lastSeenAt" FROM device WHERE "deviceId" = :device_id;
SELECT COUNT(*) FROM alert
WHERE "alertType" = 'device_offline'
  AND message LIKE '%' || :device_id || '%'
  AND created_at::date = CURRENT_DATE;
```

**本次实测**：设备成功转为 warning，告警数为 1；warning 卡片显示基准值；inactive 卡片隐藏 3 个环境数值。

### 场景 6：并发认养冲突

**前置条件**

- Redis `PING` 返回 `PONG`。
- 目标树为 `available`，记录其 ID、状态和版本。

**操作步骤**

1. 对同一棵树并发发送两次 `POST /api/v1/tree-adoptions`。
2. 记录两个响应码。
3. 查询树版本、认养记录数和 Redis 锁。

**预期结果**

- 仅一个请求成功，另一个返回 409。
- 树版本只增加 1，只有一条认养记录，事务完成后 Redis 锁释放。

**证据**

```sql
SELECT "adoptStatus", version FROM orchard_tree WHERE id = :tree_id;
SELECT COUNT(*) FROM tree_adoption WHERE "treeId" = :tree_id;
```

```text
redis-cli --scan --pattern 'adoption_lock:*'
```

**本次实测**：响应码为 200/409；版本从 1 增至 2；认养记录数为 1；锁已释放。补充指令示例写的是 201，但当前既有 POST 合同返回 200；为遵守“不改变既有 API 行为”的约束，本阶段按“一个成功响应 + 一个 409”验收并记录该差异。

### 场景 7：首页三阶流线

**前置条件**

- Web 服务可用；准备桌面和移动端视口。

**操作步骤**

1. 分别打开 `/zh-CN`、`/en`、`/ja`。
2. 检查首屏主视觉，点击“开始探索/滚动”按钮。
3. 检查四段历史长卷和四境入口。
4. 点击任意四境入口，确认跳转；在移动端检查横向溢出。

**预期结果**

- 首屏使用视频时满足 muted、loop、autoplay、playsInline；没有视频素材时使用图文 poster 回退。
- CTA 正确滚动到历史区；历史为 4 段；四境均可点击跳转。
- 三语言和移动端无页面级横向溢出。

**证据**

- 浏览器 DOM：主视觉 poster、历史区、4 个四境链接。
- 浏览器布局：`scrollWidth <= clientWidth`。

**本次实测**：三语言均显示 4 段历史和 4 个四境链接；CTA 从 `scrollY=0` 滚动至 `720`；桌面/移动端无横向溢出。按用户确认“暂时没有视频，以图文展示”，当前无视频 source，使用 `/images/home/hero-fallback.webp`。

### 场景 8：游客 JWT 与通知身份

**前置条件**

- `JWT_SECRET` 已设置；测试手机号可接收试运营验证码响应。

**操作步骤**

1. `POST /api/v1/auth/request-sms` 请求验证码。
2. `POST /api/v1/auth/verify-sms` 获取 JWT。
3. 使用 `Authorization: Bearer <token>` 请求 `GET /api/v1/auth/me`。
4. 使用非法或过期 token 再次请求。
5. 创建游客通知并打开铃铛，确认优先按 JWT `userId` 查询。

**预期结果**

- request/verify/me 均成功，token 有效期为 7 天。
- 非法、过期或已撤销 token 返回 401。
- 通知铃铛优先使用 `userId`，没有 JWT 时才回退到脱敏手机号。

**证据**

```sql
SELECT id, mobile, role, "jwtSalt", "lastLoginAt"
FROM "user" WHERE mobile = :mobile;

SELECT "recipientType", "recipientId", category, "isRead"
FROM notification WHERE "recipientId" = :user_id;
```

**本次实测**：request/verify/me 均返回 200，角色为 `visitor`；非法 token 返回 401；通知可以按 JWT 用户 ID 查询。

## 4. 完整技术检查清单

| 检查项 | 命令/方式 | 2026-06-21 结果 |
|---|---|---|
| Prisma Schema | `prisma validate` | 通过 |
| Prisma Client | `prisma generate` | 通过，v6.19.3 |
| 迁移状态 | `prisma migrate status` | 4 个迁移，数据库为最新 |
| 数据库漂移 | `prisma migrate diff ... --exit-code` | `No difference detected.` |
| Redis | `redis-cli PING` | `PONG` |
| Redis 锁残留 | 扫描 `adoption_lock:*` | 0 |
| 单元测试 | Web/Admin lib tests | 46/46 通过，0 失败 |
| 类型检查 | `pnpm type-check` | 5/5 任务通过 |
| Lint | `pnpm lint` | 5/5 任务通过，0 warning/error |
| 国际化 JSON | Node `JSON.parse` 三个 message 文件 | zh-CN/en/ja 全部通过 |
| 游客浏览器 | 首页、树详情、三语言、移动端 | 通过 |
| 管理后台浏览器 | 仪表盘、智策列表、标签与响应式 | 通过，0 console error |
| 管理后台构建 | `next build` | 通过，25/25 页面生成 |
| 全仓构建 | `pnpm build` | 仅既有 `/[locale]/routes` 的 `window is not defined` 基线失败 |
| 禁止文件 | 与 `main...HEAD` 比较 | 3 个禁止文件均未修改 |

## 5. 清理与交付边界

- 验收树 `lz018` 已恢复为 `available`、`version=1`。
- 测试认养、互动任务、村民任务、JWT 用户、日报、智策卡、告警、设备、空间节点、控制命令和通知记录均为 0 条残留。
- 村民试验 OTP 已清空。
- 受保护上传测试图片已删除，`apps/web/public/uploads` 无测试文件。
- Redis 无 `adoption_lock:*` 残留。
- 3000/3001 无监听进程；A11 临时日志已删除；浏览器验收标签已关闭并恢复默认视口。
- 未推送远端；未提交现有 `start.bat` 删除、源指令文档、快捷方式或 PDF。

## 6. 已知基线与后续数据准备

1. `/[locale]/routes` 在服务端预渲染时直接访问 `window`，属于本任务开始前已有基线。本次范围明确不修改该无关模块。
2. 当前没有视频素材，首页按用户确认使用图文 poster；后续只需配置视频地址即可接入，不影响当前三阶结构。
3. 认养转化率需要补齐树档案访问埋点；高严重度告警响应率需要持久化首次 `acknowledged` 时间。两项属于上线运营 KPI 的数据完整性前置条件，不能用测试数据代替。
