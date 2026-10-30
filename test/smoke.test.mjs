// lib/index.js 的行为断言。
//
// 这些断言守的是「提醒用户开官方 Team 模式」的通道 B：用户敲 /lead-mode
// 能看见当前依赖状态和带版本号的安装命令；启动时缺 Team 运行商会 warn。
//
// 全部用假 ctx，不启动宿主，不碰 ~/.dsh/profiles。
//
// 假 ctx 必须照抄 cordis 的两条语义，否则测的是假东西：
//   1. `ctx.inject(names, callback)` 等价于 `ctx.plugin({ inject: names, apply: callback })`，
//      依赖服务全部就绪时才调用 callback（见 cordis lib/index.js 的
//      RegistryService.inject）。
//   2. `ctx.get(name)` 无依赖地读服务，服务不在返回 undefined。

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 官方 profile 包的版本，命令文本必须带。 */
const TEAM_VERSION = '0.2.1-rc.5'

/**
 * 造一个假 ctx。
 *
 * `services` 里的键就是 `ctx.get(name)` 能拿到的服务。
 * `ctx.inject(names, cb)` 在 names 全部存在时同步调用 cb，否则记为 pending，
 * 之后可用 `provide()` 补上服务再 `flushPending()`，模拟服务晚到。
 */
function makeCtx({ services = {} } = {}) {
  const warnings = []
  const disposers = []
  const pending = []
  const registered = { skills: [], commands: [] }
  const state = { services: { ...services } }

  const logger = {
    warn: (message) => warnings.push(message),
    info: () => {},
    debug: () => {},
  }

  function attach() {
    if (state.services.skills !== undefined) {
      ctx.skills = {
        register: (definition) => {
          registered.skills.push(definition)
          return Promise.resolve()
        },
      }
    } else {
      delete ctx.skills
    }
    if (state.services.commands !== undefined) {
      ctx.commands = {
        register: (definition) => {
          registered.commands.push(definition)
          return undefined
        },
      }
    } else {
      delete ctx.commands
    }
  }

  const ctx = {
    logger,
    get(name) {
      return state.services[name]
    },
    inject(names, callback) {
      const ready = names.every((name) => state.services[name] !== undefined)
      if (ready) {
        callback(ctx)
      } else {
        pending.push({ names, callback })
      }
      // 真 fiber 有 then，这里给个已完成的 thenable 免得调用方 await 卡住
      return Promise.resolve()
    },
    effect(callback) {
      const disposer = callback()
      if (typeof disposer === 'function') disposers.push(disposer)
      return disposer
    },
  }

  attach()

  return {
    ctx,
    warnings,
    registered,
    disposers,
    pending,
    /** 补一个服务，返回是否真的让某条 pending 注入变就绪。 */
    provide(name, value) {
      state.services[name] = value
      attach()
      return this.flushPending()
    },
    /** 把已就绪的 pending 注入跑掉。 */
    flushPending() {
      let fired = 0
      for (let i = pending.length - 1; i >= 0; i--) {
        const item = pending[i]
        if (item.names.every((name) => state.services[name] !== undefined)) {
          pending.splice(i, 1)
          item.callback(ctx)
          fired++
        }
      }
      return fired
    },
  }
}

async function loadPlugin() {
  return import(resolve(repoRoot, 'lib/index.js'))
}

