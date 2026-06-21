# 走马村系统优化 — Phase A 注意事项

> **对照文件：** `docs/optimization-execution.md`
> **原则：** 不破坏已有功能、渐进式替换、预留后续扩展接口。

---

## 一、数据库迁移注意事项

### 1.1 User 模型与现有 Villager 的关系

- `User` 是新全域用户模型，`Villager` 是村民业务模型。两者**不合并**——User 管理认证，Villager 管理村民技能/任务。
- 迁移策略：先建 `User` 表，后续 Phase B 再将 `Villager.otpCode/otpExpiry` 迁移到 User 体系。
- `TreeAdoption.adopterId` 关联 `User.id`，但当前 `adopterPhone` 仍保留——过渡期双字段共存，通过 phone 关联已有认养记录。

### 1.2 OrchardTree.version 乐观锁

- `version` 字段初始值 `@default(1)`。
- 每次 `prisma.orchardTree.update` 时需要在 where 条件中加 `version: currentVersion`，并在 data 中 `version: { increment: 1 }`。
- Prisma 不支持原子 increment + where 在同一 update 中——**必须用 `prisma.$transaction` 包裹**：
  ```ts
  await prisma.$transaction(async (tx) => {
    const tree = await tx.orchardTree.findUnique({ where: { id } })
    if (!tree || tree.adoptStatus === "maintenance") throw new Error("unavailable")
    return tx.orchardTree.update({
      where: { id, version: tree.version },
      data: { adoptStatus: "reserved", version: { increment: 1 } },
    })
  })
  ```
- 如果 update 返回 `null`（版本不匹配），回滚事务并返回 409。

### 1.3 hiddenGeo 与现有 lat/lng

- `hiddenGeo` 不替代 `lat/lng`——原始坐标仍存储在后端，但**前端 API 响应只暴露 `hiddenGeo`**。
- `tree-geo.ts` 的 `toGridId()` 函数负责转换。网格精度固定在 ~100m，避免反向推导精确位置。
- 在 AI 路线生成的 prompt 中，经纬度必须替换为 `hiddenGeo` 后再发送。

---

## 二、Redis 集成注意事项

### 2.1 Redis 不可用时系统降级

- Redis 可能因容器未启动或网络问题不可用。**所有 Redis 操作必须 try-catch**，失败时降级为无锁模式：
  ```ts
  try {
    lockToken = await acquireAdoptionLock(treeId, userId)
  } catch {
    console.warn("Redis unavailable, proceeding without lock")
    lockToken = "fallback"
  }
  ```
- `enableOfflineQueue: false` 确保 Redis 离线时立即报错而非无限排队。

### 2.2 锁过期时间

- `LOCK_TTL_SECONDS = 600`（10 分钟）覆盖微信/支付宝支付回调的最大等待时间。
- 支付成功后必须**主动释放锁**，不要等 TTL 过期——避免下一个认养者等 10 分钟。
- 如果用户取消认养或支付超时，锁可被新请求覆盖（`SET NX` 在旧 key 过期后生效）。

### 2.3 docker-compose 变更

- 新增 Redis 服务后，`start.ps1` 的 `docker compose up -d` 会自动启动 Redis。
- 但 `start.ps1` 中没有 Redis 健康检测——不影响启动，Redis 不可用时系统降级运行。
- Redis 数据卷 `redis_data` 不会在 `docker compose down` 时删除（与 pgdata 一致）。

---

## 三、JWT 认证注意事项

### 3.1 密钥管理

- `JWT_SECRET` 默认值 `zouma_dev_jwt_secret` 仅用于本地开发。
- 上线前必须更换为随机 256-bit 密钥：`openssl rand -base64 32`
- 密钥变更会使所有已签发 token 失效——生产环境需提前通知用户重新登录。

### 3.2 与现有 Villager Auth 共存

- 当前村民登录使用 `villager-auth.ts` 的 base64 token。
- **本次不替换村民认证**——新增的 JWT 体系用于游客（User），村民继续用 OTP + base64 token。
- Phase B 时统一迁移到 JWT。

