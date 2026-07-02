# Codex 部署执行指令 — zoumavillage.xyz

> **目标**：将走马村云脑系统部署到公网，通过 `https://zoumavillage.xyz` 访问。
> **方案**：Vercel（前端）+ Supabase（数据库）+ Upstash（Redis）
> **域名**：`zoumavillage.xyz`（前台）| `admin.zoumavillage.xyz`（后台）
> **备案**：不需要（Vercel 服务器在海外）
> **成本**：¥0（全部免费层）
> **执行者**：Codex

---

## 一、系统架构（部署后）

```
用户浏览器（国内/海外均可访问）
    │
    ▼
Cloudflare DNS（可选，加速 + 防护）
    │
    ├─ zoumavillage.xyz ──────► Vercel (apps/web, Next.js :3000)
    └─ admin.zoumavillage.xyz ► Vercel (apps/admin, Next.js :3001)
    │
    ▼
┌──────────────────────────────────────────────┐
│  外部服务（云端，无需自建）                      │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Supabase         │  │ Upstash Redis    │  │
│  │ PostgreSQL 16    │  │ 缓存 + 会话管理   │  │
│  │ 免费 500MB       │  │ 免费 256MB       │  │
│  └──────────────────┘  └──────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │ DeepSeek API     │  │ 和风天气 API      │  │
│  │ AI 路线生成       │  │ 天气 + 预报       │  │
│  └──────────────────┘  └──────────────────┘  │
│  ┌──────────────────┐                        │
│  │ 高德地图 API     │                        │
│  │ 地图 + 地理编码   │                        │
│  └──────────────────┘                        │
└──────────────────────────────────────────────┘
```

---

## 二、Codex 执行步骤

### 📋 阶段 0：前置确认（执行前必读）

Codex 在开始前必须确认：
- [ ] 域名 `zoumavillage.xyz` 已注册，在用户手中
- [ ] 用户有 GitHub 账号（用于连接 Vercel）
- [ ] 当前代码可正常 `pnpm build`（本地验证）
- [ ] 已读取 `turbo.json` 确认 20 个 `globalEnv`
- [ ] 已读取 `.env.example` 确认完整变量列表
- [ ] web app 使用 `next-intl` 插件（`next.config.mjs`）
- [ ] `NEXT_PUBLIC_WEB_API_BASE` 必须以 `/api/v1` 结尾
- [ ] `QWEATHER_API_HOST` 为 `https://nu4wcvrj9f.re.qweatherapi.com`

---

### 📋 阶段 1：创建 Supabase 数据库项目

> Codex 引导用户操作，或通过浏览器自动化完成

1. 打开 `https://supabase.com` → Sign in with GitHub
2. Create new project：
   - Name: `zouma-village`
   - Database Password: 生成强密码（保存好！）
   - Region: **新加坡（Southeast Asia）** — 国内访问最优
   - Pricing: Free
3. 等待数据库创建完成（约 2 分钟）
4. 获取连接信息：
   - Project Settings → Database → Connection string
   - 选择 **Session pooler** 模式（连接池，兼容 Vercel 无服务器环境）
   - 复制 `DATABASE_URL`，格式如：
     ```
     postgresql://postgres.xxxx:password@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```

> ⚠️ Codex 注意：Supabase 的 Prisma 需要加 `?pgbouncer=true` 参数，见阶段 3 环境变量配置。

---

### 📋 阶段 2：创建 Upstash Redis 实例

1. 打开 `https://upstash.com` → Sign in with GitHub
2. Create Redis Database：
   - Name: `zouma-redis`
   - Region: 新加坡（与 Supabase 同区）
   - Type: Redis
3. 获取连接信息：
   - 复制 `REDIS_URL`，格式如：
     ```
     redis://default:password@hostname.upstash.io:6379
     ```

---

### 📋 阶段 3：配置环境变量

Codex 需要在项目根目录创建 `.env.production.vercel` 文件（作为变量汇总，实际配置到 Vercel Dashboard）：