/** 读磁盘上的 SKILL.md，去掉 frontmatter 得到正文。 */
async function readSkillBody() {
  const raw = await readFile(resolve(repoRoot, 'skills/lead-mode/SKILL.md'), 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  assert.ok(match !== null, 'SKILL.md 必须有 frontmatter')
  return { raw, frontmatter: match[1], body: raw.slice(match[0].length).trim() }
}

/**
 * 磁盘上按契约真正能注册的 skill 名（= 目录名），排好序。
 *
 * 这里是契约的第二份独立实现，刻意不 import lib/：lib 按契约筛，测试也按契约
 * 筛，两边对不上就说明某一侧走样了。
 *
 * 也不用写死 ['lead-mode', 'team-digest']：`skills/` 由别的成员并发写，写一半
 * 的目录不该把断言变成噪声——只有写到能注册的形态才算数。
 */
function diskSkillNames() {
  const root = resolve(repoRoot, 'skills')
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((dirName) => {
      let raw
      try {
        raw = readFileSync(join(root, dirName, 'SKILL.md'), 'utf8')
      } catch {
        return false
      }
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
      if (match === null) return false
      const declared = /^name:\s*(.+)$/m.exec(match[1])?.[1]?.trim()
      const description = /^description:\s*(.+)$/m.exec(match[1])?.[1]?.trim()
      return (
        declared === dirName &&
        description !== undefined &&
        raw.slice(match[0].length).trim().length > 0
      )
    })
    .sort()
}

test('导出 name / apply，且不声明硬 inject', async () => {
  const plugin = await loadPlugin()
  assert.equal(plugin.name, 'lead-mode')
  assert.equal(typeof plugin.apply, 'function')
  // 硬 inject 会让缺服务时整行不激活；本插件改成按面软等，inject 不该声明
  assert.equal(
    plugin.inject,
    undefined,
    'inject 不该硬声明，注册要走 ctx.inject() 逐面等待',
  )
})

test('缺全部服务时不抛异常，且 warn 点名三个服务', async () => {
  const plugin = await loadPlugin()
  const { ctx, warnings, registered } = makeCtx()

  assert.doesNotThrow(() => plugin.apply(ctx))

  assert.equal(registered.skills.length, 0, 'skills 服务不在时不该注册 skill')
  assert.equal(registered.commands.length, 0, 'commands 服务不在时不该注册 command')
  assert.ok(warnings.length > 0, '缺服务必须 warn，不能静默')

  const joined = warnings.join('\n')
  assert.ok(joined.includes('skills'), 'warn 里要点名 skills 服务')
  assert.ok(joined.includes('commands'), 'warn 里要点名 commands 服务')
  assert.ok(joined.includes('agentTeams'), 'warn 里要点名 agentTeams 服务')
})

test('缺 agentTeams 时 warn 一次，文本是中文且带安装命令与版本号', async () => {
  const plugin = await loadPlugin()
  const { ctx, warnings } = makeCtx({
    services: {
      skills: {},
      commands: {},
      agentPresets: { list: async () => [{ id: 'lead-mode' }] },
    },
  })

  plugin.apply(ctx)

  const teamWarnings = warnings.filter(
    (message) => message.includes('agentTeams') || message.includes('Team 运行时'),
  )
  assert.equal(teamWarnings.length, 1, '缺 agentTeams 只该 warn 一次')
  const text = teamWarnings[0]

  // 中文：至少 8 个汉字。只数「有没有一个汉字」太松，一句英文里塞个「的」也能过。
  const hanCount = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
  assert.ok(hanCount >= 8, `warn 文本必须是中文，实测汉字 ${hanCount} 个`)
  assert.ok(text.includes('dsh plugin'), 'warn 里要给出 dsh plugin 安装命令')
  assert.ok(text.includes(TEAM_VERSION), `安装命令必须带版本号 ${TEAM_VERSION}`)
})

test('服务齐全时注册 skill 与 command，且不再 warn agentTeams', async () => {
  const plugin = await loadPlugin()
  const { ctx, warnings, registered } = makeCtx({
    services: {
      skills: {},
      commands: {},
      agentTeams: { config: { maxMembers: 8 } },
      agentPresets: { list: async () => [{ id: 'lead-mode' }] },
    },
  })

  plugin.apply(ctx)

  assert.deepEqual(
    registered.skills.map((skill) => skill.name).sort(),
    diskSkillNames(),
    '磁盘上每个合规 skill 目录都该注册一个 skill，一个不多一个不少',
  )
  const skill = registered.skills.find((candidate) => candidate.name === 'lead-mode')
  assert.ok(skill !== undefined, 'lead-mode 必须注册')
  assert.equal(typeof skill.description, 'string')
  assert.ok(skill.description.length > 0, 'skill description 不能为空')
  assert.equal(skill.invocation?.modelInvocable, true)
  assert.equal(skill.invocation?.userInvocable, true)

  assert.equal(registered.commands.length, 1, '该注册 1 个 command')
  assert.equal(registered.commands[0].name, 'lead-mode')
  assert.equal(registered.commands[0].description, '检查 Lead 模式依赖是否就绪')

  const teamWarnings = warnings.filter(
    (message) => message.includes('agentTeams') || message.includes('Team 运行时'),
  )
  assert.equal(teamWarnings.length, 0, '服务齐全时不该 warn agentTeams')
})

// ---------------------------------------------------------------------------
// 多 skill 扫描：用临时目录造 skills/，不碰仓库里由别的成员写的真实内容。
// ---------------------------------------------------------------------------

/** 在临时目录里造一个 skill 子目录。 */
function makeSkillDir(root, dirName, text) {
  mkdirSync(join(root, dirName), { recursive: true })
  if (text !== undefined) writeFileSync(join(root, dirName, 'SKILL.md'), text)
}

test('扫描 skills/ 时每个合规目录注册一个，坏目录只 warn 不炸', async () => {
  const plugin = await loadPlugin()
  assert.equal(typeof plugin.syncBundledSkills, 'function', 'lib 要导出扫描函数，测试才能喂假目录')
  const root = mkdtempSync(join(tmpdir(), 'dsh-lead-mode-skills-'))
  try {
    const good = {
      'alpha-skill': '---\nname: alpha-skill\ndescription: 第一个假 skill。\n---\n\n# alpha\n\n正文一。\n',
      'beta-skill': '---\nname: beta-skill\ndescription: 第二个假 skill。\n---\n\n# beta\n\n正文二。\n',
    }
    const bad = {
      'no-frontmatter': '# 没有 frontmatter\n\n正文。\n',
      'no-description': '---\nname: no-description\n---\n\n# x\n\n正文。\n',
      'empty-body': '---\nname: empty-body\ndescription: 空正文。\n---\n',
      'renamed-dir': '---\nname: something-else\ndescription: 目录名与 name 不一致。\n---\n\n# x\n\n正文。\n',
    }
    for (const [dirName, text] of Object.entries(good)) makeSkillDir(root, dirName, text)
    for (const [dirName, text] of Object.entries(bad)) makeSkillDir(root, dirName, text)
    // 目录在、SKILL.md 不在
    makeSkillDir(root, 'no-file')

    const registered = []
    const warnings = []
    const names = plugin.syncBundledSkills(
      root,
      { register: (definition) => registered.push(definition) },
      (message) => warnings.push(message),
    )

    assert.deepEqual(names, ['alpha-skill', 'beta-skill'], '两个合规 skill 都要注册，按目录名排序')
    assert.equal(registered.length, 2, '坏目录不该混进注册列表')

    for (const skill of registered) {
      assert.equal(typeof skill.description, 'string')
      assert.ok(skill.description.length > 0, `${skill.name} 的 description 不能为空`)
      assert.ok(skill.content.startsWith('# '), `${skill.name} 的 content 不该带 frontmatter`)
      assert.equal(skill.source, `dsh-lead-mode/skills/${skill.name}/SKILL.md`)
      assert.equal(skill.path, join(root, skill.name, 'SKILL.md'))
      assert.equal(skill.invocation?.modelInvocable, true)
      assert.equal(skill.invocation?.userInvocable, true)
    }

    assert.equal(
      warnings.length,
      5,
      `5 个坏目录各该 warn 一次，实测 ${warnings.length} 条：\n${warnings.join('\n')}`,
    )
    for (const dirName of [...Object.keys(bad), 'no-file']) {
      assert.ok(
        warnings.some((message) => message.includes(dirName)),
        `${dirName} 被跳过时 warn 要点名它`,
      )
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('skills/ 目录不存在时只 warn，不抛异常', async () => {
  const plugin = await loadPlugin()
  const warnings = []
  const registered = []
  const names = plugin.syncBundledSkills(
    join(tmpdir(), 'dsh-lead-mode-no-such-skills-dir'),
    { register: (definition) => registered.push(definition) },
    (message) => warnings.push(message),
  )

  assert.deepEqual(names, [])
  assert.equal(registered.length, 0)
  assert.equal(warnings.length, 1, '目录不在只该 warn 一次')
  assert.ok(warnings[0].includes('扫描'), 'warn 要说清是扫描失败')
})

test('单个 skill 注册抛错时其余照常注册', async () => {
  const plugin = await loadPlugin()
  const root = mkdtempSync(join(tmpdir(), 'dsh-lead-mode-throw-'))
  try {
    makeSkillDir(root, 'alpha-skill', '---\nname: alpha-skill\ndescription: 会抛错的那个。\n---\n\n# a\n\n正文。\n')
    makeSkillDir(root, 'beta-skill', '---\nname: beta-skill\ndescription: 正常的那个。\n---\n\n# b\n\n正文。\n')

    const warnings = []
    const registered = []
    const names = plugin.syncBundledSkills(
      root,
      {
        register: (definition) => {
          if (definition.name === 'alpha-skill') throw new Error('registry 拒收')
          registered.push(definition)
        },
      },
      (message) => warnings.push(message),
    )

    assert.deepEqual(names, ['beta-skill'], '抛错的那个跳过，后面的继续')
    assert.deepEqual(registered.map((skill) => skill.name), ['beta-skill'])
    assert.equal(warnings.length, 1)
    assert.ok(warnings[0].includes('alpha-skill'), 'warn 要点名注册失败的那个 skill')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('skill 正文来自 SKILL.md，不是空字符串也不是 frontmatter', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: { skills: {}, commands: {}, agentTeams: {} },
  })

  plugin.apply(ctx)

  const skill = registered.skills.find((candidate) => candidate.name === 'lead-mode')
  assert.ok(skill !== undefined, 'lead-mode 必须注册')
  assert.equal(typeof skill.content, 'string', 'skill.content 必须是字符串')
  assert.ok(skill.content.length > 0, 'skill.content 不能为空')

  const { body, frontmatter } = await readSkillBody()
  assert.equal(skill.content, body, 'skill.content 必须与磁盘上的 SKILL.md 正文一致')
  assert.ok(!skill.content.includes('name: lead-mode'), 'skill.content 不该带 frontmatter')

  // description 也从同一份 frontmatter 来，防止两份硬编码漂移
  const onDiskDescription = /^description:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim()
  assert.equal(skill.description, onDiskDescription, 'skill.description 必须等于 frontmatter 里的 description')
})

// ---------------------------------------------------------------------------
// 守住三条只有读源码才能确认的 team 行为。删掉对应文案就会红。
//
// 1. teammate 收工会自然结算并唤醒 Lead，通知里带它的收尾消息。
//    manager.ts 的 announce() 对 kind==='local' 调 watchLocalSettlement，
//    后者在 whenIdle 且收件箱为空时走 finishDisposal → notifySettlement →
//    sendWaking(parent, ..., 'queue') → followup（唤醒）。
//    continuation-messages.ts 的 createSettlementMessage 把子代理最后的正文
//    拼成「Its closing message:」带回。
//
// 2. task 变更不唤醒空闲的 Lead。agent-team/src/index.ts 里唯一的唤醒动作是
//    成员 send_message 时的 root.steer()；task 变更只走 activity.notify，它只
//    resolve 正在 wait_agent 的调用方。
//
// 3. 所以「结束回合等通知」是默认做法，wait_agent 套循环和 list_agents 轮询
//    都是空转。
// ---------------------------------------------------------------------------
test('skill 正文写明唤醒规则与不要轮询', async () => {
  const { body } = await readSkillBody()

  assert.ok(
    body.includes('唤醒'),
    'skill 必须说明什么事件会唤醒 Lead',
  )
  assert.ok(
    body.includes('Its closing message'),
    'skill 必须写出结算通知带回子代理收尾正文的实际格式（Its closing message:）',
  )
  assert.ok(
    /收工时，它\*\*最后那条消息\*\*会随通知回到你手上/.test(body),
    'skill 必须写明 teammate 收尾那条消息随通知回到 Lead 手上',
  )
  assert.ok(
    /task 被 claim 或 complete \| \*\*不会\*\*/.test(body),
    'skill 必须写明 task 变更不会唤醒空闲的 Lead',
  )
  for (const word of ['轮询', 'list_agents', 'wait_agent']) {
    assert.ok(body.includes(word), `skill 必须覆盖「不要用 ${word} 等」这条`)
  }
})

test('skill 正文写明 teammate 不能单独指定模型', async () => {
  const { body } = await readSkillBody()

  assert.ok(
    /不能单独指定|不能指定/.test(body),
    'skill 必须写明 spawn_teammate 无法单独指定模型',
  )
  assert.ok(
    body.includes('继承'),
    'skill 必须写明 teammate 继承 Lead 的模型',
  )
  assert.ok(
    body.includes('subagent'),
    'skill 必须给出想按任务挑模型时的替代路径（经典 subagent）',
  )
})

// 看整队状态与通信的入口指向 dsh-context 的编队页。删掉友链就会红。
const DSH_CONTEXT_REPO = 'https://github.com/bowenliang123/dsh-context'

test('skill 正文给出编队页入口（dsh-context 友链）', async () => {
  const { body } = await readSkillBody()

  assert.ok(body.includes('dsh-context'), 'skill 必须点名 dsh-context 插件')
  assert.ok(
    body.includes(DSH_CONTEXT_REPO),
    'skill 必须给出 dsh-context 的仓库地址，写清那是另一个项目',
  )
  assert.ok(body.includes('Apache-2.0'), 'skill 必须标出 dsh-context 的许可')
  assert.ok(
    /不随本插件安装/.test(body),
    'skill 必须写明 dsh-context 不随本插件安装、也不是依赖',
  )
  assert.ok(
    /编队|Fleet/.test(body),
    'skill 必须写出编队 / Fleet 这个标签页名',
  )
  for (const surface of ['Fleet Members', 'Tasks', 'Agent Comms']) {
    assert.ok(body.includes(surface), `skill 必须列出编队页的 ${surface} 区块`)
  }
})

test('两份 README 都有 dsh-context 友链节', async () => {
  const zh = await readFile(resolve(repoRoot, 'README.zh-CN.md'), 'utf8')
  const en = await readFile(resolve(repoRoot, 'README.md'), 'utf8')

  for (const [label, text, heading] of [
    ['README.zh-CN.md', zh, '## 友链：dsh-context'],
    ['README.md', en, '## Friendly link: dsh-context'],
  ]) {
    assert.ok(text.includes(heading), `${label} 必须有「${heading}」这一节`)
    assert.ok(text.includes(DSH_CONTEXT_REPO), `${label} 必须给出仓库地址`)
    assert.ok(text.includes('Apache-2.0'), `${label} 必须标出许可`)
    assert.ok(
      /dsh plugin --profile/.test(text),
      `${label} 必须给出 dsh-context 的安装命令`,
    )
    for (const surface of ['Fleet Members', 'Tasks', 'Agent Comms']) {
      assert.ok(text.includes(surface), `${label} 必须列出编队页的 ${surface} 区块`)
    }
  }
})

test('skills 服务晚到后 skill 仍会注册', async () => {
  const plugin = await loadPlugin()
  const fake = makeCtx({ services: { commands: {}, agentTeams: {} } })

  plugin.apply(fake.ctx)
  assert.equal(fake.registered.skills.length, 0, '一开始没有 skills 服务，不该注册')

  const fired = fake.provide('skills', {})
  assert.equal(fired, 1, '补上 skills 服务后该跑掉一条 pending 注入')
  assert.deepEqual(
    fake.registered.skills.map((skill) => skill.name).sort(),
    diskSkillNames(),
    '服务晚到后每个合规 skill 都必须补注册',
  )
})

test('/lead-mode 依赖齐全时返回 success', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: {
      skills: {},
      commands: {},
      agentTeams: { config: { maxMembers: 8 } },
      agentPresets: { list: async () => [{ id: 'lead-mode' }] },
    },
  })

  plugin.apply(ctx)
  const result = await registered.commands[0].handler(ctx)

  assert.equal(result.kind, 'success')
  assert.ok(result.text.includes('Team 运行时'), '文本要报告 Team 运行时状态')
  assert.ok(result.text.includes('已注册'), '文本要报告预设已注册')
  assert.ok(result.text.includes('maxMembers 8'), '有 maxMembers 时要报出来')
})

test('/lead-mode 缺 Team 运行时返回 error，文本含 agentTeams 与 dsh plugin 与版本号', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: {
      skills: {},
      commands: {},
      agentPresets: { list: async () => [{ id: 'lead-mode' }] },
    },
  })

  plugin.apply(ctx)
  const result = await registered.commands[0].handler(ctx)

  assert.equal(result.kind, 'error')
  assert.ok(result.text.includes('Team 运行时'), '文本要说明 Team 运行时缺失')
  assert.ok(result.text.includes('dsh plugin'), '文本要给出安装命令')
  assert.ok(result.text.includes(TEAM_VERSION), `安装命令必须带版本号 ${TEAM_VERSION}`)
  const hanCount = (result.text.match(/[\u4e00-\u9fff]/g) ?? []).length
  assert.ok(hanCount >= 8, `命令输出必须是中文，实测汉字 ${hanCount} 个`)
})

