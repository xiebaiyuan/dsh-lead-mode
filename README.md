# dsh-lead-mode

English | [中文](README.zh-CN.md)

Adds a Lead mode to DSH. One preset, one skill, one self-check command, two reminders.

Once installed, the model works the way a Lead does: split the work, delegate it, accept the result. It delegates hands-on work instead of doing everything alone.

## What you get

Four things. None of them touch dsh itself.

| Capability | Entry point | What you do |
|---|---|---|
| Lead mode preset | "Lead 模式" in the preset list | Switch to it |
| Lead working method skill | `/skill lead-mode`; the model also loads it on its own | Nothing |
| Dependency self-check | `/lead-mode` | Run it when dependencies look wrong |
| Two upfront reminders | Automatic | Nothing |

### 1. The Lead mode preset

Switch to it and the session's model becomes a Lead.

The preset is the official `standard` preset row for row, all 22 of them, with only the persona replaced. No tool is dropped: bash, file read/write, search, web, todo, skill, goal, plan, compaction, subagent and workflow are all there.

So switching to Lead mode costs you no capability. It changes how the model works, not what it can do.

### 2. The Lead working method skill

A working method for splitting, delegating and accepting work, shipped inside the package.

It is not tied to the preset. Any session can load it, two ways:

- The model loads it when it judges the task needs it (the skill is marked model-invocable)
- You run `/skill lead-mode` yourself

It covers: agreeing on the goal before starting, making a delegation self-contained, keeping write scopes disjoint, the list/get/claim/complete flow for shared tasks, how to wait on teammates, where a teammate's model comes from, and doing the final verification yourself.

Two of those facts only show up when you read the runtime source:

| Fact | Why it matters |
|---|---|
| A teammate settling notifies you automatically, carrying its closing message | Finish your turn after delegating; you do not need to sit and watch |
| A task change does not wake an idle Lead | Do not count on "it marked the task complete, so I know"; that path only wakes a caller currently inside `wait_agent` |

So the skill's default is: finish your turn after delegating and let the notification wake you (the user sees progress immediately), and use one `wait_agent` only when the current turn cannot continue without the result. Never loop `wait_agent`, and never poll with repeated `list_agents`.

Tell the teammate to put the **deliverable in its closing message** — that message is what comes back to you with the notification.

### 3. The dependency self-check command

`/lead-mode` reports the current dependency state.

| Reported | Content |
|---|---|
| Team runtime | Mounted or not; its `maxMembers` when mounted |
| lead-mode preset | Registered or not |
| Missing pieces | The version-pinned install command |

Everything in place returns success. Anything missing returns error. Nothing is skipped silently.

### 4. Two upfront reminders

This is the main reason the plugin exists: **when the session has no Team tools, it tells you to enable the official Agent Teams instead of letting the model work alone.**

Two channels:

| Channel | Who sees it | When it appears |
|---|---|---|
| First persona section | The model | As soon as you switch to Lead mode. It is section 0 of the system prompt |
| Startup warn and `/lead-mode` | You | When the Team runtime is detected missing |

Both say the same thing: without the `spawn_teammate` tool set, stop and tell the user what to install.

The model will not pretend it can delegate, and it will not pass `subagent` off as a teammate.

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

From GitHub:

```bash
dsh plugin --profile <your profile name> add https://github.com/xiebaiyuan/dsh-lead-mode
```

Restart dsh afterwards, then pick "Lead 模式" in the preset list.

## Usage

Three steps.

**1. Switch to Lead mode.** Pick "Lead 模式" in a new session's preset list. The first system-prompt section becomes the Lead persona, and the reminder at its top goes in with it.

**2. Run `/lead-mode` to check dependencies.** This command delegates nothing; it only reports state. When something is missing it prints the version-pinned install command.

**3. Let the model work.** With the delegation tools in place, the model splits the work, delegates to teammates, and waits for all of them before wrapping up. Without them, its first move is to tell you to enable the Team runtime.

## Friendly link: dsh-context

This plugin only does Lead mode. Visualising Team state and comms is **dsh-context**'s job, and that is a separate project:

| Item | Value |
|---|---|
| Repository | https://github.com/bowenliang123/dsh-context |
| Author | bowenliang123 |
| License | Apache-2.0 |
| Install | `dsh plugin --profile <your profile name> add dsh-context` |

It does not ship with this plugin, and it is not a dependency of it. This plugin only points at it from the docs and the skill.

### Why point there at all

Tool calls read one at a time. `list_agents` gives one line of status; `team_task_list` gives task ownership. Seeing who is doing what, and who said what to whom, takes a page.

dsh-context adds a **Fleet / 编队** tab to every session (right of **Context**), and the right sidebar's **Context** panel carries the same card.

| Surface | Shows |
|---|---|
| Summary | Member status, live context, estimated cost, task progress |
| Agent Network | The current agent, its parents, every subagent, one card each |
| Fleet Members | Each member's role, model, latest reply, run time, steps, active task count |
| Tasks | Team tasks and subagent delegations together, grouped by owner, with blocked-by chains |
| Agent Comms | Who said what to whom. Team relays, mailbox deliveries, and the runtime's settlement notices |

Picking a member on the graph or the member board narrows Tasks and Agent Comms to that one agent. Opening a message in Agent Comms shows the full record: which session log it came from, its sequence, whether the runtime wrote the settlement notice or the child sent it, and the complete closing report.

The Lead mode skill names this entry point too, so the model points you here instead of restating progress itself.

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
node --test test/*.test.mjs
node scripts/check-patch.mjs
```

Tests are zero-dependency. No `npm install` needed. The directory form of `node --test` is accepted only on Node 22+; on Node 20 the shell expands the glob.

## Releasing

Push a tag to trigger `.github/workflows/release.yml`. Publishing goes through npm Trusted Publishing (OIDC). No token is stored and no 2FA prompt appears.

Configure the Trusted Publisher once on npmjs.com:

| Field | Value |
|---|---|
| Organization or user | `xiebaiyuan` |
| Repository | `dsh-lead-mode` |
| Workflow filename | `release.yml` |
| Allowed actions | Tick `npm publish` |

`npm stage publish` is allowed by default. With only that ticked, CI can stage but a human still has to approve before the version goes live.

Once configured:

```bash
npm version patch --no-git-tag-version
git commit -am "chore: bump to 0.1.3"
git tag v0.1.3
git push origin main --tags
```

The tag version must equal `package.json`'s version, or the workflow exits without publishing. npm rejects a second publish of the same version, so bump the version every time.

## License

MIT