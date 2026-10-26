#!/usr/bin/env node
// CI 用：确认 cordis.patch.yml 在宿主方言下能解析，且结构符合预期。
//
// 宿主自己的解析器在 app.asar 里，测试进程拿不到。这里用零依赖的
// test/support/yaml-lite.mjs，语义与宿主一致（含 `!!js` → __jsExpr）。

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseYamlLite } from '../test/support/yaml-lite.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const patchPath = resolve(repoRoot, 'cordis.patch.yml')

const text = await readFile(patchPath, 'utf8')
const doc = parseYamlLite(text)

if (!Array.isArray(doc)) {
  throw new Error('cordis.patch.yml 顶层必须是数组')
}

const entries = doc.flatMap((layer) => layer?.insert ?? [])
if (entries.length === 0) {
  throw new Error('cordis.patch.yml 没有任何 insert 行')
}

const presets = entries.filter((e) => e.name === '@deepseek-ai/dsh-agent-preset')
if (presets.length !== 1) {
  throw new Error(`期望 1 行 @deepseek-ai/dsh-agent-preset，实际 ${presets.length} 行`)
}

const preset = presets[0]
const plugins = preset.config?.plugins
if (!Array.isArray(plugins) || plugins.length === 0) {
  throw new Error('preset 的 config.plugins 缺失或为空')
}

const ids = plugins.map((p) => p.id)
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
if (duplicates.length > 0) {
  throw new Error(`preset 里行 id 重复：${duplicates.join(', ')}`)
}

const personas = plugins.filter((p) => p.name === '@deepseek-ai/dsh-persona')
if (personas.length !== 1) {
  throw new Error(`期望 1 行 @deepseek-ai/dsh-persona，实际 ${personas.length} 行`)
}

console.log(`patch OK: ${entries.length} 行 insert，preset ${preset.config.id} 有 ${plugins.length} 个子行`)
