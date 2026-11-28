# Design Tradeoffs

[← Back to README](../../README.md) · [中文](../design.md)

`dsh-lead-mode` avoids modifying DSH internals, layering a clean, removable workflow discipline beside official presets. This note records how it stays non-intrusive and documents every exact delta between the Lead presets and their official baselines. For motivation and boundaries, see [why.md](why.md).

## Staying out of the host's way

- **Additive only**: `cordis.patch.yml` contains exactly three `insert` entries: the plugin row (`dsh-lead-mode`) and the two new presets (`lead-ptc`, `lead-cordis`). Official `standard`, `ptc`, and `cordis` presets are untouched.
- **Zero tool registration or lifecycle hooks**: `lib/index.js` writes only to the `skills` and `commands` registries (plus startup warnings when services are absent). Uninstalling removes every trace.
- **First-come collision yielding**: If a host or another plugin already registers `lead-mode` or `team-digest`, DSH keeps the existing registration, logs a warning, and yields on this plugin's duplicate.

## Preset deltas vs. official baselines

Lead mode alters workflow rather than tool capabilities, so each preset mirrors an official preset field by field:

| Preset | Plugin rows | Official baseline | Delta |
|---|---|---|---|
| `lead-ptc` | 24 | `ptc` | `persona.config.prefix` only |
| `lead-cordis` | 23 | `cordis` (Create) | `persona.config.prefix`; `skill-filesystem` without `customSkillDirs` |

Both presets share an identical 475-character persona prefix (replacing the one-line `You are a coding agent powered by the {{model}} model.`) structured into six tight directives:

1. Decide, split, and delegate only; members perform all exploration and independent verification, while the Lead evaluates and reports conclusions; protect primary goals, log side items as leftovers, require concrete criteria, and never self-patch rework.
2. Load `lead-mode` before delegating for generation diffs, fresh/fork selection, model picking, task boards, write scopes, parallelism, verification, self-planning & closed-loop drive, long-horizon stop-loss, and escalation.
3. Call `list_subagent_models` first to pick valid `provider/model` pairs without inventing IDs (single entry inherits parent route).
4. End the turn after delegating to await settlement notices; never poll with `wait_agent`, nudge with `send_message`, and dispatch independent tasks together.
5. Check `team_task_*` up front (SDK block in PTC, tool list otherwise); halt when missing, never work solo or fake teammates with `subagent`, and direct the user to `/lead-mode`.
6. Instruct members to create `.scratch/<effort>/worklog-<mate>.md` as step 1 and append a closing update before finishing.

The length cap is 479 characters (errors at 480) to keep standing per-turn prompt overhead small.

### Detailed preset configuration notes

- **`lead-ptc`**: Reproduces all four deltas between official `ptc` and `standard`: adds `tool-executor-ptc`, disables `workflow-ptc` and `tool-workflow`, and disables `tool-plugin-manager`. Only `run_code` runs directly; all other tools execute via `tools.xxx()`.
- **`lead-cordis`**: Mirrors official `cordis` directly—keeps `tool-cordis`, the `planning` group, and active `workflow` rows, while omitting `tool-executor-ptc` and `tool-office`.
- **Why `customSkillDirs` is omitted in `lead-cordis`**: Upstream `cordis` defines `customSkillDirs` via a `!!js` expression resolving `@deepseek-ai/dsh-agent-preset/package.json` relative to the patch file's `baseUrl`. Inside `app.asar`, that resolves; from `node_modules/dsh-lead-mode/`, it throws at load time. Mounting `skill-filesystem` without that config avoids the crash, at the cost of excluding `dsh-doc` from `lead-cordis`'s filesystem skill directories.
- **Synced `0.2.2-rc.3` additions**: Keeps `tool-office` after `present` strictly in `lead-ptc`, and sets `config.interrupt: false` on `tool-subagent-control` in both presets so `lead-mode` treats hard interrupts as conditional.
- **Classic subagent rows preserved**: `tool-subagent-control` (which now registers `list_agents` directly), `tool-subagent`, and `tool-subagent-fork` stay enabled. Team tools remain controlled by the host runtime, never by the presets.