```bash
# ============================================
# 数据库（Supabase Session Pooler）
# ============================================
# ⚠️ 注意：必须添加 ?pgbouncer=true 参数
DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# ============================================
# Redis（Upstash）
# ============================================
REDIS_URL="redis://default:[PASSWORD]@[HOST].upstash.io:6379"

# ============================================
# CORS & 站点配置
# ============================================
CORS_ALLOWED_ORIGINS="https://zoumavillage.xyz,https://admin.zoumavillage.xyz"
NEXT_PUBLIC_SITE_URL="https://zoumavillage.xyz"
NEXT_PUBLIC_WEB_API_BASE="https://zoumavillage.xyz/api/v1"

# ============================================
# AI 模型（DeepSeek）
# ============================================
DEEPSEEK_API_KEY="<用户提供的 API Key>"
DEEPSEEK_MODEL="deepseek-chat"

# ============================================
# 和风天气
# ============================================
QWEATHER_API_KEY="<用户提供的 API Key>"
QWEATHER_API_HOST="https://nu4wcvrj9f.re.qweatherapi.com"
QWEATHER_LOCATION_ID="101040100"

# ============================================
# 高德地图
# ============================================
AMAP_KEY="<用户提供的 Key>"
NEXT_PUBLIC_AMAP_KEY="<同上>"

# ============================================
# 安全密钥（Codex 用 openssl rand -hex 32 生成）
# ============================================
JWT_SECRET="<随机生成 64 位 hex>"
CRON_SECRET="<随机生成 64 位 hex>"
ADMIN_API_TOKEN="<随机生成 64 位 hex>"
NEXT_PUBLIC_ADMIN_API_TOKEN="<与 ADMIN_API_TOKEN 相同>"

# ============================================
# 短信服务（如未配置则留空）
# ============================================
SMS_API_KEY=""
SMS_TEMPLATE_ID=""

# ============================================
# 传感器 IoT（如未配置则留空）
# ============================================
SENSOR_API_KEY=""

# ============================================
# 首页视频（可选）
# ============================================
NEXT_PUBLIC_HOME_HERO_VIDEO_URL=""
```

---

### 📋 阶段 4：数据库初始化

Codex 需要在**本地**执行（连接 Supabase 远程数据库）：

```bash
cd /Users/limyoon/Desktop/workspace/aigc

# 1. 临时设置 DATABASE_URL 指向 Supabase
export DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 2. 生成 Prisma Client
pnpm --filter @zouma/database run db:generate

# 3. 推送 Schema 到 Supabase（创建表结构）
pnpm --filter @zouma/database run db:push

# 4. 填充种子数据（可选但推荐）
pnpm --filter @zouma/database run db:seed
```

> ⚠️ Codex 注意：如果 Supabase 网络连接超时，需要检查用户本机是否开了代理。确保 DATABASE_URL 中的密码已 URL 编码。

---

### 📋 阶段 5：验证本地构建

```bash
cd /Users/limyoon/Desktop/workspace/aigc

# 构建所有包和应用
pnpm build
```

> 这一步验证代码能正常编译，发现构建错误及时修复，再推送到 GitHub。

---

### 📋 阶段 6：推送代码到 GitHub

```bash
cd /Users/limyoon/Desktop/workspace/aigc

# 如果还没有初始化 Git
git init
git add .
git commit -m "Ready for Vercel deployment"

# 创建 GitHub 仓库并推送
# Codex 通过 GitHub CLI 或引导用户手动创建
gh repo create zouma-village-system --public --source=. --remote=origin --push
```

---

### 📋 阶段 7：Vercel 部署（两个项目）

#### 7.1 导入前台 Web 项目

1. 打开 `https://vercel.com` → Sign in with GitHub
2. Add New Project → 导入 `zouma-village-system` 仓库
3. 配置：
   - **Root Directory**: `apps/web`
   - **Framework**: Next.js（自动检测）
   - **Build Command**: `cd ../.. && pnpm build --filter=@zouma/web`（覆盖默认）
   - **Install Command**: `pnpm install`
   - **Output Directory**: `.next`
4. Environment Variables：逐一填入阶段 3 的所有变量
5. Deploy

> ⚠️ Codex 注意：Vercel 默认只安装 `apps/web/package.json` 的依赖。需要在 Vercel Dashboard → Settings → General → **Root Directory** 设为 `apps/web`，然后在 Build 设置中覆盖 Install Command 为 `cd ../.. && pnpm install`。

或者更好的方式：在仓库根目录创建 `vercel.json` 配置。

#### 7.2 导入运营后台项目

1. Add New Project → 同一仓库 → 选不同目录
2. 配置：
   - **Root Directory**: `apps/admin`
   - **Framework**: Next.js
   - 同上覆盖 Build Command 和 Install Command
3. Environment Variables：与前台**完全相同**
4. Deploy

#### 7.3 绑定自定义域名

