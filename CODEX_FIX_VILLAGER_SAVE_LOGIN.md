# Codex 修复指令：村民保存失败 & 登录失败

> **诊断日期**: 2026-06-25
> **根因**: Web 服务进程未加载 `ADMIN_API_TOKEN`，导致所有 admin API 请求返回 401
> **分支原则**: 最小改动，不破坏现有逻辑

---

## 问题简述

1. **Admin 新增村民保存失败** → API 返回 `401 Unauthorized`
2. **现有村民无法登录** → 因 admin 保存从未成功，村民实际未入库（demo 村民可正常登录）

**原因**: 项目 `.env.local` 放在 monorepo 根目录，但 Next.js 只加载自身项目目录下的 `.env.local`（`apps/web/`、`apps/admin/`）。当前 shell 环境中已 export 了 `DATABASE_URL`、`JWT_SECRET` 等变量（故数据库可访问），但 **未 export `ADMIN_API_TOKEN`**。

---

## P0 修复：创建各 app 的 `.env.local`

### Fix 1: 创建 `apps/web/.env.local`

从根目录复制完整内容（或至少包含 ADMIN_API_TOKEN）：

```bash
cp /Users/limyoon/Desktop/workspace/aigc/.env.local /Users/limyoon/Desktop/workspace/aigc/apps/web/.env.local
```

**最少必需变量**（如果不想复制全部）:
```
ADMIN_API_TOKEN=zouma_dev_admin_token
```

> ⚠️ 注意: 该值必须与根目录 `.env.local` 中 `NEXT_PUBLIC_ADMIN_API_TOKEN` 的值完全一致

### Fix 2: 创建 `apps/admin/.env.local`

```bash
cp /Users/limyoon/Desktop/workspace/aigc/.env.local /Users/limyoon/Desktop/workspace/aigc/apps/admin/.env.local
```

**最少必需变量**:
```
NEXT_PUBLIC_ADMIN_API_TOKEN=zouma_dev_admin_token
NEXT_PUBLIC_WEB_API_BASE=http://localhost:3000/api/v1
```

### Fix 3: 重启服务

```bash
# 先停掉当前运行的 dev server (Ctrl+C)
# 然后重新启动
cd /Users/limyoon/Desktop/workspace/aigc
pnpm dev
```

---

## 验证步骤

修复后按以下顺序验证：

```bash
# 1. 验证 admin 鉴权通过
curl -s -X POST http://localhost:3000/api/v1/villagers \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: zouma_dev_admin_token" \
  -d '{"name":"验证村民","phone":"13900001111","skills":["farming"],"status":"active"}'

# 预期: 返回 201，包含创建成功的村民数据

# 2. 验证村民登录
curl -s -X POST http://localhost:3000/api/v1/villager-auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900001111"}'

# 预期: {"success":true,"message":"验证码已发送"}
```

---

## ⚠️ 注意事项

1. **不要删除根目录的 `.env.local`** — 它仍被 shell 脚本和部分工具链引用
2. **两个 `.env.local` 中的 `ADMIN_API_TOKEN` 值必须一致**（web 端用 `ADMIN_API_TOKEN` 校验，admin 端用 `NEXT_PUBLIC_ADMIN_API_TOKEN` 发送）
3. **不要修改任何源代码** — 这是纯环境配置问题，不是代码 bug
4. **重启后验证**：Next.js 只在启动时加载 `.env` 文件，修改后必须重启服务
5. **如果使用 Docker Compose 启动过数据库**，确保 PostgreSQL 和 Redis 容器在运行：
   ```bash
   docker ps | grep -E "postgres|redis"
   ```
