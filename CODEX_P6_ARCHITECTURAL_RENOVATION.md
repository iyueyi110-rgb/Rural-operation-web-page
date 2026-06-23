# 走马村 P6 — 建筑层面改造平面与效果图生成 · Codex 执行指令（v2 修正版）

> **项目名称**: 走马村数字村落运营系统 (zouma-village-system)
> **任务目标**: 基于PPT Part 6「空间转译」策略 + 走马岭47张实地照片（MPO立体对），生成四境对应的建筑改造平面图和效果图
> **核心原则**: 每张效果图/平面图必须能对应到具体实地照片中的场地，每处改造必须能追溯到PPT中的策略原文
> **修订记录**: v2 — 基于PPT原文UTF-8重新提取，修正节点名称、精简非建筑节点、简化工具链

---

# 第一部分：策略原文（PPT Part 06 精确提取）

## 1. 总体概念（Slide 46-48）

```
核心框架："织" + "境"

"织" — 将分散的人、树、园、道、院，用数字技术重新编织成可感知的服务网络
"境" — 古道叙事境 / 荔田共生境 / 韧谷研学境 / 岭上共居境，四类空间场景

本质定位：
"这不是一个先建App再填充内容的互联网产品，
 而是一个以真实乡村资源为核心，
 用AIGC + IoT + 分布式服务共同编织的数字化乡村空间。"
```

## 2. 四境空间策略（Slide 50-54）

| 境 | 策略 | 空间操作 | PPT原文摘要 |
|----|------|---------|-----------|
| **古道叙事境** | 文化转译 | 修复古道关键节点（指路碑/驿站遗址/古道垭口）、慢行游线设计（串联节点+观景平台+文化标识）、AIGC多版本叙事文本（导览版/亲子版/学术版） | "古道空间由导览脚本、讲解任务与慢行路径共同成立" |
| **荔田共生境** | 产业共生 | 荔枝种植区+采摘体验园+加工工坊+食育空间、果树认养（树境·荔约子系统）、按品种/成熟度分批开放采摘预约 | "荔田共生境是认养关系在地面上的物理展开" |
| **韧谷研学境** | 生态织补 | 龙溪河韧性水岸（生态驳岸+亲水平台+观察步道）、雨洪管理示范区（雨水花园+生态沟渠+塘体净化+湿地缓冲）、旧小水电设施改造为工业遗产展陈 | "韧谷不是'河边美化'，而是生态监测、教育和安全系统的空间化" |
| **岭上共居境** | 建筑更新 | 院落民宿（5-8间/院，保持乡村尺度）、乡创办公（返乡青年/远程工作者共享办公空间）、村民公共空间（活动室+共享厨房+农产品展销+小型展陈） | "共居不是游客占用乡村，而是游客、村民、青年三类人共同使用院落" |

## 3. 六大核心项目（Slide 55）— 这是真实节点名称！

| # | PPT真实名称 | 类型 | 功能 | 价值 |
|---|-----------|------|------|------|
| 01 | **走马云驿** | 🏠 建筑 | 游客服务中心 + AIGC展示 + 农产品展销 | 统合云脑、古道导览、运营调度和品牌传播 |
| 02 | **荔下共享院** | 🏠 建筑 | 荔枝加工 + 食育课堂 + 亲子研学 + 伴手礼开发 | 把荔枝产业从生产端延伸到体验端和消费端 |
| 03 | **龙溪韧性工坊** | 🏠 建筑 | 雨洪管理 + 水系修复 + 水电记忆展示 + 生态教育 | 把水安全治理转化为可学习、可体验的公共空间 |
| 04 | **古道长寿线** | 🛤️ 线性 | 串联古道遗存 + 山地步道 + 观景平台 + 文化节点 | 走马村最重要的慢行游线和文化叙事骨架 |
| 05 | **岭上共居院** | 🏠 建筑 | 院落民宿 + 乡创办公 + 村民公共空间 | 盘活闲置院落，融合居住、工作、社交 |
| 06 | **数字认养系统** | 💻 数字 | 树档案 + 认养协议 + 养护记录 + 成长追踪 | 荔枝树认养的数字化支撑（=网站现有功能） |

