# dsh-lead-mode

Lead mode for DSH. Adds one `lead-mode` preset, one `lead-mode` skill, and one `/lead-mode` command.

It does three things, none of which touch dsh itself:

1. Preset: switch to it and the model works as a Lead — decomposing, delegating, accepting.
2. Skill: the Lead working method, loadable by the model or by you.
3. Reminder: when the session has no Team tools, the model's first move is to tell you to enable the official Agent Teams instead of doing everything alone.

## Enable the Team runtime first

Lead mode delegates through `spawn_teammate`, `send_message`, and `team_task_*`. Those come from the official dsh Team runtime, which this plugin does not ship.

```bash
dsh plugin --profile <your profile name> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.1-rc.3
```

**The version pin is required.** Without it npm resolves `latest`, which is 0.1.5-alpha.2 — built for 0.1.x hosts and it will not mount on a 0.2.1 host. `next` points at 0.2.1-rc.3, which is the correct one. Restart dsh afterwards.

Not sure whether it is installed? Run `/lead-mode` in dsh; it reports dependency state.

## Install this plugin

Two routes, pick one.

From npm:

```bash
dsh plugin --profile <your profile name> add dsh-lead-mode
```

From GitHub (use this before the npm release):

```bash
dsh plugin --profile <your profile name> add https://github.com/xiebaiyuan/dsh-lead-mode
```

Restart dsh afterwards, then pick "Lead 模式" in the preset list.

## Usage

Three steps.

**1. Switch to Lead mode.** Pick "Lead 模式" in a new session's preset list. The model's first system-prompt section becomes the Lead persona, and the reminder at its top goes in with it.

**2. Run `/lead-mode` to check dependencies.** This command delegates nothing; it only reports state:

- Whether the Team runtime is mounted, and its `maxMembers` when it is
- Whether the `lead-mode` preset registered
- The version-pinned install command when something is missing

Returns success when everything is in place, error when something is missing.

**3. Let the model work.** With the delegation tools in place, the model decomposes, delegates to teammates, and waits for all of them before wrapping up. Without them, its first move is to tell you to enable the Team runtime — it will not do everything alone, and it will not substitute `subagent` for a teammate.

## Required official bundles and versions

This plugin ships none of the packages below. The host or an official bundle provides them; this plugin only declares version requirements in `peerDependencies`.

| Package | Requirement | Provided by | When missing |
|---|---|---|---|
| `@deepseek-ai/dsh-experimental-agent-team-profile` | `0.2.1-rc.3` | You install it explicitly | Cannot delegate; `/lead-mode` returns error; startup warn |
| `@deepseek-ai/dsh` | `>=0.2.1-rc.2` | Host | Will not install |
| `@deepseek-ai/cordis` | `^4.0.5` | Host | Will not install |
| `@deepseek-ai/schemastery` | `^3.18.5` | Host | Will not install |
| `@deepseek-ai/dsh-agent-preset-registry` | `>=0.2.1-rc.2` | Host | Preset row does not take effect; `/lead-mode` reports unknown |
| `@deepseek-ai/dsh-skill` | `>=0.2.1-rc.2` | Host | Skill not registered; startup warn |
| `@deepseek-ai/dsh-commands` | `>=0.2.1-rc.2` | Host | `/lead-mode` not registered; startup warn |

The target host version is `dshTarget` in `package.json`: `0.2.1-rc.3`.

## Why the install command pins a version

`@deepseek-ai/dsh-experimental-agent-team-profile` has three dist-tags on npm:

| dist-tag | Version | Host it fits |
|---|---|---|
| `latest` | 0.1.5-alpha.2 | 0.1.x |
| `alpha` | 0.2.1-alpha.5 | the 0.2.1 prerelease line |
| `next` | 0.2.1-rc.3 | 0.2.1 |

Bare package name resolves `latest`, which installs 0.1.5-alpha.2. That build targets 0.1.x hosts and does not mount on a 0.2.1 host. After installing it, no Team tools appear in dsh and `/lead-mode` still reports "not mounted".

Measured on 2026-10-26 with npm 11.20.0:

```
$ npm view @deepseek-ai/dsh-experimental-agent-team-profile version
0.1.5-alpha.2
```

So every install command in this plugin carries `@0.2.1-rc.3`: the persona prefix, the `/lead-mode` output, the startup warn, and SKILL.md. `test/preset.test.mjs` and `test/smoke.test.mjs` both assert that string, so a future edit cannot quietly drop back to the bare name.

For the `alpha` line, pin `@0.2.1-alpha.5` yourself; do not use the bare name.

## Difference from the official standard preset

One place only: the persona. The other 21 rows are copied field for field from `standard`.

| Item | standard | lead-mode |
|---|---|---|
| persona prefix | `You are a coding agent powered by the {{model}} model.` | Chinese Lead persona plus an Agent Teams precondition check |
| other 21 rows | — | identical to standard, field for field |

The four classic subagent rows (`tool-subagent-control`, `tool-subagent-list-agents`, `tool-subagent`, `tool-subagent-fork`) stay enabled. Nothing is disabled. The Team tools are a host decision, not a preset decision.

## Why the preset does not carry the Team runtime

`apply()` in `@deepseek-ai/dsh-experimental-tool-agent-team` listens on the global `agent/created` event and installs Team tools on every agent. It is a host-plane plugin; putting it in a preset would leak it into every session.

So this plugin stays at: preset, skill, reminder. Whether the Team runtime is on is decided by the user through the official profile package.

## What `/lead-mode` reports

Three facts:

- Whether the Team runtime is mounted, and its `maxMembers` when it is
- Whether the `lead-mode` preset registered
- The version-pinned install command when something is missing

Returns success when everything is in place, error when something is missing. Missing dependencies are never silent.

## Layout

```
package.json            package metadata; dsh.bundle.patch points at cordis.patch.yml
cordis.patch.yml        two insert rows: this plugin and the lead-mode preset
lib/index.js            host half: register the skill, register the command, startup check
skills/lead-mode/       the Lead working method
dsh-plugin.naming.json  naming manifest
test/                   behaviour assertions, zero dependencies
```

## Development

```bash
node --check lib/index.js
node --test test/
node scripts/check-patch.mjs
```

Tests are zero-dependency. No `npm install` needed.

## License

MIT
