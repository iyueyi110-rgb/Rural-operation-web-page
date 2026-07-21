# 走马村前台系统 — 数据结构设计

> 数据模型从"资源是分散的、关系是长周期的"前提出发，不围绕一次性门票订单设计。认养、养护、院落、路线、反馈和天气之间有复用关系。

---

## 1. 实体关系概览

```
user ──────┬── user_profile
            ├── courtyard_booking
            ├── ticket_order
            ├── tree_adoption
            ├── route_plan
            ├── feedback_ticket
            ├── payment_order
            ├── consent_record
            └── tree_care_log (as operator)

courtyard ────── courtyard_booking

ticket_product ────── ticket_order

orchard_tree ──┬── tree_adoption
               └── tree_care_log

route_template ────── route_plan ────── weather_snapshot
```

---

## 2. 实体详细定义

### 2.1 用户与画像

#### user（用户主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| mobile | varchar(20) | 手机号（脱敏存储） |
| nickname | varchar(100) | 昵称 |
| role | enum | 角色：visitor / registered / adopter / host / editor / cs / finance / admin |
| locale | varchar(10) | 语言偏好，默认 zh-CN |
| status | enum | active / disabled / deleted |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### user_profile（用户画像表）

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | 关联 user.id |
| age_group | enum | 年龄段：child / youth / adult / senior |
| travel_pref | varchar(50) | 出行偏好标签 |
| mobility_level | enum | 行动能力：high / medium / low |
| child_flag | boolean | 是否携带儿童 |

---

### 2.2 院落与预约

#### courtyard（院落/民宿单元）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| name | varchar(200) | 院落名称 |
| scene_realm | enum | 所属场景：ancient_road / lychee_field / resilience_valley / ridge_dwelling |
| capacity | int | 可接待人数 |
| inventory_type | enum | 库存类型：room / entire_house |
| price_rule | jsonb | 价格规则（平日/周末/节假日） |
| status | enum | active / inactive / maintenance |
| location_geo | geometry(Point, 4326) | 地理位置（PostGIS） |
| description | text | 院落描述 |
| amenities | jsonb | 设施列表 |
| images | jsonb | 图片URL列表 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### courtyard_booking（院落预约）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| user_id | uuid | 关联 user.id |
| courtyard_id | uuid | 关联 courtyard.id |
| date_range | daterange | 入住日期范围 |
| guest_count | int | 入住人数 |
| order_status | enum | pending / confirmed / check_in / check_out / cancelled / refunded |
| amount | decimal(10,2) | 订单金额 |
| payment_order_id | uuid | 关联 payment_order.id |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

---

### 2.3 票务

#### ticket_product（门票/活动票/套餐票）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| type | enum | ticket / activity / package |
| name | varchar(200) | 票务名称 |
| valid_date_rule | jsonb | 有效日期规则 |
| price | decimal(10,2) | 单价 |
| stock_mode | enum | unlimited / daily_quota / total_quota |
| daily_quota | int | 每日配额（stock_mode=daily_quota时必填） |
| total_quota | int | 总配额（stock_mode=total_quota时必填） |
| scene_realm | enum | 关联场景 |
| status | enum | active / inactive |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### ticket_order（票务订单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| user_id | uuid | 关联 user.id |
| product_id | uuid | 关联 ticket_product.id |
| use_date | date | 使用日期 |
| qty | int | 数量 |
| pay_status | enum | unpaid / paid / refunding / refunded |
| amount | decimal(10,2) | 订单金额 |
| payment_order_id | uuid | 关联 payment_order.id |
| verify_code | varchar(50) | 核销码 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

---

### 2.4 认养与养护

