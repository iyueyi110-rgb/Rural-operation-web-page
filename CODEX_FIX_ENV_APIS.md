# Codex 修复指令：补全环境变量 & API 密钥

> **日期**: 2026-06-25
> **目的**: 解决 Web/Admin 进程无法读取根目录 `.env.local` 的问题，补全所有缺失的外部 API 密钥
> **原则**: 仅创建配置文件，不修改任何源代码

---

## 概要

当前项目只有根目录一份 `.env.local`，但 Next.js 不向上遍历读取。需要在 `apps/web/` 和 `apps/admin/` 各自创建 `.env.local`。

---

## Step 1: 创建 `apps/web/.env.local`

**文件路径**: `/Users/limyoon/Desktop/workspace/aigc/apps/web/.env.local`

复制以下完整内容（已标注入状态）：

```bash
# ===== 数据库与缓存（✅ 已可用） =====
DATABASE_URL=postgresql://zouma:zouma_dev@localhost:5432/zouma
REDIS_URL=redis://localhost:6379

# ===== 安全凭证 =====
JWT_SECRET=zouma_dev_jwt_secret

# 🔴 P0 - Admin 鉴权（当前缺失导致全部 admin 功能 401）
ADMIN_API_TOKEN=zouma_dev_admin_token

# 🟡 P1 - 定时任务鉴权（需生成随机值）
CRON_SECRET=zouma_dev_cron_secret_change_me

# ===== 外部 API =====

# 🔴 P0 - DeepSeek AI（缺失导致全部 AI 功能不可用）
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat

# 🟡 P1 - 和风天气（缺失有 fallback，但不影响核心流程）
QWEATHER_API_KEY=
QWEATHER_LOCATION_ID=101040100
QWEATHER_API_HOST=https://nu4wcvrj9f.re.qweatherapi.com

# 🟢 P2 - 短信服务（缺失降级到 in_app 通知）
SMS_API_KEY=
SMS_TEMPLATE_ID=

# 🟢 P2 - 高德地图服务端 Key
AMAP_KEY=

# 🟢 P2 - IoT 传感器上报密钥（无硬件部署）
SENSOR_API_KEY=

# ===== 站点配置 =====
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

> ⚠️ `DEEPSEEK_API_KEY`、`QWEATHER_API_KEY` 等需要填入真实的 API Key 才能生效

---

## Step 2: 创建 `apps/admin/.env.local`

**文件路径**: `/Users/limyoon/Desktop/workspace/aigc/apps/admin/.env.local`

```bash
# 🔴 P0 - Admin 前端发送鉴权 Token（必须与 web 端 ADMIN_API_TOKEN 一致）
NEXT_PUBLIC_ADMIN_API_TOKEN=zouma_dev_admin_token

# Web API 地址（admin 前端调用后端 API 的基地址）
NEXT_PUBLIC_WEB_API_BASE=http://localhost:3000/api/v1

# 🟢 P2 - 高德地图前端 Key
NEXT_PUBLIC_AMAP_KEY=

# 站点 URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 首页 Hero 视频（可选）
NEXT_PUBLIC_HOME_HERO_VIDEO_URL=
```

---

## Step 3: 重启服务

```bash
# 停止当前 dev server（在运行 pnpm dev 的终端按 Ctrl+C）

# 重新启动
cd /Users/limyoon/Desktop/workspace/aigc
pnpm dev
```

---

## Step 4: 验证

### 4.1 验证 Admin 鉴权恢复

```bash
curl -s -X POST http://localhost:3000/api/v1/villagers \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: zouma_dev_admin_token" \
  -d '{"name":"验证测试","phone":"13900001111","skills":["farming"],"status":"active"}'
```

**预期**: 返回 `201` + 村民数据（不再返回 401）

### 4.2 验证村民登录

```bash
# 请求 OTP
curl -s -X POST http://localhost:3000/api/v1/villager-auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900001111"}'
```

**预期**: `{"success":true,"message":"验证码已发送"}`

### 4.3 验证 DeepSeek（填入 Key 后）

```bash
curl -s -X POST http://localhost:3000/api/v1/ai/query \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: zouma_dev_admin_token" \
  -d '{"question":"今天客流情况如何"}'
```

**预期**: 返回 AI 生成的回答（不再报 500 错误）

---

## 各 API Key 获取方式

| API | 获取地址 | 备注 |
|-----|---------|------|
| DeepSeek | https://platform.deepseek.com/api_keys | 充值后可用的 AI 大模型 |
| 和风天气 | https://dev.qweather.com/ | 免费版每天 1000 次调用 |
| 高德地图 | https://console.amap.com/dev/ | 需创建"Web端(JS API)"应用 |
| 短信服务 | 自行对接阿里云/腾讯云短信 | 需实现 `transport` 回调函数 |

---

## 修复后的预期状态

| 功能 | 修复前 | 修复后 |
|------|--------|--------|
| Admin 保存村民 | ❌ 401 | ✅ 正常（即使 DEEPSEEK 未配置） |
| 村民登录 | ❌ | ✅ 正常 |
| AI 问答/日报/智策 | ❌ 500 | ⚠️ 需填入 DEEPSEEK_API_KEY |
| 天气数据 | ❌ fallback | ⚠️ 需填入 QWEATHER_API_KEY |
| 地图展示 | ⚠️ Leaflet fallback | ⚠️ 需填入 NEXT_PUBLIC_AMAP_KEY |

> **最低可用标准**: 仅需 `ADMIN_API_TOKEN` + `JWT_SECRET` + `DATABASE_URL` 即可恢复全部 CRUD 功能。AI 和天气功能需单独申请 Key。

---

## ⚠️ 注意事项

1. **不要删除根目录 `.env.local`** — shell 脚本和 turbo 仍会引用
2. **三个 `ADMIN_API_TOKEN` 值必须一致**: 根 `.env.local`、`apps/web/.env.local`、`apps/admin/.env.local` 中的 `ADMIN_API_TOKEN` / `NEXT_PUBLIC_ADMIN_API_TOKEN` 要相同
3. **`.env.local` 已在 `.gitignore` 中** — 不会被提交到版本控制
4. **生产环境部署时**需替换所有 `zouma_dev_*` 为随机强密码
5. `CRON_SECRET` 在生产环境必须是随机字符串，不可用 `zouma_dev_cron_secret_change_me`
