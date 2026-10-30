// 预设结构断言。
//
// 这些断言守的是「提醒用户开官方 Team 模式」这条需求的通道 A：
// persona prefix 会进 system prompt 的 DEPLOYMENT_PERSONA_PREFIX 段（order 0），
// 模型一定看得见。所以 prefix 里那几句提醒必须真的在，且不能被别的段遮掉。
//
// 另外守一条回归线：lead-mode 预设与官方 standard 预设行 id 集合必须完全相同。
// 这个插件只该改 persona，别的一律照抄。谁往 preset 里塞东西，这里就红。

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { parseYamlLite } from './support/yaml-lite.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const patchPath = resolve(repoRoot, 'cordis.patch.yml')
const fixturePath = resolve(repoRoot, 'test/fixtures/standard-preset.yml')

/** 官方 profile 包的版本。prefix 与命令文本都要带，防止被改成裸包名。 */
const TEAM_VERSION = '0.2.1-rc.5'

/** Team 运行时的三个包。它们属宿主平面，不该出现在本插件的 patch 里。 */
const TEAM_RUNTIME_PACKAGES = [
  '@deepseek-ai/dsh-experimental-agent-team',
  '@deepseek-ai/dsh-experimental-tool-agent-team',
  '@deepseek-ai/dsh-experimental-client-ui-agent-team',
]

/** 把一条 insert 里的插件行摊平，组行连同子行一起返回。 */
function flatten(plugins, acc = []) {
  for (const row of plugins ?? []) {
    acc.push(row)
    if (row.group) flatten(row.config, acc)
  }
  return acc
}

async function loadPatch() {
  const doc = parseYamlLite(await readFile(patchPath, 'utf8'))
  assert.ok(Array.isArray(doc), 'cordis.patch.yml 顶层必须是数组')
  return doc
}

function findLeadPreset(doc) {
  const entries = doc.flatMap((layer) => layer?.insert ?? [])
  const presets = entries.filter((entry) => entry.name === '@deepseek-ai/dsh-agent-preset')
  assert.equal(presets.length, 1, '期望恰好 1 行 @deepseek-ai/dsh-agent-preset')
  return { preset: presets[0], entries }
}

test('存在 id=preset-lead-mode 的 agent-preset 行', async () => {
  const { preset } = findLeadPreset(await loadPatch())
  assert.equal(preset.id, 'preset-lead-mode', '预设行的 loader id 跟官方 preset-standard 对齐')
  assert.equal(preset.config.id, 'lead-mode', 'config.id 是会话保存的预设标识')
  assert.equal(preset.config.name, 'Lead 模式')
  assert.equal(preset.config.order, 5)
})

test('patch 里有本插件自己的 host 半边行', async () => {
  // 关键结构：bundle patch 只挂 @deepseek-ai/dsh-agent-preset 的话，
  // lib/index.js 永远不会被加载，skill 和 /lead-mode 命令都是死代码。
  // 所以必须另有一行把包名本身挂上。
  const pkg = JSON.parse(await readFile(resolve(repoRoot, 'package.json'), 'utf8'))
  const { entries } = findLeadPreset(await loadPatch())
  const selfRows = entries.filter((entry) => entry.name === pkg.name)
  assert.equal(selfRows.length, 1, `期望 1 行 name=${pkg.name} 的 host 半边`)
  assert.equal(selfRows[0].id, pkg.name, 'host 半边行的 id 与包名一致')
})

test('persona 只出现一次，不被 shadow', async () => {
  const { preset } = findLeadPreset(await loadPatch())
  const personas = preset.config.plugins.filter((row) => row.name === '@deepseek-ai/dsh-persona')
  assert.equal(personas.length, 1, 'preset 里 persona 必须恰好 1 行')
  // 摊平后也只该有 1 行，组里再塞一份同样会覆盖掉前缀
  const all = flatten(preset.config.plugins)
  assert.equal(
    all.filter((row) => row.name === '@deepseek-ai/dsh-persona').length,
    1,
    '整棵 preset 树里 persona 必须恰好 1 行',
  )
})

test('persona prefix 含提醒关键词与带版本号的安装命令', async () => {
  const { preset } = findLeadPreset(await loadPatch())
  const persona = preset.config.plugins.find((row) => row.name === '@deepseek-ai/dsh-persona')
  const prefix = persona.config?.prefix
  assert.equal(typeof prefix, 'string', 'persona.config.prefix 必须是字符串')
  assert.ok(prefix.trim().length > 0, 'prefix 不能为空')

  // 通道 A 的两个核心词：模型得知道缺什么工具、该让用户开什么
  assert.ok(prefix.includes('spawn_teammate'), 'prefix 必须提到 spawn_teammate')
  assert.ok(prefix.includes('Agent Teams'), 'prefix 必须提到 Agent Teams')

  // 第三个词防止安装命令被改成裸包名：npm 上 latest 是 0.1.5-alpha.2，
  // 裸装会挂到和 0.2.1 宿主对不上的版本。
  assert.ok(prefix.includes(TEAM_VERSION), `prefix 必须带版本号 ${TEAM_VERSION}`)
})

