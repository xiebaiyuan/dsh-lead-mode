/**
 * dsh-lead-mode host half.
 *
 * Three jobs: register the `lead-mode` runtime skill, register the `/lead-mode`
 * slash command, and warn at startup when the Team runtime is absent.
 *
 * The plugin declares no `inject` of its own. Each surface waits for its own
 * service through `ctx.inject()`, so a host missing `dsh-skill` still mounts the
 * row and still gets the command. That is why registration is not guarded by a
 * one-shot `ctx.get()`: a plain null check at apply time would lose the surface
 * for good if the service fiber activates later in the boot order.
 *
 * @module dsh-lead-mode
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Cordis plugin name. */
export const name = 'lead-mode'

/** Profile package that provides the Team runtime, pinned to the rc.3 line. */
const TEAM_PROFILE_PACKAGE = '@deepseek-ai/dsh-experimental-agent-team-profile@0.2.1-rc.3'

/** Install command shown in every reminder. */
const ENABLE_COMMAND = `dsh plugin --profile <你的 profile 名> add ${TEAM_PROFILE_PACKAGE}`

/** Why the version pin matters, repeated wherever the command appears. */
const VERSION_NOTE = '不带版本号会装到 0.1.5-alpha.2，和 0.2.1 宿主对不上。'

/** Absolute path of the bundled skill body. */
const SKILL_URL = new URL('../skills/lead-mode/SKILL.md', import.meta.url)

/** Skill name shared by the file on disk, the runtime registration, and the naming manifest. */
const SKILL_NAME = 'lead-mode'

/** Command name shared by the registration and the naming manifest. */
const COMMAND_NAME = 'lead-mode'

/** Preset id declared in `cordis.patch.yml`. */
const PRESET_ID = 'lead-mode'

/**
 * Read the bundled skill file and split off its YAML frontmatter.
 *
 * The runtime skill registry wants `description` as its own field, so the body
 * handed to it must not repeat the frontmatter block. Reading synchronously
 * keeps `apply` synchronous; the file is a few kilobytes shipped inside this
 * package, so there is no I/O worth deferring.
 *
 * @returns the frontmatter description and the markdown body.
 */
