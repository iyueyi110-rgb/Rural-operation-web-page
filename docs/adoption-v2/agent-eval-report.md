# 履约协调 Agent 影子模式报告

## 已验证

- 手动触发 `DEMO-LZ018-RISK-001`，运行记录成功创建。
- 成功调用 `get_adoption_summary`、`list_fulfillment_tasks`、`get_fulfillment_evidence`、`get_weather_risk` 四个只读工具。
- 工具参数只保存必要 ID/范围；权限决策均为 `allowed_read_only`。
- 模型不可用时运行以 `MODEL_UNAVAILABLE` 失败结束，没有创建 Recommendation。
- `adoption_*` 建议即使通过运营审批，也会在执行动作触发器前短路，返回 `shadowMode: true`。

## 尚未满足上线门槛

- 未产生真实模型建议，因而不能计算建议采纳率、Bad Case 漏检率和错误重派率。
- 未运行 V0/V1/V2-Agent 40 组同条件对照，不宣称效率、公平性或按时率提升。
- 模型可用后必须先跑影子数据，再决定是否进入有限使用；退款、判责、结算和状态修改始终不授予 Agent。
