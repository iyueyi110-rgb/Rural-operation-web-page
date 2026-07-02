# 走马村运营系统 PPT — 给 Codex 的生成约束

> 本文档定义 AI 编码助手（Codex）在生成走马村运营系统汇报 PPT 时必须遵守的工程规范、内容约束和执行规则。
> 每一条规则都是可被自动化验证的。违反任一 MUST 规则 = 生成失败。

---

## 1. 源材料约束（不可偏离）

### 1.1 内容来源

```yaml
# 所有 PPT 内容必须基于以下源文件，禁止凭空编造
source_files:
  - docs/presentations/走马村运营系统-汇报PPT内容.md  # PPT 内容大纲（权威源）
  - docs/system-overview.md                           # 系统架构
  - PRD.md                                            # 产品需求
  - PRODUCT.md                                        # 产品定位与设计原则
  - TASKS.md                                          # 任务拆解与验收标准
  - DATA_STRUCTURE.md                                 # 数据模型
  - PROJECT_RULES.md                                  # 工程规范
  - docs/acceptance-criteria.md                       # 验收标准与 KPI
  - memory/project-naming.md                          # 项目命名

# 禁止引用的内容
forbidden:
  - 不得编造不存在的功能或数据
  - 不得使用未在源文件中出现的 KPI 数字
  - 不得声称已完成未验收的功能
  - 不得使用赛博朋克/霓虹/模板化 AI 渐变的视觉描述
```

### 1.2 图片素材

```yaml
# 可使用以下素材目录
image_sources:
  - 走马岭实地照片/           # 实地照片（优先级最高）
  - docs/assets/images/       # 文档配图
  - public/images/            # 前端静态资源
  - output/concept-sketch/    # 概念草图

# 图片使用规则
image_rules:
  - MUST 优先使用实地照片作为背景/氛围图
  - MUST 抽象图形仅用于解释系统关系（架构图、流程图、数据模型图）
  - MUST_NOT 使用 Unsplash/Pexels 等通用图库的"乡村"照片
  - MUST_NOT 使用 AI 生成的虚假乡村场景图
```

---

## 2. PPT 结构约束

### 2.1 幻灯片数量与顺序

```yaml
# MUST 包含以下 18 张幻灯片，顺序不可变
slides:
  1:
    title: "封面"
    type: cover
    required_elements: [项目名称, 副标题, 背景图, 汇报人, 日期]

  2:
    title: "项目定位"
    type: content
    required_elements: [一句定位, 核心命题, 三大目标表格]

  3:
    title: "不走的路（反模式）"
    type: content
    required_elements: [拒绝列表(4项), 选择列表(5项)]

  4:
    title: "系统全景架构"
    type: diagram
    required_elements: [架构图, 设计理念说明(3点)]

  5:
    title: "四境空间模型"
    type: content
    required_elements: [四境表格(4行), 设计原则]

  6:
    title: "六大业务域"
    type: content
    required_elements: [业务域表格(6行)]

  7:
    title: "AIGC 路线生成"
    type: feature
    required_elements: [输入维度, 输出内容, 技术实现(3点)]

  8:
    title: "认养系统"
    type: feature
    required_elements: [流程图, 功能表格(6行), 设计理念]

  9:
    title: "院落预约与票务"
    type: feature
    required_elements: [院落预约(3点), 门票系统(3点)]

  10:
    title: "前端技术架构"
    type: technical
    required_elements: [目录结构, 关键特性列表(6项)]

  11:
    title: "后端技术架构"
    type: technical
    required_elements: [API 概览, 数据库/AI/天气/缓存, 安全设计(3点)]

  12:
    title: "数据模型"
    type: technical
    required_elements: [模型统计, 核心关系图]

  13:
    title: "AI 模型编排层"
    type: technical
    required_elements: [模型表格(4行), 编排规则(4条), AIGC 场景(5个)]

  14:
    title: "村民系统 & IoT"
    type: feature
    required_elements: [村民功能(4项), IoT 能力(4项)]

  15:
    title: "运营 KPI 体系"
    type: data
    required_elements: [KPI 表格(6行), 验收状态]

  16:
    title: "开发路线图"
    type: roadmap
    required_elements: [四阶段表格, 状态标识]

  17:
    title: "项目亮点总结"
    type: summary
    required_elements: [亮点表格(7行)]

  18:
    title: "谢谢"
    type: ending
    required_elements: [联系方式, 仓库链接, 演示链接]
```

### 2.2 章节导航

```yaml
# 每张内容页（Slide 2-17）MUST 包含章节导航
chapter_navigation:
  chapters:
    - { id: overview, label: "项目概述", slides: [2, 3] }
    - { id: architecture, label: "系统架构", slides: [4, 5, 6] }
    - { id: features, label: "核心功能", slides: [7, 8, 9] }
    - { id: tech, label: "技术实现", slides: [10, 11, 12, 13] }
    - { id: operations, label: "运营体系", slides: [14, 15] }
    - { id: roadmap, label: "路线图", slides: [16, 17] }

  rules:
    - MUST 在每页顶部或左侧显示当前章节高亮
    - MUST 章节标签使用中文
    - MUST_NOT 使用超过 6 个章节
```