test('/lead-mode 预设未注册时返回 error 并说明', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: {
      skills: {},
      commands: {},
      agentTeams: {},
      agentPresets: { list: async () => [] },
    },
  })

  plugin.apply(ctx)
  const result = await registered.commands[0].handler(ctx)

  assert.equal(result.kind, 'error')
  assert.ok(result.text.includes('未注册'), '文本要说明预设未注册')
})

test('agentPresets 服务不在时 handler 不抛异常', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: { skills: {}, commands: {}, agentTeams: {} },
  })

  plugin.apply(ctx)
  const result = await registered.commands[0].handler(ctx)
  assert.ok(result.text.includes('查不到'), 'agentPresets 不在时报告查不到')
})

test('注册的 command 名是 lead-mode，skills 里也带 lead-mode', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: { skills: {}, commands: {}, agentTeams: {} },
  })

  plugin.apply(ctx)
  assert.ok(
    registered.skills.some((skill) => skill.name === 'lead-mode'),
    'lead-mode 这个 skill 必须在注册列表里',
  )
  assert.equal(registered.commands[0]?.name, 'lead-mode')
})

// ---------------------------------------------------------------------------
// Regression: the host validates runtime skills twice, with different rules.
//
// `dsh-skill`'s `validateRuntimeSkill` (register) checks only name,
// description, and invocation. Its `validateDefinition` (load) additionally
// requires `source`, `provider`, and `content` to be strings. `register()`
// defaults `provider` but NOT `source`, so a registration that omits `source`
// succeeds and then fails every `skill` tool call with
// `source must be a string`.
//
// The stub registries above never run host validation, so they cannot catch
// that. This mirrors the load-time contract instead.
// ---------------------------------------------------------------------------
test('register() 收到的 skill 满足宿主加载期必填契约', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: {
      skills: { register: () => undefined },
      commands: { register: () => undefined },
    },
  })
  plugin.apply(ctx)

  assert.deepEqual(
    registered.skills.map((skill) => skill.name).sort(),
    diskSkillNames(),
    '每个注册的 skill 都来自磁盘上的合规目录',
  )

  // Mirrors dsh-skill/lib/index.js validateDefinition:472-490.
  for (const skill of registered.skills) {
    for (const field of ['name', 'description', 'source', 'content']) {
      assert.equal(
        typeof skill[field],
        'string',
        `skill.${field} 必须是 string，否则加载期 validateDefinition 抛错`,
      )
    }
    assert.notEqual(skill.source.length, 0, 'source 不能是空串')
    assert.notEqual(skill.content.length, 0, 'content 不能是空串')
    assert.equal(
      skill.source,
      `dsh-lead-mode/skills/${skill.name}/SKILL.md`,
      'source 必须按包内相对路径写，且与 skill 名一致',
    )

    // provider 由 registry 用 `skill.provider ?? 'runtime'` 兜底，两种都能过。
    assert.ok(skill.provider === undefined || typeof skill.provider === 'string')
  }
})

