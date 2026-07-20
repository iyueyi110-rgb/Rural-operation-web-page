# Adoption Simulation Resume Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 运行并验证“认养一棵树”固定 V0/V1 场景回归，形成可直接用于产品经理简历的结论、下一代迭代依据和面试话术。

**Architecture:** 使用现有确定性引擎生成 5 个固定种子 × 8 个场景的 40 组成对证据，仅导出比较所需的配置、指标、结论和 Bad Case 摘要。Jupyter Notebook 负责可复现聚合、口径校验和结论生成；Markdown 负责最终读者表述。运行产物保存在已被 Git 忽略的 `outputs/simulation/resume-analysis/`，只提交最终文档。

**Tech Stack:** TypeScript、`@zouma/simulation`、tsx、Python 3、Jupyter/nbformat、Markdown

## Global Constraints

- 主要证据固定为种子 `20260713—20260717` × 8 个场景，共 40 组成对回归。
- 每组 V0/V1 必须具有相同的 `seed`、场景、配置和 `worldHash`。
- 主要指标为模拟接单率、按时提交率、首次审核通过率和逾期率。
- 护栏指标为平均接单时间、重新分配率、人工介入次数和分配公平性 CV。
- 所有结论必须使用“模拟”“测评”或“验证”限定词。
- 不将模拟差异表述为真实用户行为、真实村民效率、真实收益或因果提升。
- 只使用已执行、已验证的数字；不能验证的数字不得进入简历。
- 不修改模拟引擎、业务代码、真实业务表或现有用户文件。

---

### Task 1: 生成最小可复核回归证据

**Files:**

- Create: `outputs/simulation/resume-analysis/extract-matrix.ts`
- Create: `outputs/simulation/resume-analysis/matrix-detail.json`

**Interfaces:**

- Consumes: `REGRESSION_SEEDS`、`SCENARIOS`、`runSimulationPair()`、`compareSimulationRuns()` from `@zouma/simulation`.
- Produces: `matrix-detail.json`，每行包含 seed、scenario、两个 worldHash、13 项 V0/V1 指标、推荐结论、原因和 Bad Case 数量。

- [ ] **Step 1: 创建最小证据提取器**

在 `extract-matrix.ts` 中使用以下结构，禁止序列化完整任务和事件明细：

```ts
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  REGRESSION_SEEDS,
  SCENARIOS,
  compareSimulationRuns,
  runSimulationPair,
} from "@zouma/simulation"

const outputDirectory = import.meta.dirname
const rows = REGRESSION_SEEDS.flatMap((seed) =>
  SCENARIOS.map((scenario) => {
    const pair = runSimulationPair({ seed, scenario })
    const comparison = compareSimulationRuns(pair.v0, pair.v1)
    return {
      seed,
      scenario,
      pairId: pair.pairId,
      v0WorldHash: pair.v0.worldHash,
      v1WorldHash: pair.v1.worldHash,
      v0Metrics: pair.v0.metrics,
      v1Metrics: pair.v1.metrics,
      metricComparisons: comparison.metrics,
      recommendation: comparison.recommendation,
      reasons: comparison.reasons,
      v0BadCases: pair.v0.badCases.length,
      v1BadCases: pair.v1.badCases.length,
    }
  }),
)

await mkdir(outputDirectory, { recursive: true })
await writeFile(
  join(outputDirectory, "matrix-detail.json"),
  `${JSON.stringify({
    dataOrigin: "simulation",
    disclaimer: "模拟运营数据，不代表真实业务结果",
    rows,
  }, null, 2)}\n`,
)
```

- [ ] **Step 2: 执行提取器**

Run:

```bash
pnpm --filter @zouma/simulation exec tsx \
  ../../outputs/simulation/resume-analysis/extract-matrix.ts
```

Expected: 退出码为 0，并生成 `matrix-detail.json`。

- [ ] **Step 3: 验证矩阵完整性**

Run:

```bash
node -e '
const d=require("./outputs/simulation/resume-analysis/matrix-detail.json");
if(d.rows.length!==40) process.exit(1);
if(new Set(d.rows.map(r=>r.seed)).size!==5) process.exit(1);
if(new Set(d.rows.map(r=>r.scenario)).size!==8) process.exit(1);
if(d.rows.some(r=>r.v0WorldHash!==r.v1WorldHash)) process.exit(1);
console.log("matrix integrity passed")'
```

Expected: 输出 `matrix integrity passed`。

### Task 2: 构建并执行可复现分析 Notebook

**Files:**

- Create: `outputs/simulation/resume-analysis/adoption-simulation-resume-analysis.ipynb`
- Create: `outputs/simulation/resume-analysis/scenario-summary.csv`
- Create: `outputs/simulation/resume-analysis/conclusion.json`

**Interfaces:**

- Consumes: `matrix-detail.json`.
- Produces: 按场景聚合的指标差异、推荐分布、迭代优先级和可引用数字。

- [ ] **Step 1: 创建隔离的 Notebook 运行环境**

Run:

```bash
python3 -m venv outputs/simulation/resume-analysis/.venv
outputs/simulation/resume-analysis/.venv/bin/pip install \
  nbformat nbclient nbconvert ipykernel
```

Expected: 安装成功，依赖只存在于已被 Git 忽略的分析目录。

- [ ] **Step 2: 使用 nbformat 创建分析 Notebook**