> ⚠️ **关键认知**: 
> - 01/02/03/05 是**建筑改造节点** → 需要平面图+效果图
> - 04 是**线性步道系统** → 需要总平面/线路图，不是单体建筑平面
> - 06 是**数字系统**（=现有网站认养功能）→ 不需要建筑图纸，用网站截图即可

## 4. 设计导则六条底线（Slide 56）

| # | 底线 | 核心要求 |
|---|------|---------|
| 01 | **生态底线** | 不突破生态保护红线，不占用永久基本农田，不破坏山体、水系、林地和原有田坎肌理 |
| 02 | **乡土底线** | 不把村庄改造成脱离日常生活的主题化景区，保留真实生产、真实居住和真实公共生活 |
| 03 | **尺度底线** | 坚持小尺度、低干预、可维护、可生长的改造方式。避免大体量新建和过度商业化包装 |
| 04 | **材料底线** | 优先使用可修复材料：青石、木材、青砖、夯土。绿色技术：自然通风/雨水收集/遮阳廊架/低能耗照明/局部光伏 |
| 05 | **产业底线** | 荔枝产业升级尊重农业生产规律，以村民参与和持续收益为前提 |
| 06 | **技术底线** | AIGC服务运营、教育、传播和管理，不让数字展示喧宾夺主，不替代村民主体性 |

---

# 第二部分：素材现状核实

## 素材清单

| 素材 | 实际状态 | 影响 |
|------|---------|------|
| 47张走马岭照片 | ✅ Sony α7C II, MPO格式(2帧立体对), 4608×2592 ~ 7008×3944 | 可用于摄影测量、深度提取、照片匹配 |
| 建筑节点图.png | ✅ 5021×5207 RGBA | 展示六个节点空间关系 |
| 功能结构图.png | ✅ 5021×5207 RGBA | 展示系统功能与空间对应 |
| 走马村1.pptx | ✅ 72 slides, Part06 = slides 45-56 | 策略原文已完整提取 |
| 2025年毕业设计地形图.dwg | ⚠️ AC1032二进制DWG（AutoCAD 2018+），ezdxf无法读取 | 需先用ODA File Converter或AutoCAD转DXF |
| 网站四境详情页 | ✅ 已实现 (ancient-road/lychee-field/resilience-valley/ridge-dwelling) | 可嵌入图纸作为"云端展厅" |
| 网站认养系统 | ✅ 已实现 (/trees) | 直接对应节点06 |

---

# 第三部分：修正后的图纸生成清单

## 需要生成的图纸：4个建筑节点 + 1个线性系统 = 共14张

### 建筑节点（各3张：平面 + 人视效果 + 鸟瞰效果）

| # | 节点 | 平面图 | 人视效果图 | 鸟瞰效果图 | 匹配照片类型 |
|---|------|--------|----------|----------|------------|
| 01 | **走马云驿** | 1张(1:200) | 1张 | 1张 | 全景类+道路类（村口/道路交汇处/开阔场地） |
| 02 | **荔下共享院** | 1张(1:200) | 1张 | 1张 | 建筑主体类+荔枝林类（靠近荔枝林的闲置农房/院落） |
| 03 | **龙溪韧性工坊** | 1张(1:200) | 1张 | 1张 | 水系类+建筑类（龙溪沿岸的构筑物/空地） |
| 05 | **岭上共居院** | 1张(1:200) | 1张 | 1张 | 建筑主体类+全景类（山脊/坡地上的闲置院落群） |

### 线性系统（各1张）

| # | 系统 | 图纸类型 | 匹配照片类型 |
|---|------|---------|------------|
| 04 | **古道长寿线** | 1张线性总平面图(1:1000)，标注节点序列、高程变化、古遗址位置 | 道路/古道类+全景类 |

### 数字系统

| # | 系统 | 图纸类型 |
|---|------|---------|
| 06 | **数字认养系统** | 直接使用网站现有截图（/trees 认养页 + 树档案页），生成1张系统界面与空间对应关系图 |

---

## 每个建筑节点的功能与空间要求

### 01 走马云驿（基于 Slide 55 + Slide 51 古道叙事境）
```
场地特征：村口道路交汇处，紧邻古道起点，有开阔场地
功能分区：接待大厅(35%) + AIGC互动展示区(20%) + 农产品展销(20%) + 运营调度室(15%) + 辅助(10%)
面积：200-350㎡（利用现有建筑+院落改造，不新建）
关键空间关系：入口正对古道方向，展销区临路
改造策略：文化转译 — 保留原有石墙基座 + 新增木构架入口雨棚 + AIGC互动屏嵌入石墙
```