### 3.3 通知系统迁移

- 当前通知 `recipientId` 对游客使用 `adopterPhone`（脱敏）。
- JWT 上线后，`recipientId` 改为 `userId`。
- 迁移期间需兼容：通知查询同时支持 phone 和 userId 格式的 `recipientId`。
- `notification-bell.tsx` 改为从 `auth-client.ts` 获取 userId，不再从 localStorage 读 phone。

### 3.4 中间件范围

- JWT 验证**不在 Next.js middleware 层强制**——middleware 仅做 i18n 路由。
- 鉴权在 API route handler 内部，通过 `verifyJWT(request)` 手动调用。
- 非强制登录的 API（如 `GET /scenes`、`GET /weather`）不需要改。

---

## 四、前端首页重构注意事项

### 4.1 现有功能保留

- **Header 导航栏保留**——只改 Hero 区域内部的内容区块。
- **天气模块保留**——移到 Map 网关下方或 Hero 底部。
- **Booking/Adoption 预览保留**——放到 Map 网关之后。
- 四境卡片**不删除**——改为通过 Map 网关的交互多边形实现同样的跳转效果。

### 4.2 视频加载优化

- Hero 背景视频必须：`preload="metadata"`、`muted`、`loop`、`playsinline`。
- 提供 `<video poster="/images/home/hero-fallback.webp">` 作为首帧占位。
- 视频文件放在 `public/videos/` 下，控制在 5MB 以内（10 秒循环，720p）。
- 弱网环境：CSS 背景色作为最低降级。

### 4.3 历史内容的准确性

- 历史叙事四段内容引用走马村真实文物证据链：
  - 唐代乐温县建制（《长寿区志》）
  - 荔枝古道（《涪州志》天宝年间妃子园记载）
  - 清代光绪二十三年指路碑（走马岭出土实物）
  - 当代走马村四境规划
- **必须严格区分"长寿区凤城街道走马村"与"九龙坡区走马古镇"**——两者是不同的地理实体。
- AIGC 生成的历史文案必须经人工校对后才能上线。

### 4.4 地图选型

- 当前系统使用 Leaflet + OpenStreetMap。
- 方案要求 AMap JSAPI 2.5D。**如果 AMap API Key 未配置，降级使用 Leaflet**。
- Map 网关的交互多边形可在 Leaflet 上通过 GeoJSON 图层实现。

---

## 五、智策卡注意事项

### 5.1 生成频率

- 智策卡**每日生成一次**（与日报同步），不由用户请求触发。
- `POST /recommendations/generate` 检查当日是否已有 draft/approved 的智策卡——有则跳过。
- AI 调用成本约等于一次日报生成——控制在日配额内。

### 5.2 action_steps 安全

- `action_steps` 中的 `api_trigger_endpoint` **不能直接执行外部 URL**——必须是系统内部 API 路径。
- 审核通过时，验证 `api_trigger_endpoint` 的白名单：
  - `/api/v1/scenes/promotion/active`
  - `/api/v1/tasks`
  - `/api/v1/notifications`
  - `/api/v1/alerts`
- 不在白名单内的 endpoint 拒绝执行，记录审计日志。

### 5.3 与现有日报的关系

- 智策卡**不替代日报**——日报是数据汇总，智策卡是行动建议。
- 日报 action items 中标注 `source: "recommendation"` 的条目由智策卡系统接管。
- admin 后台新增"智策中心"菜单项，展示 draft/approved/executed 三种状态的智策卡列表。

---

## 六、不破坏已有功能的红线

### 6.1 禁止修改的文件

- `packages/utils/src/model-provider-adapter.ts` — ModelProviderAdapter 核心（如需 model tiering，新增 `ModelProviderRouter` 而非修改现有适配器）
- `apps/web/src/lib/aigc-api.ts` — `jsonResponse` / `optionsResponse` 基础函数
- `apps/web/src/middleware.ts` — 国际化路由中间件
- 所有已有 API 路由的现有 handler 逻辑——只在 handler 前后追加代码

### 6.2 数据库迁移安全

