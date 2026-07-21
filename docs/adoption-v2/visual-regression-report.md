# 认养 V2 视觉回归报告

设计方向：保持现有有机乡村运营色板、字体、圆角、阴影和导航；新增区域只使用现有 Tailwind Token、组件与 Lucide 图标。可见差异化为回答卡内可展开的“引用折页”。

## Playwright 验证

- 后台助手：1440、768、375px；模式切换、提交问题、安全降级和转人工成功。
- 村民任务：1440、768、375px；完成任务展开、真实截止时间、局部规则问答成功。
- 运营任务：1440px；LZ018 凭证 v2、两张原图链接和认养任务标识可见。
- 375px 文档宽度等于视口宽度，无横向溢出；页面可键盘聚焦，按钮和展开项均有可访问名称。
- 浏览器控制台无应用错误，仅有开发模式 Fast Refresh 与 React DevTools 提示。

截图位于 `output/playwright/adoption-v2/`，包括：

- `admin-ai-1440.png`、`admin-ai-768.png`、`admin-ai-375-full.png`
- `admin-ai-answer-1440.png`、`admin-task-evidence-1440.png`
- `villager-task-expanded-1440.png`、`villager-task-expanded-768.png`、`villager-task-expanded-375.png`
- `villager-knowledge-375.png`

## AI 空状态插画

- 使用模型：豆包 Seedream 5.0 pro（`doubao-seedream-5-0-pro-260628`）。
- 素材内容：荔枝枝叶、纸质规则手册与折页纸卡；无文字、人物或真实业务凭证。
- 生成源为 1024×1024 PNG 洋红键控背景；本地移除背景并输出带 Alpha 通道的 93 KB WebP。
- 最终文件：`apps/admin/public/images/ai-assistant/knowledge-empty-seedream.webp`，仅用于后台知识助手空状态。
