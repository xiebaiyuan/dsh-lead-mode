# Why dsh-lead-mode exists

[← Back to README](../../README.md) · [中文](../why.md)

## Problem 1: Agent Teams is off by default

DSH ships two distinct delegation mechanisms with different capabilities:

| Dimension | Classic `subagent` | Agent Teams |
|---|---|---|
| Tool names | `subagent`, `subagent_fork` | Legacy: `spawn_teammate`, `send_message`, `team_task_*` · New: `subagent`, `send_message`, `team_task_*` |
| Visibility across children | Isolated; children cannot see each other | Shared task board and direct messaging |
| Interaction model | Fire once from parent; returns final result and ends | Persistent Lead and members across multiple rounds |
| Mid-run course correction | None; wait until the child completes | Yes; steer via `send_message` at the next step boundary |
| Enabled by default | No; separate from presets | No; legacy hosts require a profile package, newer hosts use a per-session switch |

When you start a session with an official preset (`standard`, `ptc`, or `cordis`), the model sees only classic `subagent`. Asking it to run three modules in parallel while coordinating mid-flight forces it into plain `subagent` calls: fire three independent children, wait for each to finish, with zero shared task state or mid-run steering.

The bottleneck is missing runtime tools and workflow rules, not model capability.

## Problem 2: Missing tools fail silently

The two host generations (where "host" means the DSH application) provision the official Team runtime differently:

- **Legacy hosts (`<= 0.2.2-rc.1`)**: Provided by an official profile package that must be installed explicitly:

