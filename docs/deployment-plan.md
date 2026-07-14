# 走马村云脑系统 — 上线部署计划 (Codex 执行版)

> **目标**：将整个系统（前端 Web + 运营后台 + API 后端 + 数据库）部署到公网，让任何人通过网址访问。
> **执行者**：Codex（AI 编程助手）
> **预计工期**：3-5 天（含域名备案等待）

---

## 一、部署架构总览

```
用户浏览器
    │
    ▼
┌──────────────────────────────────────────────┐
│  CDN / 反向代理 (Nginx / 云负载均衡)          │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ zomavillage  │  │ admin.zoma   │          │
│  │ .com         │  │ village.com  │          │
│  │ (前台 Web)   │  │ (运营后台)    │          │
│  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                   │
│         ▼                 ▼                   │
│  Next.js Server    Next.js Server             │
│  (Port 3000)       (Port 3001)                │
└──────────┬──────────────┬────────────────────┘
           │              │
           ▼              ▼
┌──────────────────────────────────────────────┐
│  服务层                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Redis   │  │ 外部 API │   │
│  │  数据库   │  │  缓存    │  │ 和风天气  │   │
│  │          │  │          │  │ DeepSeek │   │
│  │          │  │          │  │ 高德地图  │   │
│  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────┘
```

---

## 二、推荐方案对比

| 维度               | 方案 A: 国内云服务器    | 方案 B: Vercel + 云数据库 | 方案 C: Docker 自建 |
| ------------------ | ----------------------- | ------------------------- | ------------------- |
| **适合场景**       | 面向国内用户、需ICP备案 | 快速上线、面向海外        | 完全自主可控        |
| **前端托管**       | 阿里云/腾讯云 ECS       | Vercel（免费层足够）      | 自有 VPS            |
| **数据库**         | 云数据库 RDS PostgreSQL | Supabase / Neon           | Docker 自建         |
| **Redis**          | 云 Redis                | Upstash Redis             | Docker 自建         |
| **国内访问速度**   | ⭐⭐⭐⭐⭐              | ⭐⭐（可能被墙或慢）      | ⭐⭐⭐⭐            |
| **运维难度**       | ⭐⭐⭐                  | ⭐                        | ⭐⭐⭐⭐            |
| **月成本（估算）** | ¥200-500                | ¥0-150                    | ¥100-300            |
| **域名备案**       | 必须                    | 不需要                    | 国内必须            |
| **推荐指数**       | ⭐⭐⭐⭐⭐              | ⭐⭐⭐                    | ⭐⭐⭐              |

> **强烈推荐方案 A**：走马村面向国内用户，需要微信支付、支付宝，国内云服务器是最稳妥的选择。

---

## 三、方案 A 详细执行步骤（国内云服务器）

### 阶段 0：前置准备（第 1 天）

#### 0.1 注册域名

- [ ] 在阿里云（万网）或腾讯云注册域名，建议：`zomavillage.com` 或 `zoumacun.cn`
- [ ] 完成实名认证

#### 0.2 购买云服务器

- [ ] 阿里云 ECS 或腾讯云 CVM
- [ ] 配置建议：2 核 4GB，系统盘 40GB + 数据盘 100GB
- [ ] 操作系统：Ubuntu 22.04 LTS
- [ ] 开通 80/443 端口（HTTP/HTTPS）

#### 0.3 购买云数据库（可选，推荐）

- [ ] PostgreSQL 16 云数据库（RDS），基础版即可
- [ ] 或使用 Supabase（有免费层，国内访问需测试）

#### 0.4 ICP 备案（国内必须）

- [ ] 提交 ICP 备案申请（阿里云/腾讯云控制台操作）
- [ ] 备案周期：7-20 个工作日
- [ ] ⚠️ 备案期间可先用 IP + 端口访问进行测试

---

### 阶段 1：服务器环境搭建（Codex 自动化）

#### 1.1 服务器基础环境

