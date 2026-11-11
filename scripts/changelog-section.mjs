/**
 * 从 CHANGELOG.md 取出一版的正文，供 GitHub Release 使用。
 *
 * 用法：
 *   node scripts/changelog-section.mjs 0.2.4            # 打到 stdout
 *   node scripts/changelog-section.mjs 0.2.4 out.md     # 写到文件
 *
 * 规则：从 `## <version>` 这一行之后开始，到下一个 `## ` 之前结束；
 * 标题本身不输出（Release 的标题已经是版本号）。
 * 找不到这一版就非零退出，并把已有版本列到 stderr——宁可让发布失败，
 * 也不要发一个没有说明的 Release。
 *
 * @module scripts/changelog-section
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 仓库根：脚本在 scripts/ 下。 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** CHANGELOG 里的二级标题，例如 `## 0.2.4`。 */
const SECTION = /^##\s+(\S+)\s*$/

/**
 * 取出一个版本的正文。
 *
 * @param changelog - CHANGELOG.md 的全文。
 * @param version - 版本号，不带 `v` 前缀（`0.2.4`）。
 * @returns 该版本的正文，已去掉首尾空行。
 * @throws 当这一版不存在时。
 */
export function changelogSection(changelog, version) {
  const lines = changelog.split(/\r?\n/)
  const versions = []
  let start = -1
  let end = lines.length
  for (let index = 0; index < lines.length; index += 1) {
    const match = SECTION.exec(lines[index])
    if (match === null) continue
    versions.push(match[1])
    if (match[1] !== version) continue
    start = index + 1
    break
  }
  if (start < 0) {
    throw new Error(`CHANGELOG.md 里没有 ${version} 这一节；现有：${versions.join(', ')}`)
  }
  for (let index = start; index < lines.length; index += 1) {
    if (SECTION.test(lines[index])) {
      end = index
      break
    }
  }
  const body = lines.slice(start, end).join('\n').trim()
  if (body.length === 0) throw new Error(`CHANGELOG.md 里 ${version} 这一节是空的`)
  return body
}

/**
 * CLI 入口。
 *
 * @param argv - `process.argv` 去掉 node 与脚本路径。
 */
function main(argv) {
  const version = argv[0]?.replace(/^v/, '')
  if (version === undefined) {
    console.error('用法：node scripts/changelog-section.mjs <version> [outFile]')
    process.exitCode = 2
    return
  }
  const changelog = readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8')
  const body = changelogSection(changelog, version)
  const outFile = argv[1]
  if (outFile === undefined) process.stdout.write(`${body}\n`)
  else writeFileSync(outFile, `${body}\n`)
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2))
}