// ---------------------------------------------------------------------------
// 上下文变长那节是 Lead 的操作手册。它写错或写丢，Lead 会在成员会话已经被
// 压缩、细节只剩摘要的情况下继续往里派活，然后拿一份掺了断层的结论当验收。
// 这里只断言磁盘上的正文，不碰 lib/。
// ---------------------------------------------------------------------------

/** 从正文切出一节：从 heading 开始，到下一个同级或更高级标题前结束。 */
function sliceHeading(body, heading) {
  const start = body.indexOf(heading)
  assert.notEqual(start, -1, `SKILL.md 必须有「${heading}」这一节`)
  const level = /^#+/.exec(heading)[0].length
  const rest = body.slice(start + heading.length)
  const next = new RegExp(`\\n#{1,${level}} `).exec(rest)
  assert.notEqual(next, null, `「${heading}」后面必须有下一节，否则切片会吃掉全文`)
  return rest.slice(0, next.index)
}

test('skill 正文给出检测成员会话被压缩的三步配方', async () => {
  const { body } = await readSkillBody()
  const section = sliceHeading(body, '### 怎么检测')

  for (const token of [
    'list_agents',
    'session_event_search',
    'session_id',
    'compaction/start',
    'surfaces',
  ]) {
    assert.ok(section.includes(token), `检测配方必须出现 ${token}`)
  }

  const steps = [...section.matchAll(/^\d+\. /gm)].length
  assert.ok(steps >= 3, `检测配方该写成有序步骤，实测 ${steps} 条`)
  assert.ok(
    /不要.{0,20}轮询|别.{0,20}轮询/.test(section),
    '检测配方必须写明不要反复轮询，一次派活验收前查一次就够',
  )
})