```bash
# Codex 通过 SSH 连接服务器，执行以下步骤：

# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装 pnpm
npm install -g pnpm@11.6.0

# 4. 安装 Nginx
sudo apt install -y nginx

# 5. 安装 Docker & Docker Compose（用于本地 PostgreSQL + Redis）
sudo apt install -y docker.io docker-compose-v2

# 6. 安装 PM2（进程管理）
npm install -g pm2

# 7. 安装 Certbot（免费 SSL 证书）
sudo apt install -y certbot python3-certbot-nginx
```

#### 1.2 数据库和 Redis

```bash
# 创建 docker-compose.prod.yml
# Codex 将在服务器上创建此文件并启动服务
```

#### 1.3 克隆代码 & 安装依赖

```bash
# 在服务器上
cd /opt
git clone <你的仓库地址> zouma-village
cd zouma-village
pnpm install
```

---

### 阶段 2：环境变量配置（Codex 自动化）

#### 2.1 创建生产环境变量文件

Codex 需要在项目根目录创建 `.env.production` 文件，包含以下变量：

```bash
# === 数据库 ===
DATABASE_URL="postgresql://zouma:<强密码>@localhost:5432/zouma"

# === Redis ===
REDIS_URL="redis://localhost:6379"

# === JWT ===
JWT_SECRET="<生成一个随机64位字符串>"

# === CORS ===
CORS_ALLOWED_ORIGINS="https://zomavillage.com,https://admin.zomavillage.com"
NEXT_PUBLIC_SITE_URL="https://zomavillage.com"
NEXT_PUBLIC_WEB_API_BASE="https://zomavillage.com/api/v1"

# === AI 模型 ===
DEEPSEEK_API_KEY="<你的 DeepSeek API Key>"
DEEPSEEK_MODEL="deepseek-chat"

# === 和风天气 ===
QWEATHER_API_KEY="<你的和风天气 API Key>"
QWEATHER_API_HOST="https://nu4wcvrj9f.re.qweatherapi.com"
QWEATHER_LOCATION_ID="101040100"

# === 高德地图 ===
AMAP_KEY="<你的高德地图 Key>"
NEXT_PUBLIC_AMAP_KEY="<同上>"

# === 短信服务（阿里云/腾讯云 SMS）===
SMS_API_KEY="<短信 API Key>"
SMS_TEMPLATE_ID="<短信模板 ID>"

# === 传感器/IoT ===
SENSOR_API_KEY="<传感器 API Key>"

# === 管理后台 ===
ADMIN_API_TOKEN="<生成一个随机 Token>"
WEB_API_BASE="https://zomavillage.com/api/v1"
ADMIN_LOGIN_PASSWORD="<生成一个独立的管理员口令>"
ADMIN_SESSION_SECRET="<生成一个独立的 64 位随机字符串>"

# 登录失败限制默认使用单实例有界内存；多实例部署需接入共享 store
# 或在平台网关配置等价的全局 /api/admin/session 失败限制。

# === 定时任务 ===
CRON_SECRET="<生成一个随机字符串>"

# === 首页视频（可选）===
NEXT_PUBLIC_HOME_HERO_VIDEO_URL=""
```

#### 2.2 确认 turbo.json 中的全局环境变量

Codex 需要检查 `turbo.json` 中的 `globalEnv` 列表，确认所有必需变量都已配置。

---

### 阶段 3：构建与部署（Codex 自动化）

#### 3.1 数据库迁移

```bash
# 在服务器项目目录下
cd /opt/zouma-village

# 生成 Prisma Client
pnpm --filter @zouma/database run db:generate

# 执行数据库迁移
pnpm --filter @zouma/database run db:push

# （可选）填充种子数据
pnpm --filter @zouma/database run db:seed
```

#### 3.2 构建项目

```bash
# 构建所有包和 app
pnpm build
```

#### 3.3 使用 PM2 启动服务

Codex 创建 `ecosystem.config.cjs` 文件（注意 monorepo 中 next 命令的实际路径）：

