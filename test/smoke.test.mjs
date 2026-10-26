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

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 官方 profile 包的版本，命令文本必须带。 */
const TEAM_VERSION = '0.2.1-rc.3'

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

  assert.equal(registered.skills.length, 1, '该注册 1 个 skill')
  const skill = registered.skills[0]
  assert.equal(skill.name, 'lead-mode')
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

test('skill 正文来自 SKILL.md，不是空字符串也不是 frontmatter', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: { skills: {}, commands: {}, agentTeams: {} },
  })

  plugin.apply(ctx)

  const skill = registered.skills[0]
  assert.equal(typeof skill.content, 'string', 'skill.content 必须是字符串')
  assert.ok(skill.content.length > 0, 'skill.content 不能为空')

  const { body, frontmatter } = await readSkillBody()
  assert.equal(skill.content, body, 'skill.content 必须与磁盘上的 SKILL.md 正文一致')
  assert.ok(!skill.content.includes('name: lead-mode'), 'skill.content 不该带 frontmatter')

  // description 也从同一份 frontmatter 来，防止两份硬编码漂移
  const onDiskDescription = /^description:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim()
  assert.equal(skill.description, onDiskDescription, 'skill.description 必须等于 frontmatter 里的 description')
})

test('skills 服务晚到后 skill 仍会注册', async () => {
  const plugin = await loadPlugin()
  const fake = makeCtx({ services: { commands: {}, agentTeams: {} } })

  plugin.apply(fake.ctx)
  assert.equal(fake.registered.skills.length, 0, '一开始没有 skills 服务，不该注册')

  const fired = fake.provide('skills', {})
  assert.equal(fired, 1, '补上 skills 服务后该跑掉一条 pending 注入')
  assert.equal(fake.registered.skills.length, 1, '服务晚到后 skill 必须补注册')
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

test('注册的 skill 名与 command 名都是 lead-mode', async () => {
  const plugin = await loadPlugin()
  const { ctx, registered } = makeCtx({
    services: { skills: {}, commands: {}, agentTeams: {} },
  })

  plugin.apply(ctx)
  assert.equal(registered.skills[0]?.name, 'lead-mode')
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

  assert.equal(registered.skills.length, 1)
  const skill = registered.skills[0]

  // Mirrors dsh-skill/lib/index.js validateDefinition:472-490.
  for (const field of ['name', 'description', 'source', 'content']) {
    assert.equal(
      typeof skill[field],
      'string',
      `skill.${field} 必须是 string，否则加载期 validateDefinition 抛错`,
    )
  }
  assert.notEqual(skill.source.length, 0, 'source 不能是空串')
  assert.notEqual(skill.content.length, 0, 'content 不能是空串')

  // provider 由 registry 用 `skill.provider ?? 'runtime'` 兜底，两种都能过。
  assert.ok(skill.provider === undefined || typeof skill.provider === 'string')
})