### 02 荔下共享院（基于 Slide 55 + Slide 52 荔田共生境）
```
场地特征：荔枝林边缘的闲置农房院落群
功能分区：荔枝加工间(25%) + 食育课堂(25%) + 亲子研学区(20%) + 伴手礼展示(15%) + 辅助(15%)
面积：300-500㎡（院落式布局，2-3栋建筑 + 中心庭院）
关键空间关系：建筑围绕原有院落，加工间朝向荔枝林
改造策略：产业共生 — 保留夯土墙+青砖结构，新增玻璃阳光房（食育课堂）+ 开放式加工展示区
```

### 03 龙溪韧性工坊（基于 Slide 55 + Slide 53 韧谷研学境）
```
场地特征：龙溪河岸，邻近旧小水电设施
功能分区：水质监测站(15%) + 雨洪管理展示(30%) + 水电记忆展厅(25%) + 生态教育课堂(20%) + 辅助(10%)
面积：150-300㎡（沿溪线性布局，轻介入）
关键空间关系：建筑退溪岸5m，架空观察平台伸向溪面
改造策略：生态织补 — 轻钢结构+木格栅+架空平台，旧小水电设备保留作为展品
```

### 05 岭上共居院（基于 Slide 55 + Slide 54 岭上共居境）
```
场地特征：山脊或坡地上由2-4栋建筑组成的闲置院落群
功能分区：客房区(45%, 5-8间, 25-40㎡/间带独立卫浴) + 共享公区(25%) + 乡创办公(15%) + 后勤(15%)
面积：400-800㎡（多栋建筑+中心院落）
关键空间关系：远眺视野方向为山谷/荔枝林，院落中心保留老树
改造策略：建筑更新 — 保留毛石墙+小青瓦屋面，更新门窗系统，新增木阳台和户外座椅区
```

---

# 第四部分：分阶段执行流程（修正版）

## Phase 0: 前置条件（必须先完成）

```
[ ] 0.1 DWG转换: 用 ODA File Converter 或 AutoCAD 将 2025年毕业设计地形图.dwg → DXF
    下载ODA: https://www.opendesign.com/guestfiles/oda_file_converter
    转换命令: ODAFileConverter.exe "d:/1/AIGC" "d:/1/AIGC/output_p6" ACAD2018 DXF 2013 0 1
    （如果无法转换，跳过DWG依赖，完全基于照片和PPT做平面图）

[ ] 0.2 安装Python依赖:
    pip install Pillow opencv-python ezdxf matplotlib shapely imageio

[ ] 0.3 创建输出目录: output_p6/ 下的子目录
```

## Phase 1: 照片分析（必须，预计30-45min）

```
任务：分析47张MPO照片，为4个建筑节点+1个线性系统匹配场地

Python脚本要点：
  1. 读取全部47张MPO → 提取第一帧为JPG缩略图（2000px宽）
  2. 提取EXIF：拍摄时间、焦距、GPS（如有）
  3. 对每张照片做基础分类：
     - 建筑主体类（含完整建筑立面/结构）
     - 道路古道类（含石板路/山路/古道遗迹）
     - 水系溪流类（含溪流/水渠/河岸）
     - 田园荔枝林类（含果园/梯田/荔枝树）
     - 全景地形类（含远眺/山脊线/村落全景）
     - 细节材料类（含墙体材质/门窗/瓦片/石板）
  4. 为每个节点选出2-4张最佳匹配照片
  5. 提取材料色板：从照片中采样毛石/青砖/木材/瓦片的RGB色彩范围
  
输出：
  output_p6/01_photo_analysis/
    ├── photo_classification.csv      (47行：编号/分类/描述/匹配节点)
    ├── thumbnails/                   (47张缩略图)
    ├── node_photo_mapping.md         (4节点各2-4张匹配照片+选图理由)
    └── material_palette.png          (材料色板)
```

## Phase 2: 平面图生成（预计60min）

