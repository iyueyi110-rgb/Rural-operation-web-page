# `@zouma/admin` 运营后台

运营人员使用的 Next.js 14 后台，覆盖资产、交易、现场运营、村民协作、规则模拟、空间改造和 AI 系统。

## 安全模型

- 匿名访客可以浏览全部后台数据，并可调用知识问答、运营问答、内容生成、空间诊断和设施决策建议生成。
- 匿名能力严格限于全部 `GET`/`HEAD` 请求，以及以下五个精确 `POST` 路径：`/knowledge/query`、`/ai/query`、`/ai/generate-content`、`/renovation/run-weekly` 与 `/infrastructure/decide`。
- 除上述精确白名单外，所有写操作都必须持有有效管理员 HttpOnly 会话。
- 管理员口令只提交给本应用的 session Route Handler。
- 登录成功后使用签名 HttpOnly cookie。
- Admin BFF 在服务端附加 `ADMIN_API_TOKEN`，浏览器不会接触该 token。
- 生产环境必须设置强 `ADMIN_LOGIN_PASSWORD` 和至少 32 字符的 `ADMIN_SESSION_SECRET`。
- 访客读取范围包含现有接口返回的业务数据和个人信息，部署前必须确认该公开范围符合运营要求。

## 常用命令

```bash
pnpm --filter @zouma/admin dev
pnpm --filter @zouma/admin test
pnpm --filter @zouma/admin type-check
pnpm --filter @zouma/admin build
```

Admin 运行在 `http://localhost:3001`，通过 `WEB_API_BASE` 访问 Web API。后端不可用时，页面必须展示可识别的降级状态，不伪造运营、审核或写入成功。