#### orchard_tree（树的数字身份）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| orchard_id | varchar(50) | 果园编号 |
| tree_code | varchar(50) | 树唯一编号 |
| species | varchar(100) | 树种（如：妃子笑荔枝） |
| age | int | 树龄 |
| health_status | enum | excellent / good / fair / poor |
| hidden_geo | geometry(Point, 4326) | 坐标（**建议脱敏**，对外展示使用模糊坐标） |
| description | text | 树的描述 |
| images | jsonb | 图片列表 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### tree_adoption（认养关系）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| user_id | uuid | 关联 user.id |
| tree_id | uuid | 关联 orchard_tree.id |
| plan_type | enum | 认养方案类型 |
| rights_json | jsonb | 权益说明（收获、活动参与等） |
| start_at | timestamp | 认养开始时间 |
| end_at | timestamp | 认养结束时间 |
| status | enum | active / expired / cancelled |
| certificate_url | varchar(500) | 认养证书URL |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### tree_care_log（养护记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| tree_id | uuid | 关联 orchard_tree.id |
| operator_id | uuid | 操作人（可能是认养用户或村民） |
| action_type | enum | watering / fertilizing / pruning / harvesting / photo / note |
| media_url | varchar(500) | 图片/视频URL |
| note | text | 养护备注 |
| happened_at | timestamp | 养护时间 |
| created_at | timestamp | 记录创建时间 |

---

### 2.5 路线与天气

#### route_template（路线模板）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| name | varchar(200) | 模板名称 |
| scene_mix | jsonb | 场景组合 |
| duration | int | 预计时长（分钟） |
| mobility_tag | enum | 行动要求：easy / moderate / challenging |
| rain_plan_flag | boolean | 是否有雨天备用方案 |
| waypoints | jsonb | 路径节点（坐标序列） |
| description | text | 路线描述 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### route_plan（AI 生成路线结果）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| user_id | uuid | 关联 user.id（可为空，匿名也可生成） |
| inputs_json | jsonb | 用户输入：时长、人群、偏好 |
| output_json | jsonb | AI输出的路线详情 |
| weather_snapshot_id | uuid | 关联 weather_snapshot.id |
| created_at | timestamp | 生成时间 |

#### weather_snapshot（天气快照）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| area_code | varchar(20) | 区域编码 |
| forecast_type | enum | current / hourly / daily |
| value_json | jsonb | 天气数据（温度、降雨概率、预警等） |
| valid_until | timestamp | 有效截止时间 |
| created_at | timestamp | 快照时间 |

---

### 2.6 反馈与支付

#### feedback_ticket（意见反馈/工单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| user_id | uuid | 关联 user.id |
| category | enum | content / service / facility / payment / other |
| severity | enum | low / medium / high / urgent |
| content | text | 反馈内容 |
| order_ref | uuid | 关联订单（可选） |
| status | enum | submitted / assigned / processing / resolved / closed |
| assignee | varchar(100) | 处理人 |
| resolution | text | 处理结果 |
| rating | int | 用户满意度评分（1-5） |
| created_at | timestamp | 提交时间 |
| updated_at | timestamp | 更新时间 |

#### payment_order（统一支付单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| biz_type | enum | courtyard_booking / ticket_order / tree_adoption / donation |
| biz_ref_id | uuid | 业务订单ID |
| user_id | uuid | 关联 user.id |
| channel | enum | wechat_pay / alipay |
| amount | decimal(10,2) | 支付金额 |
| status | enum | pending / paying / paid / refunding / refunded / closed |
| callback_payload | jsonb | 支付回调原始数据 |
| idempotent_key | varchar(100) | 幂等键（唯一约束） |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

---

### 2.7 隐私与内容

#### consent_record（隐私与授权记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| user_id | uuid | 关联 user.id |
| consent_type | enum | privacy_policy / data_collection / marketing / ai_processing |
| version | varchar(20) | 授权协议版本号 |
| granted | boolean | 是否授权 |
| granted_at | timestamp | 授权时间 |
| revoked_at | timestamp | 撤回时间（可为空） |

#### locale_text（多语言文案表）