```
对于4个建筑节点（01/02/03/05）各生成1张：

步骤：
  1. 如果能读DXF → 提取场地等高线作为底图 → 标注节点位置
     如果不能读DXF → 基于匹配照片中的地形特征手绘场地关系
  2. 绘制1:200平面图（基于上述功能分区）
  3. 标注：原有保留(实线)、拆除(虚线×)、新建(红色实线)、功能分区(浅色填充+文字)
  4. 标注：关键尺寸、指北针、比例尺、主要材料

对于线性系统（04）：
  1. 绘制1:1000线性总平面图
  2. 标注：古道走向、高程变化、节点名称和间距、古遗址/指路碑位置

图纸规范：
  - 输出格式：PNG，A3@300dpi（约3508×4961px）
  - 图例统一：原有保留=黑实线 / 拆除=灰虚线+红× / 新建=红实线 / 功能分区=浅色填充
  - 字体：中文用思源黑体(Source Han Sans SC)，英文用Inter
```

## Phase 3: 效果图生成（预计90min，简化工具链）

### 方案选择建议

```
方案A（推荐，无需ComfyUI）：Midjourney / DALL-E 3 + 参考图
  优势：零搭建成本，控制力足够用于建筑方案表现
  流程：匹配照片作为reference → prompt生成 → 后期微调

方案B（如需更高精度）：ComfyUI + ControlNet
  优势：从照片精确提取结构线控制生成
  流程：ControlNet Canny+Depth → 图生图 → 后期
    
方案C（保底）：SketchUp + Enscape/Twinmotion 实时渲染
  优势：精确可控
  劣势：需建模时间
```

### 推荐方案A的Prompt模板（已验证可用）

```
=== 每张效果图的生成参数 ===

参考图：[选定的匹配照片，用作构图/地形/保留元素参考]

Prompt模板（EN，分两段）：
  
  [建筑类型段]：
  "professional architectural visualization of a renovated rural building cluster,
   [节点名称: Zouma Cloud Post / Lychee Grove Shared Courtyard / 
    Dragon Creek Resilience Workshop / Ridge Co-living Courtyard],
   [建筑特征: 根据节点不同填写——详见下方各节点Prompt],
   mountainous Chongqing village setting, overcast soft diffused light,
   spring early summer season, lush green lychee trees and native vegetation,
   
  [材质段]：
   local materials: rough grey-blue stone masonry walls, weathered grey-green 
   traditional small clay tiles on pitched roofs, dark brown timber structural 
   elements and window frames, flagstone paving,
   
  [改造特征段]：
   the renovation preserves original stone walls while adding contemporary 
   timber and glass elements, low-intervention approach, human scale,
   
  [风格段]：
   architectural competition rendering style, photorealistic, wide angle lens,
   4K quality, atmospheric mountain haze in distance, no people"

Negative Prompt：
  "text, watermark, signature, modern glass skyscraper, western architecture,
   fake antique Chinese style, over-saturated, harsh sunlight, concrete,
   people, cars, urban, plastic, neon, billboard, air conditioner unit"
```

### 各节点效果图Prompt差异

| 节点 | 建筑特征（追加到Prompt） | 保留元素（追加） | 改造元素（追加） |
|------|-----------------------|----------------|----------------|
| **走马云驿** | single-story compound with courtyard entrance facing an ancient stone path, timber-framed entry canopy, embedded digital display screens within stone walls | preserve the existing stone wall base, ancient pathway stones, surrounding mature trees | new timber canopy structure, glass-enclosed exhibition area, integrated digital signage |
| **荔下共享院** | courtyard compound of 2-3 buildings with central stone-paved yard, rammed earth walls with new glass conservatory addition, open processing workshop facing lychee orchard | preserve the rammed earth walls, courtyard stone paving, existing lychee trees within the yard | new glass sunroom for culinary classroom, open workshop with timber sliding doors, outdoor seating under lychee trees |
| **龙溪韧性工坊** | lightweight steel and timber structure elevated on stilts beside a mountain creek, timber lattice facade, cantilevered observation deck extending toward the water | preserve creek banks, existing boulders and native riparian vegetation, old small hydropower equipment as exhibits | new elevated timber deck over water, steel frame with timber cladding, rain garden and bioswale landscaping |
| **岭上共居院** | renovated stone courtyard houses on a ridge, 5-8 guest rooms with independent bathrooms, preserved stone walls with new timber balconies and updated window systems, shared courtyard with old tree as focal point | preserve the rough stone masonry walls, traditional grey tile roofs, old courtyard tree, existing courtyard layout | new timber balconies, updated dark timber-framed windows, outdoor fire pit area, shared kitchen glass extension |