```
Vercel Dashboard → 前台项目 → Settings → Domains
添加: zoumavillage.xyz
      www.zoumavillage.xyz（重定向到主域名）

Vercel Dashboard → 后台项目 → Settings → Domains
添加: admin.zoumavillage.xyz
```

Vercel 会给每个域名一个 CNAME 目标地址（如 `cname.vercel-dns.com`）。

---

### 📋 阶段 8：DNS 解析配置

用户去域名注册商（阿里云/腾讯云/其他）的 DNS 管理页面：

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| CNAME | `@` | Vercel 给的 CNAME 地址 | 600 |
| CNAME | `www` | Vercel 给的 CNAME 地址 | 600 |
| CNAME | `admin` | Vercel 后台项目给的 CNAME 地址 | 600 |

> 等待 DNS 生效（通常 5-30 分钟），Vercel 自动签发 SSL 证书。

---

### 📋 阶段 9：验证部署

Codex 需要逐项测试：

| 测试项 | URL | 预期结果 |
|--------|-----|----------|
| 前台首页 | `https://zoumavillage.xyz` | 200 OK，四境门户加载 |
| 多语言切换 | `https://zoumavillage.xyz/en` | 英文版正常 |
| 天气 API | `https://zoumavillage.xyz/api/v1/weather` | JSON 天气数据 |
| 路线生成 | `https://zoumavillage.xyz/api/v1/routes/generate` | AI 路线返回 |
| 运营后台 | `https://admin.zoumavillage.xyz` | 后台登录页 |
| SSL 证书 | 浏览器检查 | 小锁图标，证书有效 |
| 移动端 | 手机浏览器打开 | 响应式布局正常 |

---

### 📋 阶段 10：可选增强

- [ ] 在 Vercel 开启 Analytics（免费）
- [ ] 配置 Cloudflare CDN（隐藏源站 + 防 DDoS）
- [ ] 设置 GitHub Actions 自动部署（push main 即部署）
- [ ] 配置 Supabase 自动备份
- [ ] 配置 Vercel 环境变量 Preview/Production 区分

---

## 三、环境变量速查表

| 变量名 | 谁需要 | 敏感？ |
|--------|--------|--------|
| `DATABASE_URL` | web + admin | ⚠️ 含密码 |
| `REDIS_URL` | web + admin | ⚠️ 含密码 |
| `JWT_SECRET` | web + admin | ⚠️ |
| `CRON_SECRET` | web + admin | ⚠️ |
| `ADMIN_API_TOKEN` | web + admin | ⚠️ |
| `NEXT_PUBLIC_ADMIN_API_TOKEN` | web + admin | 公开 |
| `DEEPSEEK_API_KEY` | web + admin | ⚠️ |
| `DEEPSEEK_MODEL` | web + admin | 否 |
| `QWEATHER_API_KEY` | web + admin | ⚠️ |
| `QWEATHER_API_HOST` | web + admin | 否 |
| `QWEATHER_LOCATION_ID` | web + admin | 否 |
| `AMAP_KEY` | web + admin | ⚠️ |
| `NEXT_PUBLIC_AMAP_KEY` | web + admin | 公开 |
| `NEXT_PUBLIC_SITE_URL` | web + admin | 否 |
| `NEXT_PUBLIC_WEB_API_BASE` | web + admin | 否 |
| `NEXT_PUBLIC_HOME_HERO_VIDEO_URL` | web + admin | 否 |
| `CORS_ALLOWED_ORIGINS` | web + admin | 否 |
| `SMS_API_KEY` | web + admin | ⚠️（可选） |
| `SMS_TEMPLATE_ID` | web + admin | 否（可选） |
| `SENSOR_API_KEY` | web + admin | ⚠️（可选） |

---

## 四、注意事项

1. **Supabase 连接池**：务必使用 Session Pooler 端口 `6543`，并加 `?pgbouncer=true`，否则 Prisma 迁移会失败。
2. **Vercel 免费额度**：100GB 带宽/月，课程作业绰绰有余。
3. **冷启动**：Vercel 免费层 Serverless Function 有冷启动延迟（约 1-3 秒），首次访问稍慢。
4. **构建超时**：Vercel 免费层构建限时 45 分钟，项目正常 3-5 分钟可构建完成。
5. **API Routes**：全部 API 在 `apps/web/src/app/api/v1/` 下，部署后路径为 `zoumavillage.xyz/api/v1/xxx`。
6. **管理员访问**：`admin.zoumavillage.xyz` 不需要额外部署 API，后台直接调用前台的 API。
