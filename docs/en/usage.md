# Installation & Usage

[← Back to README](../../README.md) · [中文](../usage.md)

This guide covers installation paths, the three-step startup flow, details on all five plugin capabilities, peer dependencies, and why legacy host instructions pin `@0.2.2-rc.1`. For a short overview, see **Quick start** in [README.md](../../README.md); for design tradeoffs, see [design.md](design.md).

## Install the plugin

Pick either source:

From npm:

```bash
dsh plugin --profile <your profile> add dsh-lead-mode
```

From GitHub:

```bash
dsh plugin --profile <your profile> add https://github.com/xiebaiyuan/dsh-lead-mode
```

Restart DSH afterward so **Lead · PTC** and **Lead · 创造** (`Lead · Create`) appear in the preset picker.

## Three-step workflow

1. **Select a Lead preset**: Open a new session and choose **Lead · PTC** or **Lead · 创造**. Its persona replaces segment 0 of the system prompt and points the model to `lead-mode`. Both presets share the exact same persona text; only their tool sets differ.
2. **Run `/lead-mode` to verify dependencies**: This command reports the Team runtime mount state and both preset registrations. If anything is missing, it prints either the session switch instruction (newer hosts) or the version-pinned install command (legacy hosts).
3. **Start delegating**: When ready, the model splits tasks, assigns parallel members, awaits settlement notices, and delegates independent verification. When Team tools are off, it stops first and asks you to enable them.

## Using skills without switching presets

You do not have to switch presets to use the workflow. With the plugin installed, any session running `standard`, `ptc`, or a custom preset can invoke `/skill lead-mode` (or let the model auto-load it).

The only difference is that non-Lead presets lack the standing persona pointer in the system prompt, so run `/lead-mode` once at the start if you want to verify Team readiness. `team-digest` works across any preset in the same way.

## Five provided capabilities

All five components are purely additive and leave DSH core untouched (see [design.md](design.md)):

| Capability | Entry point | User action |
|---|---|---|
| Lead presets (two) | **Lead · PTC** / **Lead · 创造** in preset picker | Pick one for the session |
| Lead method skill | `/skill lead-mode` (model-invocable) | Automatic or manual |
| Team digest skill | `/skill team-digest` (before final wrap-up) | Automatic on multi-member/multi-round work |
| Dependency check | `/lead-mode` | Run when dependencies look off |
| Two opening reminders | Built into persona + startup warnings | Automatic |

### 1. Lead presets (`lead-ptc` and `lead-cordis`)

Lead changes workflow discipline rather than tool availability, so each preset copies an official baseline row for row:

| Preset | Plugin rows | Official baseline | Difference |
|---|---|---|---|
| `lead-ptc` | 24 | `ptc` (field by field) | Persona only |
| `lead-cordis` | 23 | `cordis` / Create (field by field) | Persona; `skill-filesystem` without `customSkillDirs` |

- **`lead-ptc`**: Programmatic Tool Calling mode. Only `run_code` accepts direct tool calls; bash, file I/O, search, web, todo, skill, goal, plan, compaction, subagent, office, and `team_task_*` run via `tools.xxx()` inside TypeScript. Both `workflow` rows remain disabled as in official `ptc`.
- **`lead-cordis`**: Direct-tool creator mode. Includes `tool-cordis`, the `planning` group, and active `workflow` rows for modifying DSH itself or developing plugins, while omitting `tool-executor-ptc` and `tool-office` just like official `cordis`.

`lead-cordis` omits `customSkillDirs` because the official `!!js` expression resolves `@deepseek-ai/dsh-agent-preset` relative to `cordis.patch.yml`, which fails when loaded from an external plugin package. Consequently, `dsh-doc` is not included in `lead-cordis`'s filesystem skill list.

#### Four rules enforced in the persona

| Rule | Execution behavior |
|---|---|
| Decide, delegate, report only | Lead touches control-plane tools (`list_subagent_models`, `list_agents`, `team_task_*`, `send_message`) and assigns all code, file, log, CI, and package work to members. Halts when Team is off rather than falling back to `subagent` |
| Independent verification | Tests, diff checks, CI, and package audits go to a member who wrote none of the changes (or a fresh read-only member if only the implementer ran) |
| High bar, no self-patching on rework | Require runnable commands, numbers, or `path:line` evidence; reject unverified claims. After two failed rejections, swap the member, narrow scope without lowering criteria, or ask the user |
| Select models from `list_subagent_models` | Always pick valid `provider/model` pairs (plus reasoning effort) from tool output; never invent IDs. Single-entry output means members inherit the Lead's route |