### 生成流程（每节点）

```
1. 以匹配照片作为 reference/mood board
2. 先用 Midjourney /describe 分析照片内容和风格
3. 生成4个变体 → 选最佳1张
4. 对鸟瞰版本：在prompt末尾加 "aerial view, site plan perspective, showing relationship 
   with surrounding terrain, lychee orchards, creek valleys, and mountain contours"
5. 在 Photoshop/Affinity 中做后期：
   - 统一色彩（应用同一LUT）
   - 标注改造/保留元素
   - 叠加比例尺参考人
```

---

## Phase 4: 成果整合（预计30min）

```
[ ] 4.1 为每个节点生成 Before/After 对比图
     Before = 匹配照片（原貌）
     After = 效果图（改造后）
     并排排版，标注改造要点

[ ] 4.2 建立策略-图纸对照表
     | PPT策略 | 策略原文引用 | 体现在哪张图纸 | 具体体现方式 |

[ ] 4.3 生成成果报告（Markdown）
     包含：照片分析摘要 → 每节点图纸展示 → 策略对应验证

[ ] 4.4 （可选）将成果图嵌入网站四境详情页
     在 scenes-data.ts 中为每个场景增加 renovationImage 字段
     在 scenes/[slug]/page.tsx 中增加"空间改造示意"区块
```

---

# 第五部分：质量验收标准（修正版）

## 5.1 图纸完整性

| 验收项 | 数量 | 标准 |
|--------|------|------|
| 照片分类表 | 1份CSV | 47张照片全部分类，含内容描述和匹配节点 |
| 改造平面图 | 4张 | 走马云驿/荔下共享院/龙溪韧性工坊/岭上共居院，1:200 |
| 线性总平面 | 1张 | 古道长寿线，1:1000线性序列图 |
| 人视效果图 | 4张 | 每建筑节点1张，人眼高度1.6m视点 |
| 鸟瞰效果图 | 4张 | 每建筑节点1张，展示与地形/植被/水系关系 |
| Before/After对比 | 4组 | 照片vs效果图并排 |
| 成果报告 | 1份 | Markdown格式 |

## 5.2 策略对应验证

| PPT Slide | 策略内容 | 须在以下图纸中体现 |
|-----------|---------|-------------------|
| Slide 51 | 古道叙境·文化转译 | 走马云驿 平面+效果图 |
| Slide 52 | 荔田共生境·产业共生 | 荔下共享院 平面+效果图 |
| Slide 53 | 韧谷研学境·生态织补 | 龙溪韧性工坊 平面+效果图 |
| Slide 54 | 岭上共居境·建筑更新 | 岭上共居院 平面+效果图 |
| Slide 56(01) | 生态底线 | 所有鸟瞰效果图（不破坏山体/水系/林地） |
| Slide 56(03) | 尺度底线 | 所有效果图（小尺度/低干预） |
| Slide 56(04) | 材料底线 | 所有人视效果图（青石/木材/青砖/夯土） |

## 5.3 照片对应验证

| 每张效果图必须能回答 | 验证方式 |
|-------------------|---------|
| 哪张实地照片是生成基底？ | 标注照片编号 |
| 照片中的哪些元素被保留？ | 效果图上圈注 |
| 照片中的哪些元素被改造？ | 效果图上用不同颜色标注 |
| 地形/植被是否与照片一致？ | 鸟瞰效果图与全景类照片并排对比 |

---

# 第六部分：一键执行指令（可直接复制给Codex）

## Step 0: 环境检查与准备
```bash
cd d:/1/AIGC
mkdir -p output_p6/01_photo_analysis/thumbnails
mkdir -p output_p6/02_plans
mkdir -p output_p6/03_renderings
mkdir -p output_p6/04_before_after
mkdir -p output_p6/05_report
pip install Pillow opencv-python ezdxf matplotlib imageio
```

