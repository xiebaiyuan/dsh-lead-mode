# Agent Teams 两代对照

[← 回到 README](../README.zh-CN.md)

Lead 模式靠 dsh 官方的 Team 运行时派活，本插件不带它。这套运行时在两代宿主上是两套 API，而且分代看工具清单、不看版本号。这一篇放三件事：两代的逐项差别、怎么判定自己属于哪一代、每一代该怎么开启。最后一节说明插件为什么不把运行时塞进预置。

## 两代 Agent Teams 定义

这套运行时在两代宿主上是两套 API：老一代停在已发布的 0.2.2-rc.1；新一代从 0.2.2-rc.3 起随 npm 发布，当前 `latest` 是 0.2.2-rc.5。

| 维度 | 老一代：宿主 0.2.2-rc.1 | 新一代：宿主 0.2.2-rc.3 起 |
|---|---|---|
| 定义在哪 | 桌面端 asar 内的 `@deepseek-ai/dsh-experimental-tool-agent-team@0.2.2-rc.1` | `packages/team/tool-agent-team` 与 `packages/subagent/*` |
| 建成员 | `spawn_teammate({ name, description, prompt, context })` | `subagent({ name?, description, prompt, cwd?, agent_preset?, provider?, model?, reasoning_effort? })`；要继承历史用 `subagent_fork` |
| 成员身份 | 持久命名的成员，带 `target` | Session id 加一个 agent 名；名字是从根算起的路径（如 `reviewer/checker`），根固定叫 `lead` |
| 发消息 | `send_message({ target, message })` | `send_message({ agent, message })`，返回 `{ messageId }` |
| 打断 | `interrupt_agent({ target })` | `interrupt_agent({ agent })`，返回 `{ accepted }`。新宿主默认关闭（`tool-subagent-control` 的 `interrupt: false`），要开才有 |
| 名册 | `list_agents({})` 列 Lead 加成员 | `list_agents({})` 列整棵树，每行 `{ name, status, description? }`，状态多了 `corrupt`、`unsupported`、`unavailable` |
| 等待语义 | team 作用域：等成员状态、消息、任务变更；没人能产出变更时立刻回 `noProgress` | 普通 subagent 控制工具：等调用者自己的下一条输入（成员消息、完成通知、用户插话），只回 `{ timedOut }`，没有 `noProgress` |
| 任务板 owner | `team_task_*` 四个工具，owner 填成员名 | 同样四个工具，owner 填成员名或 Session id；判据字段从 `ownerName` 变成 `ownerId` |
| 开启方式 | 装 profile 包 `@deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1` | 不要装这个包：它已进 `RETIRED_BUNDLES`，app-boot 会把 profile 里的它删掉。Team 插件随 base 与 web 组合下发，按会话开：模型与推理等级菜单里的「开启智能体团队协作」（旧宿主叫「使用智能体团队」） |
| 成员模型 | 继承 Lead，`spawn_teammate` 没有模型参数 | `subagent` 有 `provider`、`model`、`reasoning_effort`（本插件 preset 已开 `modelSelection`）；`agent_preset` 可指定预置 |
| 成员上限 | `agentTeams.config.maxMembers` | 配置键 `maxMembers` 已被拒绝，读不到上限 |

新一代删掉了 `spawn_teammate`；`wait_agent` 从 team 工具搬到 subagent 控制工具，语义换成「等自己的收件箱」。

## 怎么知道自己属于哪一代

不按版本号认，按工具清单认。

| 你看到的 | 属于 | 下一步 |
|---|---|---|
| 有 `spawn_teammate` | 老一代 | 装 profile 包，见下一节 |
| 没有 `spawn_teammate`，但有 `subagent` 和 `team_task_*` | 新一代 | 不用装，确认会话开关已开 |
| `team_task_*` 一个都没有 | Team 没开 | 先找会话开关；确认是老一代宿主没有这个开关，才去装包 |

顺序不能反。新一代宿主上让人去装 profile 包是错的：那个包会被 app-boot 移除，装了也白装。

## 老一代：装 profile 包

```bash
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

上面写的 `0.2.2-rc.1` 是当前宿主线，按你自己 `dsh --version` 的输出替换。

**必须带版本号，而且要和宿主版本一致。** 不带会装到 `latest` 上的 0.1.5-alpha.2，那是给 0.1.x 宿主用的，在 0.2.2 宿主上挂不上。`next` 指向的 0.2.2-rc.1 才是这条线现在对的版本，也是本插件文案里钉的那个。团队包把 `dsh-*` 的 peer 钉死到具体版本，老 rc 装到新宿主上，peer 对不上。装完重启 dsh。

不确定装没装？进 dsh 敲 `/lead-mode`，它会报依赖状态。

版本号为什么不能省，dist-tag 的实测输出在 [usage.md](usage.md) 的最后一节。

## 新一代：不要装 profile 包，开会话开关

新一代宿主上不要执行上面那条命令。`@deepseek-ai/dsh-experimental-agent-team-profile` 已进官方的 `RETIRED_BUNDLES`，app-boot 会把它从 profile 里删掉。Team 插件随 base 与 web 组合下发。

开法是按会话开：打开「模型与推理等级」菜单，把「开启智能体团队协作」开关打开，旧宿主这个开关叫「使用智能体团队」。这个开关是会话级的，不是 profile 级的。

## PTC 下怎么调这些工具

`lead-ptc` 预置是 PTC 形态，`lead-cordis` 是创造形态（工具能直调）。下面两条限制只对 `lead-ptc` 成立：

- 只有 `run_code` 能直调。`team_task_*`、`subagent`、`send_message`、`wait_agent` 都在 system prompt 的 SDK 块里，程序里写 `await tools.team_task_list({})` 这种。
- 不要用 `wait_agent` 等成员（本插件两个预置都不许）。一次 `run_code` 默认 120 秒、上限 600 秒；派完活结束回合，通知会回来。要催成员用 `send_message`。
- `team_task_list`、`team_task_get`、`list_agents` 是并发安全的读工具，程序里可以用 `Promise.all` 一起读。
- 新宿主默认没有 `interrupt_agent`（`interrupt: false`）。要打断成员，先让用户把它开成 `true`；没有就发消息要求成员停在安全点。

## 为什么预置里不塞 Team 运行时

`@deepseek-ai/dsh-experimental-tool-agent-team` 的 `apply()` 监听全局 `agent/created`，给每一个 agent 装 Team 工具。它是 host 平面的插件，放进预置会漏到所有会话。

所以本插件的定位是：预置 + 两个 skill + 提醒。开不开 Team 运行时：老一代宿主由用户装官方 profile 包决定，新一代由会话开关决定。
