# Codex 修复指令与注意事项

> **来源**: 走马村云脑系统全栈代码审计报告
> **审计日期**: 2026-06-25
> **适用范围**: `apps/web`, `apps/admin`, `packages/database`, `infra/docker`
> **修复原则**: 每个修复独立可回滚，先修高风险再修低风险，不改变已有的业务逻辑行为

---

## 🔴 P0 — 必须立即修复（安全隐患）

### Fix 1: Admin Token 不应通过 `NEXT_PUBLIC_` 暴露

**根因**: `apps/admin/src/lib/admin-api.ts` 中 `NEXT_PUBLIC_ADMIN_API_TOKEN` 会被内联到浏览器 JS bundle。

**修复方案**:
1. 将 `ADMIN_API_TOKEN` 变成纯服务端环境变量（去掉 `NEXT_PUBLIC_` 前缀）
2. 创建 Next.js Route Handler 作为代理层，admin 前端通过该代理调用 web API
3. 或改用 NextAuth / Iron Session 等标准鉴权方案

**具体步骤**:
- 新建 `apps/admin/src/app/api/admin-proxy/[...path]/route.ts`
- 该 route 从服务端 `process.env.ADMIN_API_TOKEN` 读取 token 并转发请求
- 修改 `admin-api.ts` 中的 `fetchAdminApi`，将请求发往 `/api/admin-proxy/...` 而不是直连 web API
- 删除 `.env` 中 `NEXT_PUBLIC_ADMIN_API_TOKEN` 变量

**注意事项**:
- 代理路由需要验证 admin 端自身的登录态（session/cookie），否则代理本身会变成公开转发器
- 如果 admin 端目前没有登录态，需要先实现 admin 登录
- 回退方案：如果暂时无法实现代理，至少改名为非 `NEXT_PUBLIC_` 前缀，并将 API 调用全部改为 Server Actions（`"use server"`）

---

### Fix 2: 村民 Token 添加密码学签名

**根因**: `apps/web/src/lib/villager-auth.ts` 中 token 仅为 Base64 编码，可任意伪造。

**修复方案**: 使用 `jose` 库（项目中已依赖）对村民 token 做 HMAC-SHA256 签名，与游客 JWT 保持一致的实现模式。

**具体步骤**:
- 修改 `createVillagerToken()`: 使用 `SignJWT` + `jwtSecret()` 签发
- 修改 `getVillagerIdFromToken()`: 使用 `jwtVerify()` 验证
- token 格式变更为 `Bearer` 或保持 `X-Villager-Token` header 不变（但值改为 JWT）

**注意事项**:
- `jwtSecret()` 从 `auth-jwt.ts` 中已有，直接复用
- JWT payload 中放入 `villagerId` 和 `iat/exp`
- 所有调用 `getVillagerIdFromToken` 的地方需要适配新的异步签名（当前为同步函数）
- `requireVillagerRecipient` 和 `requireVillagerOrAdmin` 中使用了 `getVillagerIdFromToken`，需要改为 `await`
- 村民端前端 `villager-auth-client.ts` 中的 token 存储逻辑不受影响（它只存储和发送，不解析）

---

### Fix 3: Cron Secret 改用 Header 传递

**根因**: `apps/web/src/app/api/v1/cron/daily-report/route.ts` 从 URL query 读取 secret。

**修复方案**: 从 `Authorization: Bearer <CRON_SECRET>` header 读取，而非 query string。

**具体步骤**:
- 将 `url.searchParams.get("secret")` 改为 `request.headers.get("Authorization")?.replace("Bearer ", "")`
- 同步修改调用方（定时任务脚本 `start.sh` / `start.ps1` / `start-mac.command` 中的 curl 命令）
- 确认 cron 服务的 HTTP 客户端支持自定义 header

**注意事项**:
- 需同时检查是否有其他定时任务触发器使用相同模式
- 如果 cron 由 Vercel Cron Jobs / GitHub Actions 触发，确保它们支持自定义 header
- 如果外部 cron 服务不完全可控，可先用 `X-Cron-Secret` 自定义 header 作为过渡

---

### Fix 4: OTP 改用密码学安全随机数

**根因**: 两处 OTP 生成使用 `Math.random()`。

**修复方案**: 使用 `crypto.randomInt(100000, 999999)` 替代。

**涉及文件**:
- `apps/web/src/app/api/v1/auth/request-sms/route.ts` (游客)
- `apps/web/src/app/api/v1/villager-auth/request-otp/route.ts` (村民)

**注意事项**:
- `crypto.randomInt` 是 Node.js 内置 API，无需额外安装
- 返回值是 number 而不是 string，需要 `String(crypto.randomInt(100000, 999999))`
- 游客 OTP 为 6 位纯数字，村民 OTP 也是 6 位（从代码看一致）

---

### Fix 5: OTP 接口添加频率限制

**根因**: 发送验证码接口无任何限流保护。

**修复方案**: 复用项目已有的 Redis 限流器 `checkRateLimit` + `getRateLimitKey`。

**具体步骤**:
- 在 `request-sms/route.ts` 和 `request-otp/route.ts` 的 POST 函数开头添加:
  ```ts
  const rateLimit = await checkRateLimit(getRateLimitKey(request, "otp-request"), 3, 60)
  if (!rateLimit.allowed) return rateLimitResponse(request, rateLimit.resetAt)
  ```