| 字段 | 类型 | 说明 |
|------|------|------|
| key | varchar(200) | 文案键（主键之一） |
| locale | varchar(10) | 语言代码（主键之一）：zh-CN / en / ja |
| value | text | 文案内容 |
| version | int | 版本号 |
| updated_at | timestamp | 更新时间 |

#### media_asset（媒资与审核）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid / serial | 主键 |
| owner_type | enum | scene / courtyard / tree / activity / user_upload |
| owner_id | uuid | 关联对象ID |
| media_type | enum | image / video / audio / document |
| storage_key | varchar(500) | 对象存储key |
| source | varchar(200) | 来源说明 |
| reviewed | boolean | 是否已审核（默认false） |
| reviewer | varchar(100) | 审核人 |
| created_at | timestamp | 创建时间 |

---

## 3. API 接口清单

> 适合直接产出 OpenAPI 文档和 mock server。

### 3.1 鉴权

| Method | Path | 鉴权 | 用途 |
|--------|------|------|------|
| POST | /api/v1/auth/login-sms | 否 | 手机号验证码登录 |

### 3.2 四境内容

| Method | Path | 鉴权 | 用途 |
|--------|------|------|------|
| GET | /api/v1/scenes | 否 | 获取四境入口与卡片 |
| GET | /api/v1/scenes/{slug} | 否 | 获取单个场景页详情 |

### 3.3 路线与天气

| Method | Path | 鉴权 | 用途 |
|--------|------|------|------|
| POST | /api/v1/routes/generate | 可匿名，登录更佳 | 生成游览路线 |
| GET | /api/v1/weather/summary | 否 | 获取今日/明日天气与预警 |

### 3.4 院落

| Method | Path | 鉴权 | 用途 |
|--------|------|------|------|
| GET | /api/v1/courtyards | 否 | 获取院落列表与库存 |
| POST | /api/v1/courtyard-bookings | 是 | 发起院落预约 |

### 3.5 票务

| Method | Path | 鉴权 | 用途 |
|--------|------|------|------|
| GET | /api/v1/tickets/products | 否 | 获取票务产品 |
| POST | /api/v1/ticket-orders | 是 | 创建门票订单 |

### 3.6 认养

| Method | Path | 鉴权 | 用途 |
|--------|------|------|------|
| GET | /api/v1/trees | 否 | 获取可认养树列表 |
| POST | /api/v1/tree-adoptions | 是 | 发起认养 |
| POST | /api/v1/tree-care-events/{id}/join | 是 | 报名参与养护活动 |

### 3.7 支付

| Method | Path | 鉴权 | 用途 |
|--------|------|------|------|
| POST | /api/v1/payments/prepare | 是 | 生成支付参数 |
| POST | /api/v1/payments/callback/{channel} | 否（签名校验） | 支付回调 |

### 3.8 反馈与个人中心

| Method | Path | 鉴权 | 用途 |
|--------|------|------|------|
| POST | /api/v1/feedback | 是 | 提交意见反馈 |
| GET | /api/v1/me/orders | 是 | 订单中心 |
| GET | /api/v1/me/adoptions | 是 | 我的认养 |
| GET | /api/v1/privacy/consents | 是 | 查看授权记录 |
| POST | /api/v1/privacy/consents | 是 | 提交或撤回授权 |

---

## 4. 数据库设计原则

1. **PII 与经营数据分表存储**：手机号等个人信息脱敏处理
2. **字段级脱敏与最小权限**：树坐标对外展示使用模糊坐标
3. **所有 LLM 输入经过清洗**：去掉手机号、支付标识、精确地址、自由文本中的敏感信息
4. **支付回调幂等处理**：使用 idempotent_key 唯一约束
5. **审计日志**：支付回调、树档案修改、价格变更、退款操作、删除用户数据均需记录
6. **多语言键值分离**：内容模型从第一天就支持 en/ja 扩展