---

## 3. 视觉设计约束

### 3.1 设计令牌（Design Tokens）

```yaml
# MUST 使用以下设计令牌，禁止自行定义颜色/字体
tokens:
  colors:
    primary: "#5C4033"        # 深棕 — 标题、重点
    secondary: "#8B7355"      # 中棕 — 副标题
    tertiary: "#A0937D"       # 浅棕 — 辅助文字
    background: "#F5F0EB"     # 米白 — 页面背景
    surface: "#FFFFFF"        # 白色 — 卡片背景
    accent: "#6B8E6B"         # 灰绿 — 数据高亮、CTA
    warning: "#C4A35A"        # 暖金 — 强调/警示
    text_primary: "#2C2420"   # 深色 — 正文
    text_secondary: "#6B5E53" # 灰色 — 次要文字
    divider: "#E0D5C7"        # 浅棕 — 分割线

  typography:
    heading_font: "思源宋体 / Noto Serif SC"
    body_font: "思源黑体 / Noto Sans SC"
    code_font: "JetBrains Mono / SF Mono"
    sizes:
      h1: "36pt"     # 封面主标题
      h2: "28pt"     # 页面标题
      h3: "20pt"     # 区块标题
      body: "16pt"   # 正文
      caption: "12pt" # 注释/脚注

  spacing:
    page_margin: "40px"
    content_gap: "24px"
    element_gap: "16px"
    tight_gap: "8px"

  # 禁止使用的颜色
  forbidden_colors:
    - 霓虹色系（#00FF00, #FF00FF, #00FFFF 等）
    - 蓝紫渐变（典型 AI/SaaS 风格）
    - 纯黑 #000000（使用 text_primary 代替）
    - 纯白 #FFFFFF 作为大面积背景（使用 background 代替）
```

### 3.2 视觉风格规则

```yaml
visual_rules:
  - MUST 整体低饱和、有层次、有乡村真实感
  - MUST 视觉层次来自地形、路径、节点、院落和数据关系，不靠泛用光效
  - MUST_NOT 使用赛博朋克风格
  - MUST_NOT 使用模板化 AI 渐变（紫蓝粉渐变）
  - MUST_NOT 使用悬浮 3D 等距插画风格
  - MUST_NOT 使用"科技感"粒子/网格背景
  - SHOULD 优先使用走马村实地照片作为全幅背景
  - SHOULD 架构图使用简洁线框 + 低饱和色块
  - SHOULD 图标使用线性风格，保持视觉重量一致
```

### 3.3 图片使用规则

```yaml
image_rules:
  - MUST 每张图片有 alt 文本
  - MUST 背景图叠加 30-50% 不透明度的深色蒙版，确保文字可读
  - MUST 架构图/流程图使用 Mermaid 风格或简洁线框图
  - MUST_NOT 使用低分辨率或拉伸变形的图片
  - MUST_NOT 在同一页使用超过 2 张大图
  - SHOULD 图片统一使用圆角（8px）处理
```

---

## 4. 内容约束

### 4.1 文案规则

```yaml
copy_rules:
  - MUST 所有中文文案使用全角标点符号（，。！？、""）
  - MUST 数字和英文使用半角字符
  - MUST 标题简洁有力，正文不超过 3 行
  - MUST_NOT 正文使用感叹号结尾（除非是封面/金句）
  - MUST_NOT 使用"领先的""一流的""最好的"等空洞形容词
  - MUST_NOT 使用 Emoji 作为正文标点
  - SHOULD 每页正文控制在 50 字以内
  - SHOULD 使用项目已定义的术语（"四境""认养""云脑""智策卡"等）
  - SHOULD 中英文之间有空格（如 "Next.js 框架"）
```

### 4.2 数据与事实

```yaml
data_rules:
  - MUST 所有数字、日期、百分比与源文件一致
  - MUST KPI 数据标注"当前数据条件"（如"待上线埋点后计算"）
  - MUST 技术栈版本号准确（Next.js 14, PostgreSQL 16, Redis 7, Node.js 20 LTS）
  - MUST_NOT 编造用户数、交易额等运营数据
  - MUST_NOT 夸大功能完成度（如 Phase C/D 的功能标注为"规划中"）
```

### 4.3 代码展示

```yaml
code_rules:
  - MUST 代码块使用暗色背景 + 语法高亮
  - MUST 字体使用等宽字体（JetBrains Mono / SF Mono）
  - MUST 代码字号 ≤ 12pt
  - MUST_NOT 在单张幻灯片展示超过 20 行代码
  - SHOULD 关键行使用背景高亮
```

---

## 5. 动效与交互约束

