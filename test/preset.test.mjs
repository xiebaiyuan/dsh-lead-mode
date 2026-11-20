// 预置结构断言。
//
// 这些断言守的是「提醒用户开官方 Team 模式」这条需求的通道 A：
// persona prefix 会进 system prompt 的 DEPLOYMENT_PERSONA_PREFIX 段（order 0），
// 模型一定看得见。所以 prefix 里那几句提醒必须真的在，且不能被别的段遮掉。
//
// 两个预置，守同一条回归线：lead-ptc 与官方 ptc 预置行 id 集合必须完全相同，
// lead-cordis 与官方 cordis（创造）预置行 id 集合必须完全相同。这个插件只该改
// persona，别的一律照抄。谁往预置里塞东西，这里就红。
//
// lead-cordis 有且只有一处在 fixture 之外：官方 cordis 的 skill-filesystem 行
// 带一条用 patch 文件 baseUrl 解析的 customSkillDirs，从本插件包的位置解析不到
// 宿主包，照抄会抛错。所以那一行必须不带它，见下方专门用例。

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { parseYamlLite } from './support/yaml-lite.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const patchPath = resolve(repoRoot, 'cordis.patch.yml')
const ptcFixturePath = resolve(repoRoot, 'test/fixtures/ptc-preset.yml')
const createFixturePath = resolve(repoRoot, 'test/fixtures/cordis-preset.yml')

/** 官方 profile 包的版本。prefix 与命令文本都要带，防止被改成裸包名。 */
const TEAM_VERSION = '0.2.2-rc.1'

/** Team 运行时的三个包。它们属宿主平面，不该出现在本插件的 patch 里。 */
const TEAM_RUNTIME_PACKAGES = [
  '@deepseek-ai/dsh-experimental-agent-team',
  '@deepseek-ai/dsh-experimental-tool-agent-team',
  '@deepseek-ai/dsh-experimental-client-ui-agent-team',
]

/**
 * 两个预置各自的期望值，外加要对照的官方 fixture 与豁免行。
 *
 * `skip` 里的行不参与逐字段比较：persona 是唯一允许改的；skill-filesystem
 * 在 lead-cordis 上少一个字段，理由见文件头。
 */
const PRESETS = [
  {
    loaderId: 'preset-lead-ptc',
    id: 'lead-ptc',
    name: 'Lead · PTC',
    order: 5,
    fixture: ptcFixturePath,
    skip: ['persona'],
  },
  {
    loaderId: 'preset-lead-cordis',
    id: 'lead-cordis',
    name: 'Lead · 创造',
    order: 6,
    fixture: createFixturePath,
    skip: ['persona', 'skill-filesystem'],
  },
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

function findLeadPresets(doc) {
  const entries = doc.flatMap((layer) => layer?.insert ?? [])
  const presets = entries.filter((entry) => entry.name === '@deepseek-ai/dsh-agent-preset')
  assert.equal(presets.length, PRESETS.length, `期望恰好 ${PRESETS.length} 行 @deepseek-ai/dsh-agent-preset`)
  const byId = new Map(presets.map((preset) => [preset.config?.id, preset]))
  for (const expected of PRESETS) {
    assert.ok(byId.has(expected.id), `缺少 config.id=${expected.id} 的预置行`)
  }
  return { byId, entries }
}

/** 读出官方 fixture 里那条 preset 行的 plugins。 */
async function loadFixturePlugins(path) {
  const doc = parseYamlLite(await readFile(path, 'utf8'))
  return doc[0].insert[0].config.plugins
}

test('两个 agent-preset 行都在，loader id / config id / name / order 各自对齐', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  for (const expected of PRESETS) {
    const preset = byId.get(expected.id)
    assert.equal(preset.id, expected.loaderId, `${expected.id} 的 loader id 要跟官方 preset-* 命名对齐`)
    assert.equal(preset.config.id, expected.id, 'config.id 是会话保存的预置标识')
    assert.equal(preset.config.name, expected.name)
    assert.equal(preset.config.order, expected.order)
  }
  const orders = PRESETS.map((preset) => byId.get(preset.id).config.order)
  assert.equal(new Set(orders).size, orders.length, '两个预置的 order 不能撞车')
  // 官方 standard=1 / ptc=2 / cordis=4，本插件排在它们后面
  assert.deepEqual(orders.slice().sort((a, b) => a - b), [5, 6], '预置顺序要排在官方三个之后')
})

test('patch 里有本插件自己的 host 半边行', async () => {
  // 关键结构：bundle patch 只挂 @deepseek-ai/dsh-agent-preset 的话，
  // lib/index.js 永远不会被加载，skill 和 /lead-mode 命令都是死代码。
  // 所以必须另有一行把包名本身挂上。
  const pkg = JSON.parse(await readFile(resolve(repoRoot, 'package.json'), 'utf8'))
  const { entries } = findLeadPresets(await loadPatch())
  const selfRows = entries.filter((entry) => entry.name === pkg.name)
  assert.equal(selfRows.length, 1, `期望 1 行 name=${pkg.name} 的 host 半边`)
  assert.equal(selfRows[0].id, pkg.name, 'host 半边行的 id 与包名一致')
})