function readBundledSkill() {
  const path = fileURLToPath(SKILL_URL)
  const raw = readFileSync(path, 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (match === null) throw new Error(`${path} has no YAML frontmatter`)
  const description = /^description:\s*(.+)$/m.exec(match[1])
  if (description === null) throw new Error(`${path} frontmatter has no description`)
  const content = raw.slice(match[0].length).trim()
  if (content.length === 0) throw new Error(`${path} has an empty body`)
  return { description: description[1].trim(), content, path }
}

/**
 * Report whether the Team runtime is mounted.
 *
 * `agentTeams` is provided by `@deepseek-ai/dsh-experimental-agent-team`. Its
 * absence is the normal state for a host that never installed the official
 * profile package, so the check reads without throwing.
 *
 * @param ctx - a context that can resolve host services.
 * @returns the mount state and, when present, the configured member cap.
 */
function teamRuntimeState(ctx) {
  const agentTeams = ctx.get('agentTeams')
  if (agentTeams === undefined) return { mounted: false }
  return { mounted: true, maxMembers: agentTeams.config?.maxMembers }
}

/**
 * Report whether the `lead-mode` preset reached the preset registry.
 *
 * The preset row lives in `cordis.patch.yml`; reading the registry back turns a
 * broken row into a diagnostic instead of a silent no-op. An absent registry
 * reports as `unknown` rather than `missing`, because this plugin cannot tell
 * the two apart from here.
 *
 * @param ctx - a context that can resolve host services.
 * @returns `present`, `missing`, or `unknown`.
 */
async function presetState(ctx) {
  const registry = ctx.get('agentPresets')
  if (registry === undefined) return 'unknown'
  const presets = await registry.list()
  return presets.some((preset) => preset.id === PRESET_ID) ? 'present' : 'missing'
}

/**
 * Render the preset state as the sentence the command output uses.
 *
 * @param state - a value returned by `presetState`.
 * @returns one Chinese sentence.
 */
function describePreset(state) {
  if (state === 'present') return '已注册'
  if (state === 'missing') return '未注册（cordis.patch.yml 里的 lead-mode 预设行没有生效）'
  return '查不到（agentPresets 服务不在）'
}

/**
 * Build the `/lead-mode` report.
 *
 * @param ctx - a context that can resolve host services.
 * @returns a command result reporting dependency state and the install command.
 */
async function report(ctx) {
  const team = teamRuntimeState(ctx)
  const preset = await presetState(ctx)
  const lines = []

  if (team.mounted) {
    const cap = team.maxMembers === undefined ? '' : `（maxMembers ${team.maxMembers}）`
    lines.push(`Team 运行时：已挂载${cap}`)
  } else {
    lines.push('Team 运行时：未挂载')
  }
  lines.push(`lead-mode 预设：${describePreset(preset)}`)

  if (team.mounted && preset === 'present') {
    lines.push('')
    lines.push('依赖齐了。切到 Lead 模式这个预设就能派活。')
    return { kind: 'success', text: lines.join('\n') }
  }

  lines.push('')
  if (!team.mounted) {
    lines.push('缺 Team 运行时。装官方 profile 包：')
    lines.push('')
    lines.push(`    ${ENABLE_COMMAND}`)
    lines.push('')
    lines.push(`${VERSION_NOTE}装完重启 dsh。`)
  }
  if (preset === 'missing') {
    lines.push('lead-mode 预设行没生效。检查 dsh 是否把这个包加进了 profile 的 bundle 列表。')
  }
  return { kind: 'error', text: lines.join('\n') }
}

/**
 * Register the skill, the command, and the startup check.
 *
 * @param ctx - the plugin context.
 */
export function apply(ctx) {
  const warn = (message) => ctx.logger.warn(message)

  ctx.inject(['skills'], (skillsCtx) => {
    let skill
    try {
      skill = readBundledSkill()
    } catch (error) {
      warn(`[lead-mode] 读不到 skills/lead-mode/SKILL.md，lead-mode skill 没注册：${String(error)}`)
      return
    }
    skillsCtx.skills.register({
      name: SKILL_NAME,
      description: skill.description,
      content: skill.content,
      // `source` is required by the registry's load-time validation but is NOT
      // defaulted by `register()`: `validateRuntimeSkill` (register) checks only
      // name, description and invocation, while `validateDefinition` (load)
      // throws unless `source` is a string. Omitting it registers fine and then
      // fails every `skill` tool call with `source must be a string`.
      source: 'dsh-lead-mode/skills/lead-mode/SKILL.md',
      path: skill.path,
      invocation: { modelInvocable: true, userInvocable: true },
    })
  })

  ctx.inject(['commands'], (commandsCtx) => {
    commandsCtx.commands.register({
      name: COMMAND_NAME,
      description: '检查 Lead 模式依赖是否就绪',
      handler: () => report(commandsCtx),
    })
  })

  if (ctx.get('skills') === undefined) {
    warn('[lead-mode] skills 服务不在，lead-mode skill 暂时没注册。它会等 dsh-skill 挂载后再注册；一直不出现就检查 dsh-skill 是否装好。')
  }
  if (ctx.get('commands') === undefined) {
    warn('[lead-mode] commands 服务不在，/lead-mode 命令暂时没注册。它会等 dsh-commands 挂载后再注册。')
  }
  if (ctx.get('agentTeams') === undefined) {
    warn(`[lead-mode] 没检测到 Team 运行时（agentTeams 服务）。Lead 模式能切，但派不了活。装官方 profile 包：${ENABLE_COMMAND}。${VERSION_NOTE}`)
  }
}