**Prerequisite for per-member model selection**: Host **Settings → Subagent → Model selection** is off by default. While off, explicit `provider/model` arguments are rejected and all members inherit the Lead's model and reasoning effort rather than auto-selecting a cheaper model. To enable per-task routing, turn on **Allow Agent to choose models for subagents**, check allowed models in **Models selectable by Agent**, and **start a new session** (existing sessions lock their allowlist at session creation and reject newly enabled models with `child LLM route "…" is not allowed for this Session`).

### 2. Lead method skill (`lead-mode`)

`skills/lead-mode/SKILL.md` (510 lines) is auto-discovered from disk and registers without binding to a preset:

- **Session detection & goal kickoff**: Detect PTC vs. native and legacy vs. subagent Team generation; stop if Team is off; establish primary criteria `#1..#M`, align a <=10-line change contract first on high-risk tasks, and write an immutable <=30-line goal charter `.scratch/<effort>/anchor.md` (with Non-Goals) for multi-round tasks, prioritizing user corrections via `v1 -> v2` versioning.
- **Priority triage & parallel dispatch (`§12` & `§9.2`)**: Classify work into **primary**, **supporting** (with explicit blocking criteria and stop line), and **side** items before checking parallelism. Side items and deprioritized slow checks skip the parallel queue and go straight to `.scratch/<effort>/leftovers.md` (requiring pasteable commands, paths, or reproducible `target + entry point + criterion` walkthrough steps).
- **Task board & event-driven wakes**: Manage `team_task_*` (`list/get/claim/complete`), emit the one-line anchor pulse header and check primary criteria progress first on every wake (`§9.3`), never spawn new work from side reports, and keep nested subagent delegation within host `maxDepth` and shared budgets.
- **Verification & escalation**: Require implementers to self-verify green before handoff; run independent verification in one full pass with verbatim 4-part defect bundles strictly within existing criteria and direct regressions while auditing diffs against `anchor.md` against silent criteria weakening; triage rework into four tiers with regression locks and run incremental re-verification for narrow fixes (outside the full-run cap), stopping once all `#1..#M` pass; apply a controlled one-time same-model plan-only specialist only when three strict conditions hold.
- **Context handoff & long-horizon guardrails**: Covers compaction detection, 4-step escalation ladder, `anchor` / `worklog` / `handoff` file rules, and multi-round control (every-3-round/phase-change heartbeat re-anchoring, supporting-task bloat circuit breaker, 5-round checkpoint report, and cross-session cold start).

Five reference guides and one standalone model capability config under `skills/lead-mode/references/` load only when needed (resolved via `resourceBase: { kind: 'directory', path }` so the host renders `Base directory for this skill: …`):

| Reference | Load when | Focus |
|---|---|---|
| `ptc-calls.md` | Running inside `lead-ptc` | `run_code` call patterns and concurrency-safe `Promise.all` reads |
| `old-gen.md` | Host exposes `spawn_teammate` | Legacy `spawn_teammate` args, member statuses, and limits |
| `member-models.md` | Picking per-member models | 3-tier role routing, cross-channel fuzzy matching, heterogeneous verification, fallback rules, and stall escalation/step-down |
| `model-roster.json` | Mapping model lists or updating preferred versions | Standalone maintainable capability roster (Opus / Gemini Carbon·Neon / highest GPT `sol`·`astra`, DeepSeek `4.1flash` / Gemini `h*`, lightweight tier) and fallback rules |
| `tool-signatures.md` | Before writing tool calls | Parameter differences across both Agent Teams generations |
| `long-horizon.md` | Multi-round or cross-module work (`>= 2` rounds) | Kickoff model roster, `anchor.md` goal charter (<=30 lines, Non-Goals, `v1->v2` versioning), per-wake anchor pulse header, `N/M` criteria ledger, `todo_write`/`create_goal` boundaries, tiered acceptance (default max 2 full runs; narrow incremental checks excluded) with drift audit, stronger-model `fresh` takeover after 2 stagnant rounds or supporting-task bloat with step-down after breakthrough, 5-round checkpoint, every-3-round/phase heartbeat re-anchoring, and cross-session cold start |

**Two runtime facts verified from DSH source**:

| Host fact | Workflow impact |
|---|---|
| Settlement delivers the member's final message (`Its closing message:`) | End your turn after delegating; no polling needed |
| `team_task_*` updates never wake an idle Lead | Legacy wakes only `wait_agent`; newer hosts only watch the caller's inbox |

