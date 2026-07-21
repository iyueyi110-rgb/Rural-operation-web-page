# @zouma/prompts

版本化提示词、结构化输出约束和人工审核过的降级响应。

## Exports

- `@zouma/prompts/daily-report`
- `@zouma/prompts/content-factory`
- `@zouma/prompts/fallback-responses`
- `@zouma/prompts/knowledge-assistant`

提示词不得包含真实个人信息、密钥、支付数据或精确坐标。新增模板应明确任务、输入边界、输出 schema、拒答规则和版本，并为固定降级文案补测试。

```bash
pnpm --filter @zouma/prompts test
```

应用必须通过服务端模型适配层使用这些模板，不得从浏览器直接调用模型提供商。