## Step 1: 照片分析
```
"分析 d:/1/AIGC/走马岭实地照片/ 中的47张MPO格式照片（Sony α7C II拍摄，4608×2592）。
 每张照片提取第一帧生成缩略图(2000px宽)，提取EXIF信息。
 按六类进行分类：A建筑主体/B道路古道/C水系溪流/D田园荔枝林/E全景地形/F细节材料。
 输出 photo_classification.csv（含照片编号/分类/内容描述/建筑特征识别/匹配节点）。
 为走马云驿/荔下共享院/龙溪韧性工坊/岭上共居院/古道长寿线各选出2-4张最佳匹配照片。
 从照片中提取材料色板（毛石/青砖/木材/小青瓦的RGB色彩范围）。
 生成 node_photo_mapping.md 说明每节点的选图理由。
 所有输出放在 output_p6/01_photo_analysis/。"
```

## Step 2: 平面图生成
```
"基于 photoshop分析结果，为四个建筑节点+一个线性系统生成图纸：

 建筑节点（各1张1:200平面图）：
  - 01走马云驿：村口道路交汇处，功能=接待大厅+AIGC展示+农产品展销+调度室，200-350㎡
  - 02荔下共享院：荔枝林边缘院落，功能=加工间+食育课堂+研学区+伴手礼展示，300-500㎡
  - 03龙溪韧性工坊：龙溪河岸线性布局，功能=水质监测+雨洪展示+水电记忆展厅+生态课堂，150-300㎡
  - 05岭上共居院：山脊院落群，功能=5-8间客房+共享公区+乡创办公，400-800㎡

 线性系统（1张1:1000线性总平面）：
  - 04古道长寿线：标注古道走向+高程变化+节点序列（间距50-150m）+古遗址/指路碑位置

 平面图要求：
  - 原有保留=黑实线 / 拆除=灰虚线+红× / 新建=红实线 / 功能分区=浅色填充
  - 标注关键尺寸、指北针、比例尺、主要材料
  - 输出PNG A3@300dpi
  - 放在 output_p6/02_plans/"
```

## Step 3: 效果图生成
```
"为四个建筑节点各生成2张效果图（人视点1.6m+鸟瞰），共8张。

 推荐工具：Midjourney v6 或 DALL-E 3（如追求精度用ComfyUI+ControlNet Canny/Depth）

 Prompt核心结构（每张图都包含）：
  'architectural visualization, renovated rural building, Chongqing mountainous village,
   [节点建筑特征], [保留元素], [改造元素],
   local stone masonry, timber, grey tile roof,
   overcast soft light, spring season, lychee trees, misty mountain background,
   architectural competition rendering, photorealistic, 4K, wide angle'

 各节点差异见 CODEX_P6_ARCHITECTURAL_RENOVATION.md 第四部分Prompt模板。

 以Phase 1选出的匹配照片作为构图和地形参考。
 后期统一色彩、标注保留/改造元素。
 输出到 output_p6/03_renderings/"
```

## Step 4: 整合与验证
```
"生成4组Before/After对比图（匹配照片vs效果图并排），放在 output_p6/04_before_after/。
 生成策略-图纸对应验证表。
 生成成果报告 output_p6/05_report/P6_renovation_report.md。
 对照验收标准逐项自查。"
```

---

# 第七部分：风险与兜底

| 风险 | 概率 | 兜底方案 |
|------|------|---------|
| DWG无法转换 | 中 | 基于照片中的地形特征手绘场地关系（照片清晰度足够支持） |
| AI效果图结构失真 | 中 | 对每张图人工审核柱/梁/屋顶/门窗数量，失真的用SketchUp建模补 |
| 照片没有覆盖某节点场地 | 低 | 47张覆盖了走马岭全域，但若确实缺失则标注"需补充实地拍摄" |
| AI无法生成鸟瞰图 | 中 | 鸟瞰改为轴测示意图（SketchUp导出线稿+AI上色） |
| Midjourney不支持参考图精确控制 | 中 | 改用DALL-E 3的inpainting或ComfyUI ControlNet |

---

> **核心原则回顾**:
> 这个任务不是"凭空设计美丽乡村"，而是"基于47张真实照片+PPT策略，为走马岭的4个真实场地生成可追溯的建筑改造方案"。
> 每张图必须能回答三个问题：
> 1. 它在走马岭的哪个位置（对应哪张实地照片）？
> 2. 它体现了PPT Slide 50-56中的哪条策略？
> 3. 改造前后有什么变化（保留了什么、新增了什么）？
>
> **不是六个节点，是四个建筑节点 + 一个线性步道 + 一个数字系统（网站已有）。**
