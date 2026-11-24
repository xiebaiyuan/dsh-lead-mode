# Agent Teams Across Two Generations

[← Back to README](../../README.md) · [中文](../agent-teams.md)

Lead mode delegates through the official DSH Agent Teams runtime rather than bundling its own. Two host generations implement different APIs, identified by inspecting the session's tool list rather than version strings. This page compares both generations, shows how to enable each, notes PTC-specific call rules, and details parallel dispatch constraints.

## Side-by-side comparison

The legacy generation ended with `0.2.2-rc.1`; the newer generation ships with base/web bundles starting from `0.2.2-rc.3` (e.g., `0.2.2-rc.5`).

| Dimension | Legacy (`<= 0.2.2-rc.1`) | New (`>= 0.2.2-rc.3`) |
|---|---|---|
| Package location | `@deepseek-ai/dsh-experimental-tool-agent-team@0.2.2-rc.1` in desktop `asar` | `packages/team/tool-agent-team` & `packages/subagent/*` |
| Spawn member | `spawn_teammate({ name, description, prompt, context })` | `subagent({ name?, description, prompt, cwd?, agent_preset?, provider?, model?, reasoning_effort? })`; `subagent_fork` to inherit history |
| Identity | Persistent named teammate addressed by `target` | Session ID + path from root (`reviewer/checker`), root fixed as `lead` |
| Messaging | `send_message({ target, message })` | `send_message({ agent, message })` → `{ messageId }` |
| Interrupt | `interrupt_agent({ target })` | `interrupt_agent({ agent })` → `{ accepted }` (disabled by default: `interrupt: false`) |
| Roster | `list_agents({})` lists Lead and teammates | `list_agents({})` lists the full tree `{ name, status, description? }`, adding `corrupt`, `unsupported`, `unavailable` |
| `wait_agent` semantics | Team-scoped: waits for member status, messages, or task changes; returns `noProgress` immediately if idle | Subagent control tool: waits only on the caller's inbox (messages, completion, user input); returns `{ timedOut }` only |
| Task board owner | Four `team_task_*` tools; owner is member name | Same four tools; owner is name or Session ID (`ownerName` → `ownerId`) |
| How to enable | Install `@deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1` | **Do not install profile package** (`RETIRED_BUNDLES`; app-boot deletes it). Enable session switch **Agent team collaboration** (earlier: **Use agent team**) in Models & Reasoning menu |
| Member model | Inherits Lead; `spawn_teammate` has no model args | `subagent` accepts `provider`, `model`, `reasoning_effort`, and `agent_preset` |
| Member limit | `agentTeams.config.maxMembers` | `maxMembers` config key rejected; cap unavailable |

Newer hosts removed `spawn_teammate` and moved `wait_agent` into general subagent control tools scoped to the caller's inbox.

## Detecting which generation you are running

Check the active tool list rather than guessing from version numbers:

| Visible tools | Generation | Next step |
|---|---|---|
| `spawn_teammate` present | Legacy | Ensure the version-matched profile package is installed |
| No `spawn_teammate`, but `subagent` + `team_task_*` present | New | Do not install anything; session Team switch is already active |
| No `team_task_*` tools at all | Team is off | Check the session switch first; install the profile package only if on a legacy host without that switch |

Never install the retired profile package on a newer host; `app-boot` deletes it automatically.

## Enabling legacy hosts: profile package

```bash
dsh plugin --profile <your profile> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

`0.2.2-rc.1` is the final released legacy line; replace the pin to match `dsh --version`. **Always include the version pin**—omitting it installs `0.1.5-alpha.2` (`latest`), which fails to mount on `0.2.2` hosts. Restart DSH and verify with `/lead-mode`. See [usage.md](usage.md) for the dist-tag details.

## Enabling newer hosts: session switch

Do not run the install command above on newer hosts (`>= 0.2.2-rc.3`), where Team plugins ship in the base/web composition. Open **Models & Reasoning Level** inside your session and turn on **Agent team collaboration** (or **Use agent team**). This setting is per-session, not per-profile.

## Calling Team tools under PTC

`lead-ptc` runs tools through `run_code`, while `lead-cordis` invokes tools directly:

- **`lead-ptc` only**: Only `run_code` is directly callable; call `await tools.team_task_list({})`, `subagent`, and `send_message` inside your TypeScript program.
- **`lead-ptc` only**: `team_task_list`, `team_task_get`, and `list_agents` are concurrency-safe and can run concurrently with `Promise.all`.
- **Both presets**: Never call `wait_agent` to wait on members (it wastes `run_code`'s 120s default / 600s max budget); end your turn after delegating and nudge via `send_message`.
- **Both presets**: `interrupt_agent` defaults to `false` on newer hosts; ask the user to enable it before hard interrupts, or send a message instructing the member to stop at a safe checkpoint.

## Why the presets do not embed the Team runtime

`@deepseek-ai/dsh-experimental-tool-agent-team`'s `apply()` hooks `agent/created` globally across the host plane. Placing it inside a preset would double-mount Team tools and clash with host registration. Keeping runtime activation on the host side keeps boundaries clean.

## Which tasks can run in parallel

Parallel dispatch is the default, subject to strict ordering: first triage every item under [skills/lead-mode/SKILL.md](../../skills/lead-mode/SKILL.md) `§12` so **only primary tasks and blocking supporting tasks** enter the parallel queue. Side items skip the queue even when their write scopes do not overlap, going straight into `.scratch/<effort>/leftovers.md`.

Queued items should all launch in one batch whenever both rules hold:

1. **No output dependency**: Task B does not read Task A's output (if changing A's findings invalidates B, chain them serially).
2. **Disjoint write scopes**: Partition ownership by file or directory—never schedule concurrent edits to the same file or mutable shared state.

| Parallel-friendly pattern | How to split | Example |
|---|---|---|
| Read-only investigation | Partition by angle or subsystem | One inspects `skills/`, one checks `docs/`, one checks upstream behavior |
| Inventory & audits | Partition by directory or dimension | One audits terminology, one verifies test coverage |
| Independent verification | Verify each module as soon as it lands | Run tests and `git diff --stat docs/` while code edits continue elsewhere |
| Disjoint implementation | Separate files, modules, or skills | One edits `docs/`, one edits `skills/`, one updates `test/` |

Three hard non-parallel cases:

- Dependent outputs: chain with `blocked_by`.
- Same-file edits: concurrent writes silently overwrite each other.
- Contended mutable state: concurrent `git commit` calls racing on `.git/index.lock`, shared temp profiles, or shared ports.

### Dispatch checklist

- No artificial batch cap—only the host's session member limit applies (visible as `maxMembers` on legacy `/lead-mode`; omitted on newer hosts).
- Include four fields in every prompt: **priority tier & primary criterion `#k`, member name, write scope, and verification criteria**.
- End your turn immediately after dispatching to await settlement notices.
- Use `blocked_by` only for truly dependent edges; launch independent work together.
- On every wake, inspect `#1..#M` primary criteria progress first instead of chasing side findings; process completed primary/supporting chunks as they arrive.

*(Note: `Promise.all` above refers to parallel read-only tool calls inside one `run_code` turn, distinct from dispatching multiple team members in parallel.)*