```javascript
module.exports = {
  apps: [
    {
      name: "zouma-web",
      script: "pnpm",
      args: "--filter @zouma/web start",
      cwd: "/opt/zouma-village",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      // 从根目录 .env.production 加载环境变量
      env_file: "/opt/zouma-village/.env.production",
    },
    {
      name: "zouma-admin",
      script: "pnpm",
      args: "--filter @zouma/admin start",
      cwd: "/opt/zouma-village",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
      env_file: "/opt/zouma-village/.env.production",
    },
  ],
}
```

```bash
# 确保在项目根目录执行
cd /opt/zouma-village
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # 开机自启（按提示执行输出的命令）
```

---

### 阶段 4：Nginx 反向代理 & HTTPS（Codex 自动化）

#### 4.1 Nginx 配置

Codex 需要创建 `/etc/nginx/sites-available/zouma`：

```nginx
# 前台 Web
server {
    listen 80;
    server_name zomavillage.com www.zomavillage.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 运营后台
server {
    listen 80;
    server_name admin.zomavillage.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4.2 启用站点 & SSL

```bash
sudo ln -s /etc/nginx/sites-available/zouma /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 申请 SSL 证书
sudo certbot --nginx -d zomavillage.com -d www.zomavillage.com -d admin.zomavillage.com
```

---

### 阶段 5：防火墙 & 安全加固（Codex 自动化）

```bash
# 配置 UFW 防火墙
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 3000   # 不直接暴露应用端口
sudo ufw deny 3001
sudo ufw deny 5432   # 不暴露数据库
sudo ufw deny 6379   # 不暴露 Redis
sudo ufw enable

# 数据库安全：仅允许本地连接
# PostgreSQL 的 pg_hba.conf 确保只有 localhost 可连接
```

---

### 阶段 6：CI/CD 自动部署（可选但推荐）

#### 6.1 GitHub Actions 配置

Codex 创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/zouma-village
            git pull origin main
            pnpm install
            pnpm build
            pm2 reload all
```

---

## 四、Codex 执行任务清单

### 📋 Task 1：服务器准备

- [ ] 协助用户在阿里云/腾讯云购买 ECS/CVM 服务器
- [ ] 协助用户注册域名
- [ ] 生成 SSH Key 并配置免密登录
- [ ] 在服务器上执行阶段 1 所有安装命令

### 📋 Task 2：数据库部署

- [ ] 在服务器上创建 `docker-compose.prod.yml`（PostgreSQL 16 + Redis 7）
- [ ] 启动容器并验证连通性
- [ ] 创建数据库 `zouma` 和用户（设置强密码）
- [ ] 执行 Prisma 迁移 `pnpm --filter @zouma/database run db:push`
- [ ] （可选）执行种子数据 `pnpm --filter @zouma/database run db:seed`

### 📋 Task 3：环境变量

- [ ] 向用户收集所有必需的 API Key
- [ ] 在服务器项目根目录创建 `.env.production`
- [ ] 使用 `openssl rand -hex 32` 生成安全的随机密钥
- [ ] 验证所有变量与 `turbo.json` 中 `globalEnv` 列表一致

### 📋 Task 4：构建与启动

- [ ] 克隆代码到服务器 `/opt/zouma-village`
- [ ] 安装依赖 `pnpm install`
- [ ] 执行构建 `pnpm build`（Turbo 自动处理包依赖顺序）
- [ ] 创建 `ecosystem.config.cjs` 并启动 PM2
- [ ] 验证 `pm2 status` 两个进程均为 `online`

### 📋 Task 5：Nginx + HTTPS

- [ ] 创建 Nginx 配置文件（前台 + 后台双域名）
- [ ] 配置域名 DNS 解析（A 记录指向服务器 IP）
- [ ] 申请 Let's Encrypt SSL 证书
- [ ] 验证 `https://zomavillage.com` 和 `https://admin.zomavillage.com` 可访问

### 📋 Task 6：Admin 后台保护

