# Agent Teams 两代对照

[← 返回 README](../README.zh-CN.md) · [English](en/agent-teams.md)

Lead 模式依靠 DSH 官方的 Team 运行时派活，本插件不内置运行时。这套运行时在两代宿主上是两套 API，判断属于哪一代看会话工具清单，不看版本号。下面对照两代差异、判定方法、各自开启步骤、PTC 调用注意，以及并行派活边界。

## 两代 Agent Teams 对比

老一代运行时止步于 `0.2.2-rc.1`；新一代从 `0.2.2-rc.3` 起随主包下发（如 `0.2.2-rc.5`）。

| 维度 | 老一代（宿主 `<= 0.2.2-rc.1`） | 新一代（宿主 `>= 0.2.2-rc.3`） |
|---|---|---|
| 实现位置 | 桌面端 asar 内的 `@deepseek-ai/dsh-experimental-tool-agent-team@0.2.2-rc.1` | `packages/team/tool-agent-team` 与 `packages/subagent/*` |
| 创建成员 | `spawn_teammate({ name, description, prompt, context })` | `subagent({ name?, description, prompt, cwd?, agent_preset?, provider?, model?, reasoning_effort? })`；继承历史用 `subagent_fork` |
| 成员身份 | 持久命名的成员，使用 `target` 寻址 | Session id + 从根算起的 agent 路径（如 `reviewer/checker`），根固定为 `lead` |
| 发消息 | `send_message({ target, message })` | `send_message({ agent, message })`，返回 `{ messageId }` |
| 打断 | `interrupt_agent({ target })` | `interrupt_agent({ agent })`，返回 `{ accepted }`。新宿主默认关闭（`interrupt: false`） |
| 名册 | `list_agents({})` 列出 Lead 与成员 | `list_agents({})` 列出整棵树，每行 `{ name, status, description? }`，状态新增 `corrupt`、`unsupported`、`unavailable` |
| 等待语义 | team 作用域：等成员状态、消息或任务变更；无人推进时立刻返回 `noProgress` | subagent 控制工具：只等调用者自己的收件箱（成员消息、完成通知、用户插话），只返回 `{ timedOut }`，无 `noProgress` |
| 任务板 owner | `team_task_*` 四个工具，owner 填成员名 | 同一组四个工具，owner 可填成员名或 Session id；判定字段由 `ownerName` 变为 `ownerId` |
| 开启方式 | 安装 `@deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1` | **不要装 profile 包**（已入 `RETIRED_BUNDLES`，启动时会被自动删除）。按会话在「模型与推理等级」菜单开启「开启智能体团队协作」（旧版叫「使用智能体团队」） |
| 成员模型 | 继承 Lead，`spawn_teammate` 无模型参数 | `subagent` 支持 `provider`、`model`、`reasoning_effort`（本插件已开 `modelSelection`）及 `agent_preset` |
| 成员上限 | 读自 `agentTeams.config.maxMembers` | 配置键 `maxMembers` 已被拒绝，读不到上限 |

新一代移除 `spawn_teammate`，并把 `wait_agent` 移出 team 工具组、改为只等待当前调用者自己的收件箱。

## 如何判断当前属于哪一代

按工具清单判定，不按版本号硬猜：

| 会话工具清单现象 | 判定结果 | 下一步动作 |
|---|---|---|
| 存在 `spawn_teammate` | 老一代 | 确认已按宿主版本安装 profile 包 |
| 无 `spawn_teammate`，但同时有 `subagent` 与 `team_task_*` | 新一代 | 无需装包，确认会话级 Team 开关已开启 |
| 没有任何 `team_task_*` | Team 未开启 | 先找会话级开关；确认为无开关的老宿主再去装包 |

顺序不能倒置。在新宿主上安装已退役的 profile 包会被 app-boot 自动清理，装了也无效。

## 老一代开启方式：安装 profile 包

