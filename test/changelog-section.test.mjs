// scripts/changelog-section.mjs 的行为断言。
//
// 这个脚本是 GitHub Release 说明的唯一来源：发布流水线在 tag 上跑它，
// 取不到正文就让发布失败。所以两类错必须被拦住：
//   1. 截错范围（把下一版的条目带进来，或漏掉本版最后一条）；
//   2. 版本不存在时静默返回空串，发出一个没有说明的 Release。

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { changelogSection } from '../scripts/changelog-section.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const changelog = readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8')

test('取出的正文不含版本标题，也不含下一版内容', () => {
  const body = changelogSection(changelog, '0.2.4')
  assert.ok(!body.includes('## 0.2.4'), '正文不该重复版本标题')
  assert.ok(!body.includes('## 0.2.3'), '正文不该带下一节的标题')
  assert.ok(!body.includes('适配宿主 0.2.2-rc.1。修的是升级后'), '正文不该带 0.2.3 的内容')
  assert.ok(body.startsWith('兼容新一代 Agent Teams 定义'), '正文应从本版摘要开始')
})

test('取出的正文到本版最后一条为止，不吞掉后面的版本', () => {
  const body = changelogSection(changelog, '0.2.3')
  assert.ok(body.startsWith('适配宿主 0.2.2-rc.1'), '0.2.3 应从自己的摘要开始')
  assert.ok(body.includes('验证'), '0.2.3 的最后一条（验证）要在')
  assert.ok(!body.includes('## 0.2.2'), '不该带 0.2.2 的标题')
})

test('旧版本也能取到，说明不是只认最新一版', () => {
  const body = changelogSection(changelog, '0.2.0')
  assert.ok(body.length > 0)
  assert.ok(!body.includes('## 0.2.1'), '不该带 0.2.1 的标题')
})

test('版本不存在时抛错，并列出已有版本', () => {
  assert.throws(
    () => changelogSection(changelog, '9.9.9'),
    /没有 9\.9\.9 这一节；现有：.*0\.2\.4/,
  )
})