- [ ] 为 admin 子域名添加 HTTP Basic Auth 或 IP 白名单
- [ ] 确保 ADMIN_API_TOKEN 验证正常工作

### 📋 Task 7：监控与日志

- [ ] 配置 PM2 日志轮转 `pm2 install pm2-logrotate`
- [ ] 配置 Nginx 访问日志格式
- [ ] 设置磁盘空间告警脚本

### 📋 Task 8：验证测试

- [ ] 前台首页正常加载（含 i18n 多语言切换）
- [ ] 四境内容页正常展示
- [ ] AIGC 路线生成 API 正常
- [ ] 认养系统（树档案、互动任务）正常
- [ ] 院落预约 + 门票预购流程正常
- [ ] 天气 API 数据正常返回
- [ ] Admin 后台登录和数据管理正常
- [ ] 移动端响应式布局正常
- [ ] 村民系统（任务中心、收益看板）正常
- [ ] 通知推送功能正常

---

## 五、🧑 用户需要完成的准备工作清单

> ⚠️ **以下事项必须由你（用户）亲自完成，Codex 无法代办。**

### 必须做（缺一不可）

| 序号 | 事项                            | 说明                                                                    | 预计耗时   |
| ---- | ------------------------------- | ----------------------------------------------------------------------- | ---------- |
| 1    | **注册域名**                    | 阿里云万网或腾讯云，建议 `zomavillage.com` 或 `zoumacun.cn`，需实名认证 | 1 小时     |
| 2    | **购买云服务器**                | 阿里云 ECS / 腾讯云 CVM，2核4GB，Ubuntu 22.04，开通 80/443 端口         | 30 分钟    |
| 3    | **完成 ICP 备案**（国内服务器） | 在云服务商控制台提交，需身份证、手持照片等材料，周期 7-20 个工作日      | 2 小时准备 |
| 4    | **准备 API Key 清单**           | 见下方表格，逐一注册获取                                                | 1-2 小时   |
| 5    | **提供服务器 SSH 登录信息**     | IP 地址、root 密码或 SSH 密钥，给 Codex 用于自动化部署                  | 5 分钟     |

### API Key 准备清单

| 服务           | 用途                       | 注册地址              | 是否免费   | 你的状态  |
| -------------- | -------------------------- | --------------------- | ---------- | --------- |
| **DeepSeek**   | AIGC 路线生成、AI 导览词   | platform.deepseek.com | 按量付费   | ⬜ 需注册 |
| **和风天气**   | 实时天气 + 预报 + 路线降级 | dev.qweather.com      | 免费层可用 | ⬜ 需注册 |
| **高德地图**   | 地图展示 + 地理编码        | console.amap.com      | 免费层可用 | ⬜ 需注册 |
| **短信服务**   | 村民登录 OTP 验证码        | 阿里云/腾讯云 SMS     | 按量付费   | ⬜ 可选   |
| **传感器 IoT** | 韧谷水位/环境监测          | 按实际硬件厂商        | —          | ⬜ 可选   |

### 建议做（锦上添花）

| 序号 | 事项                              | 说明                                              |
| ---- | --------------------------------- | ------------------------------------------------- |
| 6    | **对象存储 OSS**                  | 阿里云 OSS / 腾讯云 COS，存放图片、视频等静态资源 |
| 7    | **GitHub 仓库设为私有或推送代码** | 便于 CI/CD 自动部署                               |
| 8    | **准备微信支付商户号**            | 需要企业资质，个人暂不可用                        |
| 9    | **Cloudflare CDN**（可选）        | 免费 DDoS 防护 + 全球加速                         |

---

## 六、Codex 执行前自检清单

> Codex 在开始部署前必须逐项确认：

