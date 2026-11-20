# dsh-lead-mode

English | [中文](README.zh-CN.md)

Version 0.2.7 · host >= 0.2.2-rc.3 · MIT

Adds Lead mode to DSH (DeepSeek Harness): the model acts as the Lead, splitting, delegating and accepting the work while members do the hands-on part. The tools come from the official host; the method comes from here.

## Why it exists

The official Agent Teams runtime ships tools only: `spawn_teammate`, `send_message` and `team_task_*` on the older generation; on the newer one members are built with `subagent`, `send_message` and `team_task_*` stay, and `wait_agent` moves into the subagent control tools. When to delegate, whom to delegate to, how to wait for the result, how to accept it, how to merge several members' output: none of that is in the tools.

The official presets ship without the Team tools; a per-session switch controls them. With no Team tools in hand, the model either does everything itself or passes `subagent` off as a teammate. Neither the user nor the model knows this step is missing.

This plugin adds that method layer. It does not replace the official Team mode. The problem breakdown and its evidence: [docs/why.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/why.md).

## Vision

> 让你的 AI 团队明确你的需求，Lead 监督完整的拆解与执行过程，把模型的能力发挥到 200%。

Rendered in English, same meaning: let your AI team pin down what you want, have the Lead supervise the whole breakdown and execution, and let the model work at 200% of its ability.

200% is a goal, not a measured number.

Three invariants:

1. The method outlives the tools. Tools get renamed, hosts move on, the working method stays. Supporting both Agent Teams generations is the first stress test of this.
2. Deliverables land in files. Closing messages, worklogs and team digests all sit on disk and are still readable a week later.
3. A missing piece gets an answer. No silence, no bluffing: the next step is always a command to paste or a concrete switch.

## What makes it different

| Trait | Evidence |
|---|---|
| Adds one method layer, touches no host behaviour | `cordis.patch.yml` holds three `insert` rows in total (this plugin plus two presets); the official presets are untouched; no tools registered, no agent lifecycle listened to, no requests intercepted; uninstall and it is gone |
| Without Team tools it stops instead of improvising | the persona section checks the tool list every turn; startup warns; `/lead-mode` reports state. On the older generation it does not pretend it can delegate, and it does not pass `subagent` off as a teammate |
| Lead only decides and delegates | the persona makes it explicit: split work, hand it out, accept it, do not write code or edit files yourself; verification and answers stay with the Lead |
| Delegation models come from the live list | the persona tells the model to call `list_subagent_models` and pick a provider/model pair from what it returns, with an optional reasoning effort, never an invented id. The host's Subagents → Model selection switch is off by default, and even when on only the checked models are allowed; otherwise children inherit the Lead's route |
| Understands both Agent Teams generations | generation is judged by the tool list, not a version string; the older one is read literally, the newer one by its new semantics: `send_message` takes `agent`, task changes wake nobody. The Lead never waits: it ends the turn and the completion notice starts the next one |
| The method lands in files, not in slogans | one worklog per member (status summary plus append-only round records); four-step handoff ladder for degraded context; a six-block team digest under `reports/` at wrap-up; conclusions carry evidence pointers (`path:line`, a command to paste, a worklog section, or `session-<id>#seq`) |
| Context budget checked | persona prefix is 398 characters (up from 314 in 0.2.6, still down from 2002 in 0.2.5), shared verbatim by both presets, and enters the system prompt every turn; details load on demand |
| Anything visual goes to dsh-context | no second set of pages; it points at the Fleet page instead (link below) |

Every piece of evidence is in the repo: `cordis.patch.yml`, `lib/index.js`, `skills/`, `CHANGELOG.md`.

## Quick start

1. Install: `dsh plugin --profile <your profile name> add dsh-lead-mode`
2. Turn Team on: if the model-and-reasoning menu has the agent teamwork switch (Chinese UI: 开启智能体团队协作; older hosts call it 使用智能体团队), turn it on. An older host has no such switch: install the official profile package there, and match the version to `dsh --version`:

   ```bash
   dsh plugin --profile <your profile name> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
   ```

