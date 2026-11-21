# 设计取舍

[← 回到 README](../README.zh-CN.md)

本插件不改 dsh 本体，只在旁边加一层工作方法。下面三条是这一定位的具体动作，可以逐条核对。最后一节讲它和官方 `ptc`、`cordis` 两个预置的实际差别。为什么要有这个插件、边界在哪，看 [why.md](why.md)。

## 怎么做到不干扰官方

只新增，不修改。`cordis.patch.yml` 全文只有三行 `insert`：一行本插件，两行新建预置 `lead-ptc` 与 `lead-cordis`。官方预置一个字没动，两个新预置分别逐字段照抄官方 `ptc` 与 `cordis`，只换 persona。

不注册任何工具，不监听 agent 生命周期，不拦截任何请求。`lib/index.js` 只往两个注册表写：`skills`（两个 skill）与 `commands`（一个命令）；启动时另打一条 warn。卸载后这些条目全部消失，官方行为回到原样。

唯一可能撞的地方是同名 skill 或命令。你已经装了 `lead-mode` 或 `team-digest` 时，宿主按先到先得处理，打一条 warn，忽略本插件那条。撞了也是本插件让位。

## 与官方预置的差异

Lead 只换工作方法，不改工具能力，所以两个预置各照抄一个官方预置：

| 预置 | 行数 | 基线 | 与基线的差异 |
|---|---|---|---|
| `lead-ptc` | 24 | `ptc` | 只有 persona |
| `lead-cordis` | 23 | `cordis`（创造） | persona；`skill-filesystem` 不带 `customSkillDirs` |

两个预置的 persona 逐字相同，448 字，分六段：判断、派活，了解现状与验收都派成员做，结论由自己判断并讲给用户；标准要严、判据要具体、不将就，退回返工不自己补位；加载 `lead-mode` skill（控制面工具自己调、业务面派成员，从零还是继承、挑模型、任务板、写作用域，验收、难度升级也在里面）；派活前先用 `list_subagent_models` 从清单挑 provider/model（清单只有一条，说明没有授权别的模型）；先看 Team 开没开，没开就停手；派完活结束回合，不调 `wait_agent`，等通知不轮询；要求成员第一步建工作日志。字数上限 479（到 480 才报错），放宽是为了留余量。官方 persona 只有一句英文：`You are a coding agent powered by the {{model}} model.`。

`lead-ptc` 照抄 `ptc` 相对 `standard` 的四处差异：新增 `tool-executor-ptc`，禁用 `workflow-ptc` 和 `tool-workflow`，`tool-plugin-manager` 直接禁用。结果这个预置里只有 `run_code` 能直调，其他工具都在程序里用 `tools.xxx()` 调，没有 workflow 工具。

`lead-cordis` 照抄 `cordis` 的形状：带 `tool-cordis` 和 `planning` 分组，工具能直调；`ptc` 侧的 `tool-executor-ptc` 与 `tool-office` 本来就不在这条线上，workflow 两行仍然启用。

只有一处和官方不同。`cordis` 的 `skill-filesystem` 行带 `customSkillDirs`，值是一条 `!!js` 表达式，按 patch 文件自己的 `baseUrl` 解析 `@deepseek-ai/dsh-agent-preset/package.json` 再拼 `skills`。官方预置的 `baseUrl` 在 app.asar 里；本插件的 `baseUrl` 是 profile 的 `node_modules/dsh-lead-mode/`，那里没有那个包，照抄会在加载时抛错。所以 `lead-cordis` 这一行不带 config。代价是 `dsh-doc` skill 不在这个预置的文件系统 skill 目录里。

0.2.2-rc.3 的两处新增同批照抄，但落点不同：`present` 之后加 `tool-office` 行只在 `lead-ptc`（ptc 侧原本就有这行）；`tool-subagent-control` 加 `config.interrupt: false` 两个预置都有。后者让 `interrupt_agent` 默认不出现，skill 里所有打断写法都改成有条件执行。

classic subagent 三行（`tool-subagent-control`、`tool-subagent`、`tool-subagent-fork`）保持启用，没有禁用。`list_agents` 现在由 `tool-subagent-control` 自己注册，不再单列一行。Team 工具由 host 决定，不由预置决定。