test('两个预置里 persona 各恰好一次，不被 shadow', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  for (const expected of PRESETS) {
    const preset = byId.get(expected.id)
    const personas = preset.config.plugins.filter((row) => row.name === '@deepseek-ai/dsh-persona')
    assert.equal(personas.length, 1, `${expected.id} 顶层 persona 必须恰好 1 行`)
    // 摊平后也只该有 1 行，组里再塞一份同样会覆盖掉前缀
    const all = flatten(preset.config.plugins)
    assert.equal(
      all.filter((row) => row.name === '@deepseek-ai/dsh-persona').length,
      1,
      `${expected.id} 整棵树里 persona 必须恰好 1 行`,
    )
  }
})

test('persona prefix 只留短指针：判定 + 停手 + 派活规矩，不带完整安装命令', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  const prefixes = new Map()

  for (const expected of PRESETS) {
    const preset = byId.get(expected.id)
    const persona = preset.config.plugins.find((row) => row.name === '@deepseek-ai/dsh-persona')
    const prefix = persona.config?.prefix
    assert.equal(typeof prefix, 'string', `${expected.id} 的 persona.config.prefix 必须是字符串`)
    assert.ok(prefix.trim().length > 0, `${expected.id} 的 prefix 不能为空`)
    prefixes.set(expected.id, prefix)

    // 模型得知道六件事：先加载 lead-mode skill、缺工具时按 team_task_ 判断并停下、
    // 认得出 Agent Teams、让用户敲 /lead-mode、派活先 list_subagent_models 挑
    // provider/model，以及挑的正是这一对。
    assert.ok(prefix.includes('lead-mode'), 'prefix 要指向 lead-mode skill 或命令')
    assert.ok(prefix.includes('team_task_'), 'prefix 要给出缺工具的判据')
    assert.ok(prefix.includes('Agent Teams'), 'prefix 必须提到 Agent Teams')
    assert.ok(prefix.includes('/lead-mode'), 'prefix 要让用户去敲 /lead-mode')
    assert.ok(prefix.includes('list_subagent_models'), 'prefix 要指定派活时从可选清单选模型')
    assert.ok(prefix.includes('provider/model'), 'prefix 要写明挑的是 provider/model 这一对')

    // Lead 默认只决策和派活
    assert.ok(prefix.includes('只做决策'), 'prefix 要写明 Lead 只做决策')
    assert.ok(prefix.includes('不自己写代码'), 'prefix 要写明 Lead 不自己写代码')

    // 派完活不许等：Team 是消息驱动，wait_agent 只等自己收件箱，白耗 run_code 预算。
    assert.ok(prefix.includes('派完活'), 'prefix 要写明派完活就结束回合')
    assert.ok(
      prefix.includes('不 `wait_agent`'),
      'prefix 要直接禁掉 wait_agent，不能只写「尽量别等」',
    )
    assert.ok(prefix.includes('send_message'), 'prefix 要给出替代手段 send_message')

    // 反向断言：完整命令与版本说明不进每轮上下文（issue #1）。
    // 它们由 /lead-mode 输出与 lead-mode skill 承担。
    assert.ok(!prefix.includes('dsh plugin'), 'prefix 不该再带完整安装命令')
    assert.ok(!prefix.includes('0.1.5-alpha.2'), 'prefix 不该再带 dist-tag 说明')
    assert.ok(!prefix.includes('spawn_teammate'), 'prefix 不该再写两代工具的逐个参数')
    assert.ok(
      prefix.trim().length < 480,
      `prefix 是每轮都进上下文的常驻文本，必须短；${expected.id} 现在 ${prefix.trim().length} 字`,
    )
  }

  // 两个预置的 persona 必须逐字相同：Lead 的方法是同一套，只有能力面不同。
  assert.equal(
    prefixes.get('lead-ptc'),
    prefixes.get('lead-cordis'),
    'lead-ptc 与 lead-cordis 的 persona 必须完全一致',
  )
})

test('persona prefix 要求成员第一步建工作日志', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  for (const expected of PRESETS) {
    const persona = byId
      .get(expected.id)
      .config.plugins.find((row) => row.name === '@deepseek-ai/dsh-persona')
    const prefix = persona.config?.prefix
    assert.equal(typeof prefix, 'string', 'persona.config.prefix 必须是字符串')

    assert.ok(prefix.includes('worklog-'), 'prefix 必须给出工作日志的文件名约定 worklog-')
    assert.ok(prefix.includes('.scratch/'), 'prefix 必须给出工作日志的所在目录 .scratch/')
    assert.ok(
      /第一步|第一件事/.test(prefix),
      'prefix 必须写明建工作日志是成员第一步要做的事',
    )
  }
})

