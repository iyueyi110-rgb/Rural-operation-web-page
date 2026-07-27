# 认养 V2 API 合约摘要

新接口错误使用 `{ "error": { "code": "...", "message": "...", "details": {} } }`；原接口保持兼容。

| 接口                                       | 角色           | 行为                                             |
| ------------------------------------------ | -------------- | ------------------------------------------------ |
| `POST /api/v1/fulfillment/evidence/upload` | 村民           | 校验本人任务、图片魔数、类型、大小并返回 SHA-256 |
| `GET/POST /api/v1/fulfillment/evidence`    | 运营/村民      | 查询任务凭证；提交至少两张图片并创建不可覆盖版本 |
| `POST /api/v1/fulfillment/reviews`         | 运营           | 通过或退回；通过时同步成长记录并生成待结算记录   |
| `GET/POST /api/v1/fulfillment/settlements` | 运营           | 结算仅允许基于已审核任务，动作均写审计           |
| `POST /api/v1/adoptions/[id]/benefits`     | 用户/运营      | 按角色推进权益状态，唯一键防止重复兑换           |
| `POST /api/v1/adoptions/[id]/refund`       | 用户           | 创建退款工单并进入人工审核，不执行真实退款       |
| `POST /api/v1/adoptions/[id]/renewal`      | 用户/运营      | 申请、接受、拒绝或过期；保留旧认养周期           |
| `GET /api/v1/adoptions/[id]/timeline`      | 用户/村民/运营 | 按归属返回可见任务、凭证、权益、续养和审计记录   |
| `POST /api/v1/knowledge/query`             | 村民/运营      | 角色过滤后检索；结构化回答、拒答和引用           |
| `POST /api/v1/knowledge/escalations`       | 村民/运营      | 只创建脱敏待处理工单                             |
| `POST /api/v1/cron/adoption-risk-scan`     | Cron           | 运行影子 Agent；只读工具和 Recommendation draft  |

认养关联任务使用动作：`accept/start/submit_evidence/resubmit/report_exception/approve/reject/settle/mark_overdue`。非认养任务继续使用原 `completed/cancelled` 状态。