test('skill 正文的交接阶梯是四级有序表，覆盖三个处置工具', async () => {
  const { body } = await readSkillBody()
  const section = sliceHeading(body, '### 交接阶梯')

  const levels = [...section.matchAll(/^\d+\. /gm)].length
  assert.ok(levels >= 4, `交接阶梯按代价排四级，实测 ${levels} 条`)

  for (const tool of ['send_message', 'interrupt_agent', 'spawn_teammate']) {
    assert.ok(section.includes(tool), `四级阶梯里必须出现 ${tool}`)
  }
  assert.ok(section.includes('继续跑'), '第 1 级该是继续跑，交给自动压缩兜住')
  assert.ok(section.includes('重发窄单'), '第 2 级该是给同一成员重发窄单')
})

test('skill 正文写明 worklog 与 handoff 的位置与文件名约定', async () => {
  const { body } = await readSkillBody()
  const section = sliceHeading(body, '### 工作日志与交接文档放哪')

  for (const token of ['.scratch/', 'worklog-', 'handoff-']) {
    assert.ok(section.includes(token), `命名约定必须出现 ${token}`)
  }
  assert.ok(
    section.includes('obsidian-docs/scratch/'),
    '.scratch 要说明它是指向笔记库的软链',
  )
  assert.ok(/不进 git/.test(section), '要写明 .scratch 不进 git')
})

