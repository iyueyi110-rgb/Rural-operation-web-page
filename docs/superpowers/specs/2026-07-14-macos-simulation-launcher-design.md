# macOS 认养规则模拟工作台一键启动器设计

## 目标

在 macOS 桌面提供可双击执行的 `启动认养一棵树规则模拟.command`。启动器只运行规则模拟工作台所需的 PostgreSQL、Web 模拟 API 和 Admin，不主动打开游客端页面，也不启动 Redis 或其他可选服务。

## 启动流程

1. 定位仓库 `/Users/limyoon/Desktop/aigc`，检查 `docker`、`pnpm` 与项目文件。
2. 使用 `infra/docker/docker-compose.dev.yml` 仅启动 `postgres` 服务，并等待 `pg_isready` 成功。
3. 使用 Compose 中的本地数据库连接 `postgresql://zouma:zouma_dev@127.0.0.1:5432/zouma`。
4. 首次缺少依赖时运行 `pnpm install --frozen-lockfile`；随后依次执行 `prisma generate` 与 `prisma migrate deploy`，将完整迁移历史应用到本地数据库。
5. 每次启动生成临时的 `ADMIN_API_TOKEN` 与 `ADMIN_SESSION_SECRET`；本机登录口令固定为 `zouma-simulation-local`，并在终端醒目显示。
6. 分别启动 Web API（3000）与 Admin（3001），轮询服务就绪状态。
7. 自动打开 `http://localhost:3001/login`，不打开游客端首页。
8. 用户按 `Ctrl+C` 或关闭启动终端时，终止本次启动的 Web/Admin 子进程；PostgreSQL 容器保留运行，以缩短下次启动时间。

## 文件结构

- 仓库脚本：`scripts/start-adoption-simulation-macos.sh`，承载可测试的启动逻辑。
- 桌面入口：`/Users/limyoon/Desktop/启动认养一棵树规则模拟.command`，只负责调用仓库脚本。

桌面入口使用绝对仓库路径，避免 Finder 双击时工作目录不确定。两个文件均设置可执行权限。

## 错误处理

- Docker Desktop 未运行、端口被非目标进程占用、依赖安装失败、数据库未就绪或服务启动失败时，终端显示中文原因并保持窗口可读。
- 若 3000/3001 已由本项目服务占用，启动器直接复用并打开工作台；若由其他程序占用则停止，避免误杀无关进程。
- Prisma 同步失败时不启动应用，避免工作台落入 JSON 降级；启动成功后模拟 API 应报告数据库后端而非 `degraded=true`。
- 启动日志写入仓库忽略目录 `tmp/simulation-launcher/`，便于排错且不进入 Git。

## 安全边界

- 固定口令仅用于绑定在 `localhost` 的本地开发环境，不写入仓库环境文件。
- Web 服务 token 和 session secret 每次启动临时生成，仅通过当前进程环境传递，不进入浏览器 bundle、日志或 Git。
- 启动器不修改真实订单、任务或支付数据；模拟系统继续只使用模拟专用表。

## 验收

- Finder 双击桌面 `.command` 后，PostgreSQL、Web API、Admin 均可用，并自动打开登录页。
- 使用 `zouma-simulation-local` 能登录并访问 `/simulations`。
- 工作台创建 V0/V1 成对运行后，API 元数据为 Prisma 后端且 `degraded=false`。
- `Ctrl+C` 后 3000/3001 不再监听，PostgreSQL 容器仍健康。
- 重复双击不会重复安装依赖、破坏数据库或误杀其他进程。
