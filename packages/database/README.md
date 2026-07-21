# @zouma/database

Prisma/PostgreSQL 数据层和 Redis 连接入口。Schema、迁移和种子数据均位于本包。

```ts
import { getRedis, prisma } from "@zouma/database"
```

## Commands

```bash
pnpm --filter @zouma/database db:generate
pnpm --filter @zouma/database db:push
pnpm --filter @zouma/database db:seed
pnpm --filter @zouma/database exec prisma validate --schema prisma/schema.prisma
```

`db:push` 仅用于本地演示环境。共享或生产环境必须使用 `prisma/migrations/` 中的追加迁移；不得修改已经提交的历史迁移。

## Environment and failure behaviour

- `DATABASE_URL`：PostgreSQL 连接。
- `REDIS_URL`：可选 Redis 连接。
- 开发环境复用全局 PrismaClient，避免热更新产生连接风暴。
- 公共构建允许上层应用使用已审核降级数据；需要持久化的操作不得把连接失败伪装成成功。

数据模型说明见 [`docs/tech/database-schema.md`](../../docs/tech/database-schema.md)。