test('skill 正文要求换人用 fresh，并写明 fork 拿不到前任历史', async () => {
  const { body } = await readSkillBody()
  const section = sliceHeading(body, '### 交接阶梯')

  const lines = section.split('\n')
  const start = lines.findIndex((line) => /^4\. /.test(line))
  assert.notEqual(start, -1, '交接阶梯第 4 级必须是换新成员')

  // 一条列表项可能续行，续到空行或下一个编号为止。
  let item = lines[start]
  for (
    let i = start + 1;
    i < lines.length && lines[i].trim() !== '' && !/^\d+\. /.test(lines[i]);
    i++
  ) {
    item += ` ${lines[i]}`
  }

  assert.ok(item.includes('fresh'), '第 4 级必须写清 context 用 fresh')
  assert.ok(item.includes('fork'), '第 4 级必须点名 fork 为什么不行')
  assert.ok(/历史/.test(item), '第 4 级必须写出理由：fork 拷的是 Lead 自己的历史')
})

test('skill 正文不写死自动压缩的阈值数字', async () => {
  const { body } = await readSkillBody()

  for (const number of ['0.8', '65536', '0.16']) {
    assert.ok(
      !body.includes(number),
      `SKILL.md 正文不该出现阈值数字 ${number}，各宿主阈值不同，写死会过期`,
    )
  }
})