test('preset 行 id 集合与官方 standard 完全相同', async () => {
  const { preset } = findLeadPreset(await loadPatch())
  const standard = parseYamlLite(await readFile(fixturePath, 'utf8'))
  const standardPlugins = standard[0].insert[0].config.plugins

  const leadIds = preset.config.plugins.map((row) => row.id)
  const standardIds = standardPlugins.map((row) => row.id)

  assert.deepEqual(
    [...leadIds].sort(),
    [...standardIds].sort(),
    `lead-mode 与 standard 的行 id 集合必须相同。lead 多出 ${leadIds.filter((id) => !standardIds.includes(id))}，standard 多出 ${standardIds.filter((id) => !leadIds.includes(id))}`,
  )
  assert.equal(leadIds.length, standardIds.length, '行数必须相同')
  assert.equal(new Set(leadIds).size, leadIds.length, '行 id 不能重复')
})

test('preset 不含任何 Team 运行时行', async () => {
  const { preset } = findLeadPreset(await loadPatch())
  const all = flatten(preset.config.plugins)
  const offenders = all
    .map((row) => row.name)
    .filter((name) => TEAM_RUNTIME_PACKAGES.includes(name))
  assert.deepEqual(offenders, [], 'Team 运行时属宿主平面，不该出现在 preset 里')
})

test('patch 全文不含 Team 运行时行', async () => {
  const { entries } = findLeadPreset(await loadPatch())
  const offenders = entries
    .map((entry) => entry.name)
    .filter((name) => TEAM_RUNTIME_PACKAGES.includes(name))
  assert.deepEqual(offenders, [], 'cordis.patch.yml 不该插入 Team 运行时，双挂会冲突')
})

test('分组行保留 isolate realm', async () => {
  const { preset } = findLeadPreset(await loadPatch())
  const groups = preset.config.plugins.filter((row) => row.group === true)
  assert.ok(groups.length > 0, 'standard 有分组行，这里也该有')
  for (const group of groups) {
    assert.equal(group.name, 'cordis:group', `${group.id} 必须是 cordis:group`)
    assert.equal(typeof group.isolate, 'object', `${group.id} 必须带 isolate`)
    assert.ok(Object.keys(group.isolate).length > 0, `${group.id} 的 isolate 不能为空`)
  }
  // standard 的三个分组：planning / compaction / delegation
  assert.deepEqual(
    groups.map((row) => row.id).sort(),
    ['compaction', 'delegation', 'planning'],
    '分组行必须与 standard 一致',
  )
})

test('preset 只改了 persona，其余行与 standard 逐字段一致', async () => {
  const { preset } = findLeadPreset(await loadPatch())
  const standard = parseYamlLite(await readFile(fixturePath, 'utf8'))
  const standardPlugins = standard[0].insert[0].config.plugins
  const leadById = new Map(preset.config.plugins.map((row) => [row.id, row]))

  for (const expected of standardPlugins) {
    if (expected.name === '@deepseek-ai/dsh-persona') continue
    const actual = leadById.get(expected.id)
    assert.ok(actual !== undefined, `缺少行 ${expected.id}`)
    assert.deepEqual(actual, expected, `行 ${expected.id} 与 standard 不一致`)
  }
})

// 「工作日志」这条硬要求必须同时在两处成立：skill 正文（按需加载）和
// persona prefix（常驻 system prompt）。只写在 skill 里的话，Lead 没加载
// skill 就看不见，成员被打断时账本也就没人建。
test('persona prefix 要求成员第一步建工作日志', async () => {
  const { preset } = findLeadPreset(await loadPatch())
  const persona = preset.config.plugins.find((row) => row.name === '@deepseek-ai/dsh-persona')
  const prefix = persona.config?.prefix
  assert.equal(typeof prefix, 'string', 'persona.config.prefix 必须是字符串')

  assert.ok(prefix.includes('worklog-'), 'prefix 必须给出工作日志的文件名约定 worklog-')
  assert.ok(prefix.includes('.scratch/'), 'prefix 必须给出工作日志的所在目录 .scratch/')
  assert.ok(
    /第一步|第一件事/.test(prefix),
    'prefix 必须写明建工作日志是成员第一步要做的事',
  )
})