```bash
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

其中 `0.2.2-rc.1` 是老一代最后发布的宿主线，请按你本机 `dsh --version` 的输出替换版本号。**必须带版本号且与宿主一致**：不带会装到 `latest`（`0.1.5-alpha.2`），在 0.2.2 宿主上无法挂载；装完需重启 DSH，并用 `/lead-mode` 确认。

dist-tag 实测记录见 [usage.md](usage.md) 最后一节。

## 新一代开启方式：打开会话开关

新一代宿主不要运行上面的安装命令（`@deepseek-ai/dsh-experimental-agent-team-profile` 已进 `RETIRED_BUNDLES`）。Team 插件已随 base 与 web 组合下发。

打开会话的**「模型与推理等级」**菜单，开启**「开启智能体团队协作」**（较早版本叫「使用智能体团队」）。这是一个会话级开关，不是 profile 级配置。

## PTC 下如何调用这些工具

`lead-ptc` 走 PTC 执行，而 `lead-cordis` 是 native 直调。使用差异如下：

- **仅 `lead-ptc`**：只有 `run_code` 能直接调用；`team_task_*`、`subagent`、`send_message`、`wait_agent` 都在 TypeScript 沙箱里以 `await tools.team_task_list({})` 形式调用。
- **仅 `lead-ptc`**：`team_task_list`、`team_task_get`、`list_agents` 已标记并发安全，程序内可用 `Promise.all` 并发读取。
- **两个预置通用**：严禁使用 `wait_agent` 等成员（会阻塞并白耗 `run_code` 默认 120 秒 / 上限 600 秒预算）；派完活立刻结束回合等通知，催办用 `send_message`。
- **两个预置通用**：新宿主默认禁用 `interrupt_agent`（`interrupt: false`）。需要硬打断时请用户先开启配置；未开启时改为发消息让成员停在安全点。

## 为什么预置不直接内嵌 Team 运行时

`@deepseek-ai/dsh-experimental-tool-agent-team` 的 `apply()` 监听全局 `agent/created` 并为所有 agent 挂载工具，属于宿主级插件；放进单个预置会导致宿主与预置双挂冲突。因此本插件只交付预置、skill 与检查提醒，Team 运行时由宿主开关或用户装包决定。

## 哪些活能并行派

默认优先并行，但必须严格遵守先后裁决顺序：先按 [skills/lead-mode/SKILL.md](../skills/lead-mode/SKILL.md) §12 对任务判级，只允许**主目标**与**阻塞主目标的支撑**进入并行队列；**枝节**即使文件写作用域完全不重叠，也不进并行队列，直接记入遗留清单。

进入队列的任务，满足以下两条判据就该一次全部派完：

1. **无产出依赖**：后一块不需要读取前一块的结果（若前一块结论变化，后一块会白干，就必须串行）。
2. **写作用域不重叠**：按文件或目录严格隔离，不能两人同时写同一份文件或抢同一份可变状态。

仓库内常见可并行与禁止并行的划分方式：

| 类型 | 拆分原则 | 示例 |
|---|---|---|
| 只读查证 | 同一问题从不同视角拆分 | 一人读 `skills/` 规矩，一人查 `docs/` 口径，一人查外部资料 |
| 盘点扫描 | 按目录或维度切分 | 一人数术语一致性，一人核对测试覆盖 |
| 独立验收 | 交付一块即可立即开验（不占写作用域） | 文档先交付就先跑测试与 diff，不必等其他实现全部收尾 |
| 无冲突实现 | 不同目录或独立模块各派一人 | 一人改 `docs/`，一人改 `skills/`，一人补 `test/` |

必须避开的三类并行禁忌：

- 后一块依赖前一块的产出：用 `blocked_by` 明确前后顺序。
- 两人同改一个文件：后写会静默覆盖先写。
- 争抢可变共享状态：例如两个成员同时跑 `git commit` 争抢 `.git/index.lock`、共用同一临时 profile 或同一监听端口。

派单执行要点：

- 每次派单不设人为数量上限，仅受当前会话成员上限约束（老宿主可通过 `/lead-mode` 查看 `maxMembers`，新宿主无此字段）。
- 每张派单写明四项：**级别与服务判据 `#k`、成员名、写作用域、具体验收判据**。
- 派完立刻结束回合等运行时结算通知；不要派一个等一个。
- 使用 `blocked_by` 只串起真正有依赖的任务，其余任务同时派出。
- 醒来先核对主目标 `#1..#M` 进度，不被先返回的枝节带偏；属于主目标或阻塞支撑的块随到随处理，不必等全队凑齐。

注：上文 `Promise.all` 讲的是只读工具在一次 `run_code` 中的并发查询，与向多个成员并行派活属于不同层面。