test('完整安装命令与版本号在 skill 里，没丢', async () => {
  const skill = await readFile(resolve(repoRoot, 'skills/lead-mode/SKILL.md'), 'utf8')
  assert.ok(skill.includes('dsh plugin --profile'), 'skill 要保留可粘贴的安装命令')
  assert.ok(skill.includes(TEAM_VERSION), `skill 的装包命令要带版本号 ${TEAM_VERSION}`)
  assert.ok(skill.includes('RETIRED_BUNDLES'), 'skill 要写明新宿主不要装这个包')
})

test('每个预置的行 id 集合与对应官方预置完全相同', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  for (const expected of PRESETS) {
    const presetPlugins = byId.get(expected.id).config.plugins
    const fixturePlugins = await loadFixturePlugins(expected.fixture)

    const leadIds = presetPlugins.map((row) => row.id)
    const fixtureIds = fixturePlugins.map((row) => row.id)

    assert.deepEqual(
      [...leadIds].sort(),
      [...fixtureIds].sort(),
      `${expected.id} 与官方预置的行 id 集合必须相同。lead 多出 ${leadIds.filter((id) => !fixtureIds.includes(id))}，官方多出 ${fixtureIds.filter((id) => !leadIds.includes(id))}`,
    )
    assert.equal(leadIds.length, fixtureIds.length, '行数必须相同')
    assert.equal(new Set(leadIds).size, leadIds.length, '行 id 不能重复')
  }
})

test('除 persona（以及 lead-cordis 的 skill-filesystem）外，行与 fixture 逐字段一致', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  for (const expected of PRESETS) {
    const presetPlugins = byId.get(expected.id).config.plugins
    const fixturePlugins = await loadFixturePlugins(expected.fixture)
    const leadById = new Map(presetPlugins.map((row) => [row.id, row]))

    for (const fixtureRow of fixturePlugins) {
      if (expected.skip.includes(fixtureRow.id)) continue
      const actual = leadById.get(fixtureRow.id)
      assert.ok(actual !== undefined, `${expected.id} 缺少行 ${fixtureRow.id}`)
      assert.deepEqual(actual, fixtureRow, `${expected.id} 的行 ${fixtureRow.id} 与官方预置不一致`)
    }
  }
})

test('lead-cordis 的 skill-filesystem 不带 customSkillDirs，并写明原因', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  const row = byId
    .get('lead-cordis')
    .config.plugins.find((candidate) => candidate.id === 'skill-filesystem')
  assert.ok(row !== undefined, 'lead-cordis 必须挂 skill-filesystem')
  assert.equal(row.name, '@deepseek-ai/dsh-skill-filesystem')
  assert.equal(row.config, undefined, '不能带 config：customSkillDirs 的 !!js 从本包解析不到宿主包')

  // 注释里要留原因，别让下一个人"顺手补回来"。
  const raw = await readFile(patchPath, 'utf8')
  const at = raw.indexOf('preset-lead-cordis')
  assert.ok(at > 0, 'patch 里要有 preset-lead-cordis')
  const tail = raw.slice(at)
  assert.ok(
    tail.includes('customSkillDirs'),
    'lead-cordis 附近要有一段注释解释为什么不带 customSkillDirs',
  )
  assert.ok(tail.includes('baseUrl'), '注释要点名 baseUrl 这个解析前提')
})

test('分组行保留 isolate realm，分组集合与官方预置一致', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  for (const expected of PRESETS) {
    const presetPlugins = byId.get(expected.id).config.plugins
    const groups = presetPlugins.filter((row) => row.group === true)
    assert.ok(groups.length > 0, `${expected.id} 对应官方预置有分组行，这里也该有`)
    for (const group of groups) {
      assert.equal(group.name, 'cordis:group', `${group.id} 必须是 cordis:group`)
      assert.equal(typeof group.isolate, 'object', `${group.id} 必须带 isolate`)
      assert.ok(Object.keys(group.isolate).length > 0, `${group.id} 的 isolate 不能为空`)
    }

    const fixturePlugins = await loadFixturePlugins(expected.fixture)
    assert.deepEqual(
      groups.map((row) => row.id).sort(),
      fixturePlugins
        .filter((row) => row.group === true)
        .map((row) => row.id)
        .sort(),
      `${expected.id} 的分组行必须与官方预置一致`,
    )
  }
})

test('两个预置都不含任何 Team 运行时行', async () => {
  const { byId } = findLeadPresets(await loadPatch())
  for (const expected of PRESETS) {
    const all = flatten(byId.get(expected.id).config.plugins)
    const offenders = all
      .map((row) => row.name)
      .filter((name) => TEAM_RUNTIME_PACKAGES.includes(name))
    assert.deepEqual(offenders, [], `${expected.id}: Team 运行时属宿主平面，不该出现在预置里`)
  }
})

test('patch 全文不含 Team 运行时行', async () => {
  const { entries } = findLeadPresets(await loadPatch())
  const offenders = entries
    .map((entry) => entry.name)
    .filter((name) => TEAM_RUNTIME_PACKAGES.includes(name))
  assert.deepEqual(offenders, [], 'cordis.patch.yml 不该插入 Team 运行时，双挂会冲突')
})