- 可选：基于手机号额外加一层限制（同一手机号每分钟最多 1 次）

**注意事项**:
- 限流在 mobile 校验**之前**执行，防止枚举攻击
- 同一 IP 每 60 秒最多 3 次请求验证码
- 如果部署在 Vercel 等 Serverless 平台，`x-forwarded-for` 头可能不可信，需根据平台调整 `getRateLimitKey`
- 当 Redis 不可用时，`checkRateLimit` 会放行（fallback），这不是最优但可接受

---

## 🟡 P1 — 应在本次迭代修复

### Fix 6: 文件上传路径安全加固

**根因**: `apps/web/src/app/api/v1/upload/route.ts` 和 `interactions/upload/route.ts` 的文件名处理存在风险。

**修复方案**:
1. 使用 UUID 作为存储文件名（完全放弃用户提供的文件名）
2. 原始文件名作为元数据存储到数据库
3. 添加文件大小请求体限制（Next.js `bodyParser.sizeLimit`）

**具体步骤**:
- 将 `const filename = \`${Date.now()}-${safeName}\`` 改为 `const filename = \`${randomUUID()}.${ext}\``
- 扩展名从 `file.type` 映射获取（jpeg→.jpg, png→.png, webp→.webp）
- 在 `next.config.mjs` 中添加 `bodyParser: { sizeLimit: '5mb' }`

**注意事项**:
- 两个 upload route 文件都需要修改
- UUID 使用 `crypto.randomUUID()`（Node 19+）或 `randomUUID` from `node:crypto`
- 旧文件命名风格的兼容性：如果有其他代码通过文件名模式匹配查找文件，需要一并更新

---

### Fix 7: 认养查询接口添加鉴权

**根因**: `GET /api/v1/tree-adoptions` 无鉴权，任何人可传入任意 `adopterPhone` 查询认养记录。

**修复方案**:
1. 无参数查询：需要 admin 鉴权
2. 带 `adopterPhone` 参数：需要游客 Bearer 鉴权 + 验证查询的手机号与登录用户一致

**具体步骤**:
- 修改 `tree-adoptions/route.ts` 的 GET handler
- 无 `adopterPhone` → `isAdminRequest`
- 有 `adopterPhone` → `requireTouristRecipient(request, adopterPhone)`

**注意事项**:
- 当前存储的 `adopterPhone` 是脱敏后的（`138****1234`），所以查询匹配逻辑本身就是脱敏对比
- 修复后游客只能查自己的认养记录，admin 可查全部

---

### Fix 8: 认养分布式锁 TTL 优化

**根因**: `apps/web/src/lib/adoption-lock.ts` 中 `LOCK_TTL_SECONDS = 600`（10分钟）过长。

**修复方案**: 将 TTL 降低到 120 秒（2分钟），并在前端实现"认养确认倒计时"。

**注意事项**:
- 仅修改常量值即可
- 前端需要感知锁超时时间并给用户提示
- 如果前端不做倒计时，保持 300 秒作为过渡值

---

## 🟢 P2 — 低优先级改进

### Fix 9: 生产日志清理

**涉及文件**: 20+ 处 `console.error` / `console.warn`

**修复方案**:
- 保留关键错误日志（如数据库连接失败、AI 服务不可用）
- 删除/降级调试性质的日志（如 `"[DEV] Tourist OTP code:"`
- 生产环境使用结构化日志库（如 `pino`）替代 `console.*`
- 确保日志不输出敏感信息（token、手机号、验证码）

---

### Fix 10: 列表接口添加分页

**涉及路由**:
- `GET /api/v1/nodes`
- `GET /api/v1/villagers`
- `GET /api/v1/tree-adoptions`

**修复方案**: 添加 `?page=1&pageSize=20` 查询参数，使用 Prisma 的 `skip` + `take` 实现。

---

### Fix 11: Docker Compose 密码外部化

**根因**: `infra/docker/docker-compose.dev.yml` 硬编码数据库密码。

**修复方案**: 使用 `.env` 文件 + 变量替换：
```yaml
POSTGRES_USER: ${POSTGRES_USER:-zouma}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

---

## ⚠️ 通用注意事项（给 Codex 的前置要求）

1. **不要改动 `packages/contracts/src/index.ts` 的类型定义**，除非修复必须
2. **不要修改 `prisma/schema.prisma`**，现有的数据库结构保持不变
3. **每个修复独立提交**，便于 code review 和可能的回滚
4. **修复后运行 `pnpm typecheck`** 验证无类型错误
5. **不要删除任何现有的 API 路由**，只能修改实现
6. **保持向后兼容**：现有前端代码的 API 调用方式尽量不变
7. **CORS 配置不修改**，除非 Fix 1 的代理方案需要
8. **所有环境变量变更**需要在 `docs/` 或项目 README 中更新文档
9. **测试优先**：在修复 P0 问题前，先确保理解现有的认证流程（读 `api-auth.ts` 和 `auth-jwt.ts`）
10. **不要引入新的 npm 依赖**，项目已有的 `jose` 和 `crypto` 足够完成所有修复
