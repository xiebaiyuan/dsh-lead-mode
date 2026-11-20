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

// 两个预置：lead-ptc 与 lead-cordis（创造）。少一个或多一个都要红，
// 因为 lib/index.js 的 /lead-mode 报告和 README 都按两个来写。
const EXPECTED_PRESET_IDS = ['lead-ptc', 'lead-cordis']
const presets = entries.filter((e) => e.name === '@deepseek-ai/dsh-agent-preset')
if (presets.length !== EXPECTED_PRESET_IDS.length) {
  throw new Error(
    `期望 ${EXPECTED_PRESET_IDS.length} 行 @deepseek-ai/dsh-agent-preset，实际 ${presets.length} 行`,
  )
}

const summary = []
for (const preset of presets) {
  const id = preset.config?.id
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(`有一行 preset 的 config.id 缺失：${JSON.stringify(preset.id)}`)
  }
  if (!EXPECTED_PRESET_IDS.includes(id)) {
    throw new Error(`预置 id ${id} 不在预期清单里：${EXPECTED_PRESET_IDS.join(', ')}`)
  }

  const plugins = preset.config?.plugins
  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new Error(`${id} 的 config.plugins 缺失或为空`)
  }

  const ids = plugins.map((p) => p.id)
  const duplicates = ids.filter((rowId, i) => ids.indexOf(rowId) !== i)
  if (duplicates.length > 0) {
    throw new Error(`${id} 里行 id 重复：${duplicates.join(', ')}`)
  }

  const personas = plugins.filter((p) => p.name === '@deepseek-ai/dsh-persona')
  if (personas.length !== 1) {
    throw new Error(`${id} 期望 1 行 @deepseek-ai/dsh-persona，实际 ${personas.length} 行`)
  }

  const prefix = personas[0].config?.prefix
  if (typeof prefix !== 'string' || prefix.trim().length === 0) {
    throw new Error(`${id} 的 persona.config.prefix 缺失或为空`)
  }
  if (prefix.trim().length >= 400) {
    throw new Error(`${id} 的 persona prefix 有 ${prefix.trim().length} 字，超过 400 上限`)
  }

  const order = preset.config?.order
  if (typeof order !== 'number') {
    throw new Error(`${id} 缺少数字类型的 order`)
  }

  summary.push(`${id}(order ${order}) 有 ${plugins.length} 个子行`)
}

const seen = new Set(presets.map((p) => p.config.id))
for (const id of EXPECTED_PRESET_IDS) {
  if (!seen.has(id)) throw new Error(`缺少预置 ${id}`)
}

console.log(`patch OK: ${entries.length} 行 insert；${summary.join('；')}`)