- [ ] 用户已提供服务器 IP 和 SSH 登录凭证
- [ ] 用户已注册域名并提供域名
- [ ] 用户已确认使用哪个方案（A/B/C）
- [ ] 已读取 `.env.example` 确认完整环境变量列表（20 个变量）
- [ ] 已读取 `turbo.json` 确认 `globalEnv` 与 `.env.example` 一致
- [ ] 已读取 `apps/web/next.config.mjs` — 注意 `transpilePackages` + `next-intl` 插件
- [ ] 已读取 `apps/admin/next.config.mjs` — 注意 `transpilePackages`
- [ ] 已确认 PostgreSQL 16 + Redis 7 版本
- [ ] 已确认 `NEXT_PUBLIC_WEB_API_BASE` 必须以 `/api/v1` 结尾
- [ ] 已确认 `QWEATHER_API_HOST` 为 `https://nu4wcvrj9f.re.qweatherapi.com`（非 devapi）
- [ ] 已理解 monorepo 结构：PM2 需从根目录通过 `pnpm --filter` 启动
- [ ] 已确认 web 端口 3000、admin 端口 3001、PostgreSQL 5432、Redis 6379

---

## 五、备选方案：快速上线（Vercel + Supabase）

如果急需上线、不想运维服务器，可采用此方案：

| 组件     | 服务                  | 成本       |
| -------- | --------------------- | ---------- |
| 前台 Web | Vercel (Pro)          | ¥0-150/月  |
| 运营后台 | Vercel 另一个 Project | 免费       |
| 数据库   | Supabase / Neon       | ¥0-150/月  |
| Redis    | Upstash               | 免费层     |
| 域名     | Cloudflare / 阿里云   | ¥50-100/年 |

**优点**：30 分钟可上线，自动 CI/CD，免费 SSL
**缺点**：国内访问可能慢，Vercel 有时被 DNS 污染

部署步骤（Codex 执行）：

1. 代码推送到 GitHub
2. 在 Vercel 导入 `apps/web` 和 `apps/admin` 两个项目
3. 在 Supabase 创建 PostgreSQL 项目，获取 DATABASE_URL
4. 在 Upstash 创建 Redis 实例
5. 在 Vercel 环境变量中配置所有密钥
6. 部署自动完成

---

## 六、成本估算（方案 A）

| 项目                    | 月费用（¥）           |
| ----------------------- | --------------------- |
| 云服务器 ECS 2核4G      | ~150                  |
| 云数据库 RDS PostgreSQL | ~200（或自建省掉）    |
| 云 Redis                | ~100（或自建省掉）    |
| 域名                    | ~5（年付约60）        |
| SSL 证书                | 免费（Let's Encrypt） |
| DeepSeek API            | ~50-200（按量）       |
| 和风天气 API            | 免费层                |
| **合计**                | **~300-600/月**       |

> 💡 节约建议：PostgreSQL + Redis 直接 Docker 部署在 ECS 上（不用云服务），月成本可降至 ~150-200。

---

## 七、风险与注意事项

1. **ICP 备案**：国内服务器必须先备案才能用域名访问，期间可用 `http://<IP>:3000` 测试
2. **微信支付**：需要企业资质，个人开发者可能受限
3. **图片/视频存储**：建议使用阿里云 OSS 或腾讯云 COS 对象存储，不要存在服务器本地
4. **数据库备份**：务必配置自动备份（每日），防止数据丢失
5. **API Key 安全**：所有密钥放环境变量，不要提交到 Git
6. **DDoS 防护**：小项目可用 Cloudflare CDN 免费防护（需域名）

---

## 八、给 Codex 的执行指令

```
Codex，请按照 docs/deployment-plan.md 中的"方案 A"逐步执行部署。
当前项目状态：
- 代码在 /Users/limyoon/Desktop/workspace/aigc
- 使用 pnpm + Turborepo monorepo
- apps/web (Next.js 14, :3000) — 前台
- apps/admin (Next.js 14, :3001) — 后台
- packages/database (Prisma + PostgreSQL 16)
- 需要 Redis 缓存
- 外部依赖：DeepSeek, 和风天气, 高德地图

请从阶段 0（前置准备）开始，逐步推进。
遇到需要用户提供的信息（如 API Key、服务器 IP、域名），请明确提问。
```