Notebook 固定包含：`tl;dr`、`Context & Methods`、`Data`、`Results`、`Takeaways`。计算单元至少执行以下校验：

```python
assert len(rows) == 40
assert sorted({row["seed"] for row in rows}) == list(range(20260713, 20260718))
assert len({row["scenario"] for row in rows}) == 8
assert all(row["v0WorldHash"] == row["v1WorldHash"] for row in rows)
assert all(
    sum(row["scenario"] == scenario for row in rows) == 5
    for scenario in sorted({row["scenario"] for row in rows})
)
```

比率指标按场景分别汇总 V0/V1 的 numerator 和 denominator 后再相除，不计算简单平均值：

```python
def pooled_rate(group, version, key):
    metrics = [row[f"{version}Metrics"][key] for row in group]
    denominator = sum(metric["denominator"] for metric in metrics)
    numerator = sum(metric["numerator"] for metric in metrics)
    return None if denominator == 0 else numerator / denominator
```

Notebook 输出推荐结论分布、每个场景的主要指标百分点差、平均接单时间差、重派率差、人工介入差、公平性 CV 差及 Bad Case 差。

- [ ] **Step 3: 执行 Notebook**

Run:

```bash
outputs/simulation/resume-analysis/.venv/bin/python -m jupyter nbconvert \
  --execute --to notebook --inplace \
  outputs/simulation/resume-analysis/adoption-simulation-resume-analysis.ipynb
```

Expected: 全部单元执行成功，生成 `scenario-summary.csv` 和 `conclusion.json`。

- [ ] **Step 4: 独立抽验关键结论**

用 Node 直接读取 `matrix-detail.json`，独立核对推荐数量之和为 40、每个场景为 5 组、所有 `worldHash` 一致，并抽查 `conclusion.json` 中至少两个比例指标的分子与分母。若 Notebook 与 Node 结果不一致，停止生成简历文案。

### Task 3: 形成产品结论与下一代迭代优先级

**Files:**

- Create: `docs/认养一棵树场景模拟结论与简历文案.md`

**Interfaces:**

- Consumes: `conclusion.json`、`scenario-summary.csv`、`docs/simulation-metrics.md`.
- Produces: 经过数据验证的结论、下一代规则优先级、简历文本和面试话术。

- [ ] **Step 1: 写明证据范围与结论**

文档开头必须包含：

```markdown
> 数据范围：5 个固定种子 × 8 个场景，共 40 组 V0/V1 同世界成对模拟。
> 模拟运营数据，不代表真实业务结果。
```

按“支持升级 / 暂不支持 / 场景退化 / 样本不足”的实际分布总结结果，不预设 V1 胜出。

- [ ] **Step 2: 生成下一代迭代表**

每个优先级使用固定字段：问题指标、场景证据、事件/Bad Case 定位、下一代规则动作、成功指标、护栏指标。只选择实际数据中最重要的 2—4 项。

- [ ] **Step 3: 生成产品经理简历文案**

文档必须包含项目名称、一句话简介和三条经历：

```markdown
**项目名称：** “认养一棵树”V0/V1 多场景规则测评系统

**项目简介：** [基于已验证证据写 40—60 字，必须出现“模拟”或“测评”]

- [业务闭环：角色、端到端流程、异常状态]
- [规则迭代：40 组成对测评、关键结果、下一代优先级]
- [数据决策：13 项指标、事件链/Bad Case、升级门槛与真实性边界]
```

- [ ] **Step 4: 写 30—60 秒面试话术**

话术使用“问题 → 方法 → 发现 → 决策 → 边界”顺序，不将模拟结果描述为已上线收益。

### Task 4: 验证并提交最终文档

**Files:**

- Verify: `docs/认养一棵树场景模拟结论与简历文案.md`
- Verify: `outputs/simulation/resume-analysis/adoption-simulation-resume-analysis.ipynb`

**Interfaces:**

- Consumes: Task 1—3 的全部产物。
- Produces: 可分享的简历文案和可复核的分析证据。

- [ ] **Step 1: 验证数字和表述**

逐项检查简历中的每个数字都能在 `conclusion.json` 或 `scenario-summary.csv` 找到；检查没有“真实提升”“上线后”“用户增长”“收益增长”等未经支持的因果表述。

- [ ] **Step 2: 运行最终门禁**

Run:

```bash
pnpm --filter @zouma/simulation test
outputs/simulation/resume-analysis/.venv/bin/python -m jupyter nbconvert \
  --execute --to notebook --inplace \
  outputs/simulation/resume-analysis/adoption-simulation-resume-analysis.ipynb
rg -n '模拟运营数据，不代表真实业务结果' \
  docs/认养一棵树场景模拟结论与简历文案.md
git diff --check -- docs/认养一棵树场景模拟结论与简历文案.md
```

Expected: 模拟测试全绿、Notebook 重跑成功、免责声明命中且 diff check 通过。

- [ ] **Step 3: 仅提交最终文档**

Run:

```bash
git add -- docs/认养一棵树场景模拟结论与简历文案.md
git commit --only docs/认养一棵树场景模拟结论与简历文案.md \
  -m "docs: add simulation conclusions and resume copy"
```

Expected: 提交只包含最终 Markdown；忽略的 Notebook 和分析输出保留在本地用于复核，用户原有暂存文件保持不变。
