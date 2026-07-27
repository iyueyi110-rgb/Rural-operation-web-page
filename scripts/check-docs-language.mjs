const chineseCharacter = /[\u3400-\u9fff]/u
const latinCharacter = /[A-Za-z]/u
const staleBilingualPromise =
  /中英(?:文)?双语|双语文档|中文和英文\s*README|中英文\s*README/u

export function inspectDocumentationText({ file, markdown }) {
  const failures = []
  const normalizedFile = file.replaceAll("\\", "/")
  let fence = null

  for (const [index, line] of markdown.split(/\r?\n/u).entries()) {
    const fenceMatch = line.match(/^\s*(```|~~~)/u)
    if (fenceMatch) {
      fence = fence === null ? fenceMatch[1] : fence === fenceMatch[1] ? null : fence
      continue
    }
    if (fence) continue

    const heading = line.match(/^(#{1,3})\s+(.+?)\s*$/u)
    if (
      heading &&
      latinCharacter.test(heading[2]) &&
      !chineseCharacter.test(heading[2])
    ) {
      failures.push(
        `${normalizedFile}:${index + 1}: 一级至三级标题不能只使用英文：${line}`,
      )
    }

    if (line.includes("README.en.md")) {
      failures.push(
        `${normalizedFile}:${index + 1}: 不得引用已移除的 README.en.md`,
      )
    }
    if (staleBilingualPromise.test(line)) {
      failures.push(
        `${normalizedFile}:${index + 1}: 不得承诺维护中英双语文档`,
      )
    }
    if (/\b(?:TODO|TBD)\b/u.test(line)) {
      failures.push(
        `${normalizedFile}:${index + 1}: 文档不得保留 TODO/TBD 展示占位`,
      )
    }
  }

  return failures
}