3. Restart dsh, pick a Lead preset in a new session's preset list — "Lead · PTC" if you work programmatically, "Lead · 创造" if the session should call tools directly — and run `/lead-mode` to see dependency state.
4. Work: the model splits, delegates and accepts on its own.

You do not have to switch presets: in any session run `/skill lead-mode` or `/skill team-digest`. Details: [docs/usage.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/usage.md).

## What you get

| Capability | Entry point | What you do |
|---|---|---|
| Lead presets | "Lead · PTC" or "Lead · 创造" in the preset list | Switch to one |
| Lead working method skill | `/skill lead-mode`; the model also loads it on its own | Nothing |
| Team digest skill | `/skill team-digest`; the model decides at wrap-up whether to write one | Nothing |
| Dependency self-check | `/lead-mode` | Run it when dependencies look wrong |
| Two upfront reminders | Automatic | Nothing |

Additive only. On a name collision the host keeps the first entry it saw and this plugin steps aside.

There are two presets, because Lead changes the method, never the capabilities:

| Preset | Rows | Baseline | Difference |
|---|---|---|---|
| `lead-ptc` | 24 | official `ptc`, field for field | persona only |
| `lead-cordis` | 23 | official `cordis` (creator), field for field | persona, plus `skill-filesystem` mounted without `customSkillDirs` |

The `customSkillDirs` omission is deliberate: that official expression resolves `@deepseek-ai/dsh-agent-preset` through the patch file's own location, and this package cannot resolve the host package from there — copying it verbatim throws at load. The cost is that the `dsh-doc` skill is not on `lead-cordis`'s filesystem skill dirs. Details on all five entries: [docs/usage.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/usage.md).

Both presets mirror web-app presets, so they fit a desktop or Web profile only. A headless profile lacks those tool rows; do not switch to a Lead preset there.

PTC is the official tool presentation where the model writes a TypeScript program: only `run_code` is callable directly, and every other tool is called as `tools.xxx()` inside the program. Lead's task-board calls and delegation follow that shape; the `lead-mode` skill carries the details. In `lead-cordis` the tools are callable directly and `tool-cordis` is in, which is what "creator" means on this host.

## Friendly link: dsh-context

This plugin does Lead mode only. Visualising team state and comms is [dsh-context](https://github.com/bowenliang123/dsh-context)'s job; it is a separate project.

| Item | Value |
|---|---|
| Repository | https://github.com/bowenliang123/dsh-context |
| Author | bowenliang123 |
| License | Apache-2.0 |
| Install | `dsh plugin --profile <your profile name> add dsh-context` |

It does not ship with this plugin, and it is not a dependency. The Fleet page exists only once you install it.

After that every session gains a "Fleet / 编队" tab (right of Context), and the right sidebar's Context panel carries the same card, in five blocks:

| Block | Shows |
|---|---|
| Summary | Member status, live context, estimated cost, task progress |
| Agent Network | The current agent, its parents, every subagent, one card each |
| Fleet Members | Each member's role, model, latest reply, run time, steps, active task count |
| Tasks | Team tasks and subagent delegations together, grouped by owner, with blocked-by chains |
| Agent Comms | Who said what to whom: team relays, mailbox deliveries, the runtime's settlement notices |

## Docs

| What you want | Where |
|---|---|
| Why it exists, the problem broken down, its boundaries | [docs/why.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/why.md) |
| Install, turning Team on, usage, capability detail, dependency table | [docs/usage.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/usage.md) |
| The two Agent Teams generations, compared and identified | [docs/agent-teams.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/agent-teams.md) |
| Design trade-offs: non-interference, the preset difference | [docs/design.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/design.md) |
| Layout, development, tests, releasing | [docs/development.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/development.md) |
| Terms | [GLOSSARY.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/GLOSSARY.md) |
| Version history | [CHANGELOG.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/CHANGELOG.md) |
| Team digest samples | [reports/](https://github.com/xiebaiyuan/dsh-lead-mode/tree/main/reports) |

`docs/` does not ship in the npm package, so the deep dives live on GitHub only. The links are absolute, so they still open from an npm page.

The deep-dive docs are in Chinese for now.

## License

MIT. Full text in [LICENSE](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/LICENSE).
