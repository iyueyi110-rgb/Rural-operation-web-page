import assert from "node:assert/strict"
import test from "node:test"

let inspectDocumentationText
try {
  ;({ inspectDocumentationText } = await import("./check-docs-language.mjs"))
} catch {
  inspectDocumentationText = undefined
}

test("导出可复用的文档语言检查函数", () => {
  assert.equal(typeof inspectDocumentationText, "function")
})

test(
  "拒绝代码围栏外的纯英文一至三级标题",
  { skip: typeof inspectDocumentationText !== "function" },
  () => {
    const failures = inspectDocumentationText({
      file: "README.md",
      markdown: "# 中文首页\n\n## Commands\n\n### API 约束\n",
    })

    assert.deepEqual(failures, [
      "README.md:3: 一级至三级标题不能只使用英文：## Commands",
    ])
  },
)

test(
  "接受中文标题，并忽略代码围栏内的英文标题语法",
  { skip: typeof inspectDocumentationText !== "function" },
  () => {
    const failures = inspectDocumentationText({
      file: "docs/example.md",
      markdown:
        "# 中文说明\n\n## API 调用方式\n\n```dotenv\n# DEEPSEEK_API_KEY=\n```\n",
    })

    assert.deepEqual(failures, [])
  },
)

test(
  "拒绝过时的英文首页引用和双语承诺",
  { skip: typeof inspectDocumentationText !== "function" },
  () => {
    const failures = inspectDocumentationText({
      file: "docs/example.md",
      markdown:
        "# 文档\n\n请参阅 [English](../../README.en.md)，本仓库提供中英双语文档。\n",
    })

    assert.deepEqual(failures, [
      "docs/example.md:3: 不得引用已移除的 README.en.md",
      "docs/example.md:3: 不得承诺维护中英双语文档",
    ])
  },
)

test(
  "拒绝代码围栏外未处理的 TODO 或 TBD 展示占位",
  { skip: typeof inspectDocumentationText !== "function" },
  () => {
    const publicFailures = inspectDocumentationText({
      file: "docs/portfolio/README.md",
      markdown: "# 证据索引\n\nTODO: 补链接\n\nTBD\n",
    })
    const historicalFailures = inspectDocumentationText({
      file: "docs/superpowers/plans/history.md",
      markdown: "# 历史材料\n\nTODO: 当时待处理\n",
    })

    assert.deepEqual(publicFailures, [
      "docs/portfolio/README.md:3: 文档不得保留 TODO/TBD 展示占位",
      "docs/portfolio/README.md:5: 文档不得保留 TODO/TBD 展示占位",
    ])
    assert.deepEqual(historicalFailures, [
      "docs/superpowers/plans/history.md:3: 文档不得保留 TODO/TBD 展示占位",
    ])
  },
)
