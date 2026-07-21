# @zouma/web

游客、认养用户和村民使用的 Next.js 14 应用，同时承载 `/api/v1` Route Handlers。

## Main areas

- 认养、树档案、成长记录、互动积分、权益、采收和配送。
- 四境内容、路线生成、院落/活动/票务预约和反馈。
- 村民登录、任务、通知与收益。
- 知识问答、模拟 API、设施控制和空间改造。

## Commands

```bash
pnpm --filter @zouma/web dev
pnpm --filter @zouma/web test
pnpm --filter @zouma/web type-check
pnpm --filter @zouma/web build
```

Web 运行在 `http://localhost:3000`。数据库不可用时，部分公开页面使用明确的 Demo 降级数据；鉴权写操作仍返回真实失败。Web 文案通过 `messages/zh-CN.json`、`en.json` 和 `ja.json` 管理。

不要把 `ADMIN_API_TOKEN`、模型密钥或数据库凭证暴露为 `NEXT_PUBLIC_*`。