```bash
dsh plugin --profile <your profile> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

`0.2.2-rc.1` is the final released legacy host line; replace the version pin with the output of `dsh --version`.

- **Newer hosts (`>= 0.2.2-rc.3`)**: Do not install the package above. Team plugins ship with the base and web bundles, controlled per session under **Models & Reasoning Level → Agent team collaboration** (labeled **Use agent team** on earlier previews). `@deepseek-ai/dsh-experimental-agent-team-profile` is in `RETIRED_BUNDLES` and should not be installed on newer hosts.

Because official system prompts contain no instruction telling the model when Team tools are absent, models typically fall back to working serially in one context or misusing `subagent` as a teammate replacement—leaving the user unaware of which switch or package is missing.

## What this plugin adds

Three additions, leaving host behavior untouched:

### 1. Two presets: `lead-ptc` and `lead-cordis`

`cordis.patch.yml` inserts two `@deepseek-ai/dsh-agent-preset` entries: one copied field by field from official `ptc` (24 plugin rows) and one from official `cordis` / Create (23 plugin rows). Both replace only `persona.config.prefix` (`lead-cordis` also omits `customSkillDirs`; see [design.md](design.md)).

Two separate presets exist because Lead discipline changes workflow, not tool capabilities. Merging PTC and direct-tool (`cordis`) presets would force an unnecessary capability tradeoff.

Both presets share an identical 468-character persona prefix injected into `DEPLOYMENT_PERSONA_PREFIX` across six short blocks:

1. **Role & priority boundaries**: Decide, split, and delegate only; members handle all exploration and verification, and the Lead reports conclusions. Protect primary goals first, move side items to leftovers, require concrete criteria, and never patch rework directly.
2. **Load the workflow skill**: Load `lead-mode` before delegating for generation rules, context handling, model selection, task board flow, write scopes, parallel dispatch, acceptance, long-horizon stop-loss, and escalation.
3. **Model list discipline**: Call `list_subagent_models` before spawning and pick valid `provider/model` pairs without inventing IDs (single entry means members inherit the parent model).
4. **Event-driven waiting & parallelism**: End turns immediately after delegating without calling `wait_agent` or polling; nudge via `send_message`, and dispatch independent tasks in one parallel batch.
5. **Startup Team check**: Check `team_task_*` in the PTC SDK block or tool list; if absent, stop immediately, avoid solo work or `subagent` stand-ins, and tell the user to run `/lead-mode`.
6. **Worklog first step**: Instruct every member to create `.scratch/<effort>/worklog-<mate>.md` first and append a final entry before wrapping up.

The prefix cap was raised to 479 characters (errors at 480) to keep every-turn prompt overhead small while leaving install commands, tool signatures, and long-horizon mechanics in on-demand skills and reference files.

`test/preset.test.mjs` verifies both presets against official fixture files so any unintended plugin row change fails CI immediately.

### 2. Two runtime skills: `lead-mode` and `team-digest`

- **`lead-mode`** ([SKILL.md](../../skills/lead-mode/SKILL.md), with five on-demand references): Covers priority triage, disjoint write scopes, `team_task_*` lifecycle, settlement-driven waiting, independent verification, and long-horizon stop-loss.
- **`team-digest`** ([SKILL.md](../../skills/team-digest/SKILL.md)): Preset-independent wrap-up skill that merges member closing messages and worklogs into `reports/<YYYY-MM-DD>-<effort>.md` whenever work uses `>= 2` members or spans `>= 2` rounds, opening with `主目标：达成/部分达成/未达成（N/M）`.

### 3. `/lead-mode` diagnostic command

Running `/lead-mode` checks whether the Team runtime is mounted and whether both `lead-ptc` and `lead-cordis` are registered. It returns `success` when ready, or `error` with the exact host-appropriate next step when a dependency is missing.

## Why the legacy install command pins `@0.2.2-rc.1`

`@deepseek-ai/dsh-experimental-agent-team-profile` publishes three npm dist-tags:

| Dist-tag | Version | Target |
|---|---|---|
| `latest` | `0.1.5-alpha.2` | Legacy 0.1.x hosts |
| `alpha` | `0.2.2-alpha.3` | Early 0.2.2 preview |
| `next` | `0.2.2-rc.1` | Legacy 0.2.2 host line |

Installing without a version resolves `latest` (`0.1.5-alpha.2`), which fails to mount Team tools on 0.2.2 hosts. Every legacy install hint in this plugin pins `@0.2.2-rc.1` and matches `dsh --version`, guarded by `test/preset.test.mjs` and `test/smoke.test.mjs`. (This section does not apply to newer `>= 0.2.2-rc.3` hosts.)

Empirical comparison captured against the `0.2.1-rc.3` host line (whose manifest and package structure match `0.2.2-rc.1`):

### Why host preflight checks miss the mismatch

DSH inspects a package's manifest (`namedSpecManifest` in `dsh-plugin-manager/lib/index.js`) and checks compatibility in `unmetRequirements` (`dsh-app-boot/lib/index.js`):

1. If `engines.dsh` is present, check only `engines.dsh` and skip `peerDependencies`.
2. Otherwise, check only `peerDependencies` named `@deepseek-ai/dsh` or starting with `@deepseek-ai/dsh-`.

Measured upstream manifests:

| Version | `engines` | `peerDependencies` |
|---|---|---|
| `0.1.5-alpha.2` | None | `@deepseek-ai/cordis: ^4.0.2` |
| `0.2.1-rc.3` | None | `@deepseek-ai/cordis: ~4.0.5` |

Because neither declares `engines.dsh` and both list only `@deepseek-ai/cordis`, `unmetRequirements` skips every entry and silently installs `0.1.5-alpha.2`.

### Consequence of installing the wrong version

Inspecting `cordis.patch.yml` across the two tarballs reveals four differences:

| Entry | `0.1.5-alpha.2` | `0.2.1-rc.3` |
|---|---|---|
| `tool-subagent` | Adds `backgroundMode: one-shot` | `disabled: true` |
| `tool-subagent-fork` | Adds `backgroundMode: one-shot` | `disabled: true` |
| `agent-team` `maxPendingMessagesPerMember` | `64` | Omitted |
| `ui-agent-team` | Absent | Present |

With `0.1.5-alpha.2`, classic subagent stays enabled and collides with Team tools (`list_agents`, `send_message`, `interrupt_agent`), while the Web Team UI stays missing.

### How `dsh-lead-mode` prevents mismatched installs

`package.json` explicitly declares `"engines": { "dsh": ">=0.2.2-rc.3" }`, so DSH preflight rejects incompatible host versions cleanly instead of silently installing.

## Why the plugin does not bundle the Team runtime

Early prototypes attempted to insert `@deepseek-ai/dsh-experimental-agent-team` directly inside `cordis.patch.yml`. That fails because `@deepseek-ai/dsh-experimental-tool-agent-team` hooks the global `agent/created` event on the host plane; mounting it again from a preset creates duplicate tool registrations and conflicts.

Keeping the Team runtime on the host side—via the session switch on newer hosts or explicit profile install on legacy hosts—leaves ownership clear.

## Comparison with a hand-written patch

You can replicate this setup manually by copying `ptc` (24 rows) and `cordis` (23 rows) into your profile's `cordis.patch.yml`, editing the persona, and maintaining local `SKILL.md` files:

| Factor | Hand-written patch | `dsh-lead-mode` |
|---|---|---|
| Maintaining 47 preset rows (`24 + 23`) | Manual copy; silent drift risk | Regression-tested against official fixtures |
| Upstream preset updates | Manual diff and merge | Update the plugin package |
| Distributing `SKILL.md` & references | Manual copy and registration | Auto-discovered and bundled |
| Dependency diagnostics | None | `/lead-mode` command |
| Removal | Delete lines by hand | Uninstall package |

A hand-written patch is faster for a one-off experiment; the plugin saves maintenance across profiles and machines.

## Boundaries

- **Zero host mutations**: Only inserts two presets, two skills, and one command.
- **Never enables Team for you**: Turning on the session switch or installing the legacy profile package remains an explicit user action.
- **Graceful degradation**: If `skills`, `commands`, or `agentTeams` is missing, the plugin still mounts, logs a warning, and disables only that surface.

See [usage.md](usage.md) for installation and daily workflows, and [design.md](design.md) for preset deltas and isolation guarantees.
