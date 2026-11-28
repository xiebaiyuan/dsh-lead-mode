# 设计取舍

[← 返回 README](../README.zh-CN.md) · [English](en/design.md)

本插件不在 DSH 本体上做侵入式改造，只在旁边叠加一层可卸载的工作方法。下面说明不干扰官方的具体约束，以及两个 Lead 预置与官方基线之间的逐项差异。需要了解动机与边界，见 [why.md](why.md)。

## 如何做到不干扰官方

- **只增不改**：`cordis.patch.yml` 全文仅包含三条 `insert`：插件本体（`dsh-lead-mode`）以及两个新建预置（`lead-ptc`、`lead-cordis`）。官方 `standard`、`ptc`、`cordis` 预置一字未改。
- **零工具注入与零拦截**：插件不注册任何工具、不监听 agent 生命周期、不拦截请求。`lib/index.js` 只往 `skills` 与 `commands` 注册表写入两项 skill 和一条命令，并在启动缺少服务时输出一条 warning。卸载包即可完整回收。
- **冲突让位**：唯一可能冲突的位置是同名 skill 或命令。若宿主或用户已有同名 `lead-mode` / `team-digest` 注册，DSH 按先到先得保留前者，仅记录 warning 并跳过本插件那一条。

## 与官方预置的差异

Lead 层只改变工作方式，不增减工具集，因此两个预置各自逐字段复制官方预置：

| 预置 | 插件行数 | 官方基线 | 与基线的差异 |
|---|---|---|---|
| `lead-ptc` | 24 | `ptc` | 仅更换 `persona.config.prefix` |
| `lead-cordis` | 23 | `cordis`（创造） | 更换 `persona.config.prefix`；`skill-filesystem` 省略 `customSkillDirs` |

两个预置共用逐字相同的 475 字 persona prefix（官方默认英文是一句 `You are a coding agent powered by the {{model}} model.`），分六段锚定核心动作：

1. 只做决策、拆活与派活，调查与验收全派成员，结论由自己判断并讲给用户；先保主目标、枝节记遗留，判据具体且返工不自己补位。
2. 派活前加载 `lead-mode` skill（覆盖两代差异、从零或继承、挑模型、任务板、写作用域、并行、验收、自规划与闭环、长程止损、难度升级）。
3. 派活先用 `list_subagent_models` 成对挑选 `provider/model`，禁止编造 id（只有一条时跟随父模型）。
4. 派完活立刻结束回合等通知，不调 `wait_agent`、不轮询，催人用 `send_message`；互不依赖的活一次全派完。
5. 开局核对 `team_task_*` 判断 Team 是否开启，没开即停手并请用户敲 `/lead-mode`。
6. 要求成员第一步建 `.scratch/<effort>/worklog-<mate>.md`，收尾前补完最后一轮。

字数上限设为 479 字（达到 480 触发检查报错），为规则留余量的同时避免每轮常驻上下文膨胀。

### 各预置具体配置差异

- **`lead-ptc`**：完整镜像官方 `ptc` 相对 `standard` 的四处差异：引入 `tool-executor-ptc`、禁用 `workflow-ptc` 与 `tool-workflow`、直接禁用 `tool-plugin-manager`。因此只有 `run_code` 可直调，其余工具均在沙箱 TypeScript 中通过 `tools.xxx()` 调用。
- **`lead-cordis`**：完整镜像官方 `cordis` 形态：包含 `tool-cordis` 与 `planning` 分组，工具可直调，启用 workflow 两行，且按官方基线不含 `tool-executor-ptc` 与 `tool-office`。
- **`customSkillDirs` 的唯一省略**：官方 `cordis` 的 `skill-filesystem` 行带有 `!!js` 表达式，按 `cordis.patch.yml` 自身的 `baseUrl` 解析 `@deepseek-ai/dsh-agent-preset/package.json` 来拼 `skills` 目录。官方预置的 `baseUrl` 位于 `app.asar` 内，而本插件在 profile 的 `node_modules/dsh-lead-mode/` 下加载，解析不到宿主包会直接抛错，因此该行去掉 config；代价是 `dsh-doc` 不在该预置的 filesystem skill 目录里。
- **0.2.2-rc.3 同步项**：`present` 后新增的 `tool-office` 行按官方只加在 `lead-ptc`；`tool-subagent-control` 的 `config.interrupt: false` 两个预置同步保留，因此 skill 中的硬打断动作全部写成有条件触发。
- **保持 classic subagent 启用**：`tool-subagent-control`、`tool-subagent`、`tool-subagent-fork` 保持启用（`list_agents` 已随 0.2.2 并入 `tool-subagent-control`），Team 工具本身始终由宿主运行时控制，不由预置决定。
