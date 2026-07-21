# 🍈 认养一棵树，连接一个村

## Adopt a Tree, Connect with a Village

> 从一棵荔枝树开始，建立人与土地的长期关系，让数字能力真正服务乡村运营。<br>
> Start with a lychee tree, build a lasting bond with the land, and turn digital tools into a village-wide operating system.

<!--
Social Preview 制作建议：
- 尺寸：1200 × 630 px（GitHub Open Graph 推荐比例）
- 主文案：「认养一棵树，连接一个村」
- 画面：真实走马村荔枝树照片或低饱和插画，保留充足留白，避免高饱和渐变
- 文件路径：docs/assets/social-preview.png
- 完成图片后，可在 GitHub Settings → Social preview 上传；也可取消下面图片标签的注释：
<img src="./docs/assets/social-preview.png" alt="走马村 - 认养一棵树" />
-->

**快速链接 / Quick Links**：[产品需求](docs/product/PRD.md) · [产品定位](docs/product/PRODUCT_POSITIONING.md) · [模拟系统](docs/simulation/system-design.md) · [文档中心](docs/README.md)

## 为什么是「认养一棵树」

走马村是一个真实的中国乡村。这个项目从「认养一棵荔枝树」开始——用户在线选择一棵荔枝树、签订认养协议、追踪树的四季成长、参与养护活动、最终收获果实。从这一棵树出发，系统串联起四境导览、院落预约、AIGC 路线生成和村民运营协作，形成「一棵树带动全村运营」的数字闭环。

Zouma is a real village in China. The journey begins by adopting a lychee tree: choose a tree, sign an agreement, follow its seasonal growth, join care activities, and share in the harvest. That lasting relationship connects village tours, courtyard stays, AI-generated routes, and local operations in one digital loop.

```text
认养一棵荔枝树 → 树档案与成长陪伴 → 探索四境与预约到访 → 村民协作与运营闭环
```

## 功能导览

| 功能 | 说明 | 与认养的关系 |
| --- | --- | --- |
| 🍈 荔枝树认养 | 选树 → 签约 → 成长追踪 → 参与养护 → 收获 | **核心入口** |
| 🗺️ 四境导览 | 古道叙事境、荔田共生境、韧谷研学境、岭上共居境 | 认养引导用户继续探索村庄 |
| 📍 AIGC 路线生成 | 按体力、天气、同行人群生成可解释路线 | 认养用户到访村落的出行工具 |
| 🏡 院落预约 | 日历库存、入住须知与定金流程 | 认养用户到访时的住宿转化 |
| 🎫 门票预购 | 景点票、活动票与套餐票 | 到访后的体验与消费转化 |
| 📊 运营后台 | 订单、反馈、内容、库存与协作任务管理 | 支撑认养履约的全流程 |
| 🧪 认养规则模拟 | 多种场景下的独立规则验证引擎 | 验证认养经济模型与履约规则的可靠性 |

<!-- 截图占位：荔枝树认养流程（建议展示选树、协议、树档案与成长时间线） -->
<!-- 截图占位：四境内容与 AIGC 路线（建议展示场景页和天气联动路线卡） -->
<!-- 截图占位：院落预约、门票预购与运营后台（建议展示前后台闭环） -->

## 技术架构

这是一个基于 pnpm workspace 的 Monorepo：前台 PWA、运营后台与共享领域包使用统一的类型和业务规则。

```text
游客 / 认养用户                    村民协作者 / 运营人员
        │                                  │
        ▼                                  ▼
apps/web（Next.js PWA）            apps/admin（运营后台）
        └──────────────┬───────────────────┘
                       ▼
 packages/contracts · database · prompts · simulation · ui · utils
                       │
                       ▼
                Prisma · PostgreSQL
```

| 类别 | 技术 |
| --- | --- |
| 应用框架 | Next.js 14、React 18、TypeScript |
| 数据层 | Prisma、PostgreSQL |
| 工程组织 | pnpm workspace、Turborepo |
| 特色能力 | 荔枝树认养、认养履约规则模拟、AIGC 路线生成 |

## Windows 一键演示

安装 Node.js 和 Docker Desktop 后，双击根目录的 `start.cmd`；脚本会读取 `.env.local`、按锁文件安装依赖、生成 Prisma Client、启动数据库及前台/后台，并自动打开浏览器。首次运行若没有 `.env.local`，会从 `.env.example` 创建；后台登录口令留空时，本次本地会话使用 `zouma-demo-local`。

也可以在 PowerShell 中运行：

```powershell
.\start.ps1 -SkipBrowser
```

若现场电脑没有 Docker，但只需演示自带的公开降级数据，可运行 `.\start.ps1 -SkipDB`。保持终端打开，按 `Ctrl+C` 停止前台和后台。

## macOS 一键启动规则模拟工作台