- 新增表 `User`、`UserProfile`、`Recommendation`、`RoutePlan`——均为 CREATE TABLE。
- 修改表 `OrchardTree`、`TreeAdoption`——均为 ALTER TABLE ADD COLUMN（`hiddenGeo`、`version`、`rightsJson`），有 DEFAULT 值或允许 NULL。
- **不执行任何 DROP、RENAME、类型修改。**

### 6.3 依赖不膨胀

- 新增依赖仅：`ioredis`（Redis）、`jose`（JWT）。
- `jose` 是纯 JS 实现，无需原生编译，跨平台兼容。
- 不引入 `jsonwebtoken`（依赖 Node.js crypto 旧 API）、`bcrypt`（需原生编译）。

---

## 七、后续升级路径

| 当前方案 | Phase B 升级目标 | Phase C 升级目标 |
|---|---|---|
| Next.js API Routes (BFF) | NestJS 独立后端（先迁认证模块） | 全量迁移 |
| cron + Prisma（日报） | Apache Airflow + dbt | 实时流处理 |
| jose JWT + base64 villager token | 统一 JWT 体系 | OAuth2/OIDC |
| `in_app` 通知 | SMS 短信网关 | 微信模板消息 + 小程序订阅消息 |
| Leaflet 地图 | AMap JSAPI 2.5D | PostGIS 路径规划 |
| Redis 单机 | Redis Sentinel | Redis Cluster |
| 智策卡手动审核 | 半自动执行（高置信度自动批准） | 全自动闭环 |
| `hiddenGeo` 网格脱敏 | PostGIS Geometry + 服务端空间计算 | AI 路线避让高危区域 |

---

## 八、常见错误预防

1. **Prisma relation 冲突：** `TreeAdoption.adopter` 关系指向 `User`，但现有 `adopterId` 字段已存在且为 `String?`。**确认** `@relation` 的 `references` 指向 `User.id` 而非其他模型。

2. **Redis 连接字符串格式：** `ioredis` 期望 `redis://host:port`，不是 `http://`。Docker Compose 中的服务名 `redis` 在容器间网络可用，但宿主机需用 `localhost`。

3. **jose JWT 密钥格式：** `jose` 的 `SignJWT` 需要 `Uint8Array` 格式的密钥——用 `new TextEncoder().encode(secret)` 转换，不要直接传字符串。

4. **`page.tsx` 重构范围过大：** 不要删除整个 page.tsx 重写——逐步替换。先注释旧 Hero，引入新 HeroScreen 测试正常后再替换下一段。保留 Header 不动。

5. **视频文件路径：** Next.js `public/` 目录下的文件可直接用 `/videos/hero.mp4` 引用。但大视频文件不应提交 Git——用 `.gitignore` 排除，或使用外部 CDN URL。

6. **JWT 与 villager token 共存时的通知查询：** `GET /notifications?recipientId=X` 中的 X 可能是 userId（新）或 villagerId（旧）。需要在 notification 查询中同时尝试两种匹配。

7. **`createAlertIfAbsent` 未导出：** `alert-engine.ts` 中的 `createAlertIfAbsent` 是模块私有函数。`device-heartbeat.ts` 不能直接调用它——已修正为在 heartbeat 函数内部自带去重逻辑（`findFirst` before `create`）。

8. **A5 与 A10 修改同一文件 report-generator.ts：** A5 在函数末尾追加智策卡钩子，A10 在并行数据获取数组中追加心跳检查。两个修改点不同，但 Codex 执行时需确保两个点都被命中——先改 `Promise.all` 数组（A10），再改函数末尾（A5）。

9. **User.otpCode/otpExpiry 字段：** 已修正——A1 的 User 模型现在包含这两个字段。试运营阶段 OTP 明文返回，Phase B 接入短信后改为只发短信不返回。

10. **trees/[code]/page.tsx 需同时保留 InteractionPanel 和新组件：** 该文件已有原始 Codex 的 InteractionPanel 改动。新增的环境卡片/权益面板/生长动画应追加在 InteractionPanel 之前或之后，不能覆盖掉 InteractionPanel 的 import 和渲染。
