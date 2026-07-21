# @zouma/admin

运营人员使用的 Next.js 14 后台，覆盖资产、交易、现场运营、村民协作、规则模拟、空间改造和 AI 系统。

## Security model

- 管理员口令只提交到本应用的 session Route Handler。
- 成功登录后使用签名 HttpOnly cookie。
- Admin BFF 在服务端附加 `ADMIN_API_TOKEN`，浏览器不接触该 token。
- 生产环境必须设置强 `ADMIN_LOGIN_PASSWORD` 和至少 32 字符的 `ADMIN_SESSION_SECRET`。

## Commands

```bash
pnpm --filter @zouma/admin dev
pnpm --filter @zouma/admin test
pnpm --filter @zouma/admin type-check
pnpm --filter @zouma/admin build
```

Admin 运行在 `http://localhost:3001`，通过 `WEB_API_BASE` 访问 Web API。后端不可用时页面必须展示可识别降级状态，不伪造运行、审核或写入成功。