先启动 Docker Desktop，再双击桌面的 `启动认养一棵树规则模拟.command`。启动器只运行 PostgreSQL、Web 模拟 API 与 Admin，不会启动 Redis；三个端口分别只监听 `127.0.0.1:5432`、`127.0.0.1:3000` 和 `127.0.0.1:3001`。验证数据库迁移和模拟只读接口确实使用 Prisma 后，启动器才会自动打开登录页；本地登录口令为 `zouma-simulation-local`。

一键启动专门设置 `SIMULATION_REPOSITORY_MODE=prisma`，Prisma 探测或查询失败时直接停止，**不适用**下面普通本地开发的 JSON/内存降级策略。Web 与 Admin 日志分别位于 `tmp/simulation-launcher/web.log` 和 `tmp/simulation-launcher/admin.log`；临时 Admin API token 只通过进程环境和 curl 标准输入传递，不写入日志或文件。

保持启动器终端打开。按 `Ctrl+C`，或终端收到 `TERM`/`HUP`，会停止本次启动拥有的 Web/Admin 完整子进程树；任一服务异常退出时也会停止另一个服务。启动器不会终止既有端口进程或 PostgreSQL，PostgreSQL 容器保持运行。

故障排查：提示 Docker 不可用时先确认 Docker Desktop 已完成启动；提示端口冲突或工作台已运行时，回到原启动终端使用现有实例，或先按 `Ctrl+C` 停止后重试；提示 PostgreSQL、Web、Admin 或 Prisma 未就绪时，先查看上述日志，再确认本机 5432/3000/3001 未被其他程序占用。启动器不会复用无法重新验证临时 token 和 Prisma backend 的旧进程。

## 本地启动

```bash
pnpm install --frozen-lockfile
export DATABASE_URL='postgresql://user:pass@localhost:5432/zouma'
pnpm --filter @zouma/database exec prisma generate --schema prisma/schema.prisma
pnpm dev
```

数据库不可用时，模拟 API 自动使用 `tmp/simulation-store/` JSON 仓库；文件系统不可写时继续降级到进程内存，并在响应 `meta.degraded` 中标记。管理接口沿用后台管理员鉴权配置。

## 认养履约规则模拟

> ⚠️ **演示声明**：认养履约规则模拟是独立的 Demo 验证模块，使用模拟数据运行，不写入真实订单、支付或运营报表。模拟运营数据不代表真实业务结果。

模拟系统位于独立的 `@zouma/simulation` 包，用于演示认养履约规则、比较策略版本并生成可审阅的导出结果。

```bash
# 单种子、单场景 V0/V1 成对运行
pnpm simulation:run --seed 20260713 --scenario NORMAL --output outputs/simulation/pair.json

# 5 个固定种子 × 8 个场景，共 40 组成对回归
pnpm simulation:regression --output outputs/simulation/regression-summary.json

# 比较两个已序列化运行；世界不一致时失败
pnpm simulation:compare --v0 run-v0.json --v1 run-v1.json --output comparison.json

# 生成 11 类导出物到 outputs/simulation/<comparisonId>/
pnpm simulation:export --seed 20260713 --scenario NORMAL
```

支持的场景为 `NORMAL`、`ADOPTION_PEAK`、`STAFF_SHORTAGE`、`CONTINUOUS_RAIN`、`LOW_SUBMISSION_QUALITY`、`REMOTE_ZONE_LOAD`、`REVIEW_BACKLOG`、`HARVEST_PEAK`。

## 验证

```bash
pnpm --filter @zouma/simulation test
pnpm --filter @zouma/web test
pnpm --filter @zouma/admin test
pnpm type-check
DATABASE_URL='postgresql://user:pass@localhost:5432/zouma' \
  pnpm --filter @zouma/database exec prisma validate --schema prisma/schema.prisma
pnpm build
```

## 项目文档

- [产品需求文档（PRD）](docs/product/PRD.md)：用户旅程、功能矩阵与产品演进
- [产品定位与设计原则](docs/product/PRODUCT_POSITIONING.md)：品牌个性与「一棵树带动全村运营」理念
- [项目工程规则](.codex/execution-rules.md)：开发、验证与协作约定
- [模拟系统设计](docs/simulation/system-design.md)：模拟边界、数据流与系统结构
- [模拟指标口径](docs/simulation/metrics-definition.md)：指标定义与统计规则
- [模拟方法](docs/simulation/methodology.md)：场景、种子与比较方法
- [认养模拟交付说明](docs/simulation/delivery-guide.md)：运行和交付说明

## 贡献与许可

欢迎围绕乡村运营、树木认养和可信 AIGC 体验提出建议。参与开发前，请先阅读 [项目工程规则](.codex/execution-rules.md)。本仓库当前未声明开源许可证；未经许可，请勿将项目代码用于再分发或商业用途。