```yaml
animation_rules:
  - MUST 所有动效持续时间 ≤ 300ms
  - MUST 仅使用淡入（fade）和平移（slide）两种动效
  - MUST_NOT 使用弹跳、旋转、缩放、翻转等花哨动效
  - MUST_NOT 使用声音效果
  - SHOULD 内容采用逐条渐进式显示（build slide）

transition_rules:
  - MUST 页面切换使用简单的淡入淡出
  - MUST_NOT 使用 3D 翻转、百叶窗、棋盘格等转场
```

---

## 6. PPT 文件格式约束

```yaml
format_rules:
  - MUST 输出为 .pptx 格式（Office Open XML）
  - MUST 使用 16:9 宽高比（标准宽屏）
  - MUST 嵌入字体（或使用 Web 安全字体降级方案）
  - MUST 文件大小 < 50MB（含图片）
  - MUST 所有图片压缩至合理分辨率（背景 ≤ 1920px 宽，插图 ≤ 800px 宽）
  - SHOULD 使用幻灯片母版统一管理页眉/页脚/页码
  - SHOULD 提供 PDF 导出版本作为备份
```

---

## 7. 禁止事项（硬约束）

```yaml
# 以下行为在生成 PPT 时严格禁止
hard_forbidden:
  - 使用"炫技大屏""智慧乡村 3.0""元宇宙"等空洞概念
  - 编造不存在于源文件中的功能、数据、合作方
  - 使用蓝紫霓虹色系作为主色调
  - 使用 AI 生成图片替代走马村实地照片
  - 在技术页使用不准确的架构图（必须与 docs/system-overview.md 一致）
  - 声称已完成未验收的功能模块
  - 使用 Emoji 作为正文标点或列表标记
  - 单页超过 80 字正文
  - 使用超过 3 种字体
  - 使用超过 5 种颜色（不含图片）
  - 页面切换使用 3D 转场
  - 使用非项目术语描述功能（如"智慧大脑"代替"云脑"）
```

---

## 8. 验收标准

### 8.1 内容完整性

```yaml
# Codex 生成完成后，MUST 自检以下项目
content_checklist:
  - [ ] 18 张幻灯片全部包含，顺序正确
  - [ ] 所有技术术语与源文件一致
  - [ ] 所有 KPI 数据有"当前数据条件"标注
  - [ ] 四境表格中四个境的名称、场景、体验、能力完整
  - [ ] 六大业务域表格完整
  - [ ] 架构图与 docs/system-overview.md 第 3.1 节一致
  - [ ] 前端技术栈版本号正确
  - [ ] 后端 API 端点数量与源文件一致（45+ 个）
  - [ ] 数据模型数量与源文件一致（36 个 Prisma 模型）
```

### 8.2 视觉合规

```yaml
visual_checklist:
  - [ ] 使用设计令牌中定义的颜色（非霓虹/蓝紫渐变）
  - [ ] 字体不超过 3 种
  - [ ] 无花哨动效（弹跳/旋转/翻转）
  - [ ] 背景图有蒙版确保文字可读
  - [ ] 无 AI 生成图片替代实地照片
  - [ ] 架构图使用线框 + 低饱和色块
  - [ ] 16:9 宽高比
```

### 8.3 文件合规

```yaml
file_checklist:
  - [ ] 输出 .pptx 格式
  - [ ] 文件大小 < 50MB
  - [ ] 图片压缩至合理分辨率
  - [ ] 字体嵌入或降级方案就绪
```

---

## 9. 生成流程

```yaml
# Codex 生成 PPT 时的推荐步骤
generation_flow:
  step_1: "读取 docs/presentations/走马村运营系统-汇报PPT内容.md 获取内容大纲"
  step_2: "读取 docs/system-overview.md 获取架构图和数据模型"
  step_3: "读取 PRODUCT.md 获取设计原则和反模式"
  step_4: "读取 DATA_STRUCTURE.md 获取数据模型细节"
  step_5: "读取 docs/acceptance-criteria.md 获取 KPI 和验收状态"
  step_6: "扫描 走马岭实地照片/ 目录获取可用图片"
  step_7: "创建幻灯片母版（应用设计令牌）"
  step_8: "逐页生成幻灯片内容（18 页）"
  step_9: "应用章节导航到每页"
  step_10: "自检验收标准中的所有项目"
  step_11: "导出 .pptx 文件"
  step_12: "导出 .pdf 备份文件"
```

---

## 10. 常见错误与纠正

| 错误 | 纠正 |
|------|------|
| 使用"智慧乡村""元宇宙"等概念 | 使用"云脑""四境""认养"等项目术语 |
| 架构图使用云朵/齿轮图标 | 使用简洁线框 + 色块表示层级关系 |
| 每页大量文字堆砌 | 控制在 50 字内，用图表代替 |
| 使用蓝色渐变作为主色调 | 使用大地色系（棕/米/绿） |
| 技术栈写"最新版" | 明确版本号：Next.js 14, PostgreSQL 16 |
| KPI 写"100% 完成" | 标注当前数据条件和限制 |
| 封面使用 AI 生成图 | 使用走马岭实地照片 |
| 动效使用"华丽""震撼" | 仅使用淡入/平移，≤ 300ms |