Accordingly, the Lead **never calls `wait_agent`** (which blocks only its own inbox and burns `run_code`'s 120s budget) or `list_agents` polling loops; nudge via `send_message` and instruct members to put deliverables in their closing message.

### 3. Team digest skill (`team-digest`)

When closing out multi-member or multi-round efforts, `team-digest` consolidates scattered logs into one lasting summary:

| Aspect | Rule |
|---|---|
| Trigger | Before final answer when `>= 2` members or `>= 2` rounds |
| Output path | `reports/<YYYY-MM-DD>-<effort>.md`, written once at wrap-up |
| Six fixed sections | Conclusion / Who did what / Acceptance evidence / Deviations & unverified / Dead ends & decisions / Open items & next steps |
| Source priority | Closing messages first → worklogs for detail → session logs as fallback |

Section 1 opens with `主目标：达成/部分达成/未达成（N/M）` (falling back to `主目标：未验证（缺主目标判据）` if invoked standalone without criteria). Two early historical samples in `reports/` (`2026-10-29-team-digest.md` and `2026-11-11-readme-redesign.md`) carry deprecation notices and should not be copied as current templates. See [skills/team-digest/SKILL.md](../../skills/team-digest/SKILL.md).

### 4. `/lead-mode` diagnostic command

| Check | Output |
|---|---|
| Team runtime | Mounted or unmounted; prints `maxMembers` on legacy hosts |
| Both presets | Individual registration status for `lead-ptc` and `lead-cordis` |
| Next step when missing | Session switch path on newer hosts; version-pinned install command on legacy hosts |

Returns `success` when all dependencies are ready, or `error` with actionable instructions.

### 5. Two opening reminders

| Channel | Audience | When shown |
|---|---|---|
| Persona segment 0 | Model | Every turn on `lead-ptc` or `lead-cordis` |
| Startup warning & `/lead-mode` | User | On startup if `agentTeams` is absent, or when running `/lead-mode` |

On legacy hosts, the model halts instead of using `subagent` as a teammate replacement; on newer hosts where teammates use `subagent`, missing `team_task_*` still triggers a halt so the user turns on the Team collaboration switch.

## Official peer dependencies & versions

This plugin bundles none of the following packages; they are provided by DSH (or installed explicitly on legacy hosts):

| Package | Requirement | Provider | Impact if missing |
|---|---|---|---|
| `@deepseek-ai/dsh-experimental-agent-team-profile` | `0.2.2-rc.1` | User-installed on legacy hosts only | Legacy delegation unavailable; `/lead-mode` errors + startup warn |
| `@deepseek-ai/dsh` | `>=0.2.2-rc.3` | Host | Install blocked |
| `@deepseek-ai/cordis` | `^4.0.5` | Host | Install blocked |
| `@deepseek-ai/schemastery` | `^3.18.5` | Host | Install blocked |
| `@deepseek-ai/dsh-agent-preset-registry` | `>=0.2.2-rc.3` | Host | Presets inactive; `/lead-mode` reports unknown |
| `@deepseek-ai/dsh-skill` | `>=0.2.2-rc.3` | Host | Skills skipped; startup warn |
| `@deepseek-ai/dsh-commands` | `>=0.2.2-rc.3` | Host | `/lead-mode` skipped; startup warn |

`package.json` sets `dshTarget` to `0.2.2-rc.3` for the newer host line. On newer hosts, `@deepseek-ai/dsh-experimental-agent-team-profile` is retired (`RETIRED_BUNDLES`) and must not be installed.

## Why legacy install hints pin `@0.2.2-rc.1`

`@deepseek-ai/dsh-experimental-agent-team-profile` exposes three npm dist-tags:

| Dist-tag | Version | Target host |
|---|---|---|
| `latest` | `0.1.5-alpha.2` | 0.1.x |
| `alpha` | `0.2.2-alpha.3` | Early 0.2.2 preview |
| `next` | `0.2.2-rc.1` | Legacy 0.2.2 |

Omitting the version pulls `latest` (`0.1.5-alpha.2`), which silently installs via preflight yet fails to mount on 0.2.2 hosts (verified with `npm view @deepseek-ai/dsh-experimental-agent-team-profile version` returning `0.1.5-alpha.2`).

Therefore, all legacy instructions in `/lead-mode`, startup warnings, and `SKILL.md` pin `@0.2.2-rc.1` (matching the legacy `next` tag, whereas `package.json` `dshTarget: 0.2.2-rc.3` targets the newer host baseline). Persona prefixes omit the command text to stay concise.

See [agent-teams.md](agent-teams.md) for the side-by-side generation matrix and parallelism rules.
