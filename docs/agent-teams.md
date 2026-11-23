# Agent Teams 两代对照

[← 回到 README](../README.zh-CN.md)

Lead 模式靠 dsh 官方的 Team 运行时派活，本插件不带它。这套运行时在两代宿主（跑 dsh 的那个程序）上是两套 API。判定属于哪一代，看工具清单，不看版本号。这一篇讲这几件事：两代有哪些差别、怎么判断自己属于哪一代、每一代怎么开。倒数第二节说明插件为什么不把运行时塞进预置，最后一节讲哪些活能并行派。

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

新一代删掉了 `spawn_teammate`。`wait_agent` 从 team 工具搬到 subagent 控制工具，语义换成「等自己的收件箱」。

## 怎么知道自己属于哪一代

不按版本号认，按工具清单认。

| 你看到的 | 属于 | 下一步 |
|---|---|---|
| 有 `spawn_teammate` | 老一代 | 装 profile 包，见下一节 |
| 没有 `spawn_teammate`，但有 `subagent` 和 `team_task_*` | 新一代 | 不用装，确认会话开关已开 |
| `team_task_*` 一个都没有 | Team 没开 | 先找会话开关；确认是老一代宿主没有这个开关，才去装包 |

顺序不能反。新一代宿主上不能让人去装 profile 包：那个包会被 app-boot 移除，装了也白装。

## 老一代：装 profile 包

```bash
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

上面写的 `0.2.2-rc.1` 是当前宿主线，按你自己 `dsh --version` 的输出替换。

**必须带版本号，而且要和宿主版本一致。** 不带会装到 `latest` 上的 0.1.5-alpha.2，那是给 0.1.x 宿主用的，在 0.2.2 宿主上用不了。`next` 指向的 0.2.2-rc.1 才是这条线现在对的版本，也是本插件文案里钉的那个。团队包把 `dsh-*` 的 peer 钉死到具体版本，老 rc 装到新宿主上，peer 对不上。装完重启 dsh。

不确定装没装？进 dsh 敲 `/lead-mode`，它会报依赖状态。

版本号为什么不能省，dist-tag 的实测输出在 [usage.md](usage.md) 的最后一节。

## 新一代：不要装 profile 包，开会话开关

新一代宿主上不要执行上面那条命令。`@deepseek-ai/dsh-experimental-agent-team-profile` 已进官方的 `RETIRED_BUNDLES`，app-boot 会把它从 profile 里删掉。Team 插件随 base 与 web 组合下发。

开法是按会话开：打开「模型与推理等级」菜单，把「开启智能体团队协作」开关打开，旧宿主这个开关叫「使用智能体团队」。这个开关是会话级的，不是 profile 级的。

## PTC 下怎么调这些工具

`lead-ptc` 预置是 PTC（只能直调 `run_code`），`lead-cordis` 是 native（工具能直调）。下面四条注意：第 1、3 条只对 `lead-ptc` 成立，第 2、4 条两个预置一样。

- 只有 `run_code` 能直调。`team_task_*`、`subagent`、`send_message`、`wait_agent` 都在 system prompt 的 SDK 块里，程序里写 `await tools.team_task_list({})` 这种。
- 不要用 `wait_agent` 等成员（本插件两个预置都不许）。一次 `run_code` 默认 120 秒、上限 600 秒；派完活结束回合，通知会回来。要催成员用 `send_message`。
- `team_task_list`、`team_task_get`、`list_agents` 是并发安全的读工具，程序里可以用 `Promise.all` 一起读。
- 新宿主默认没有 `interrupt_agent`（`interrupt: false`）。要打断成员，先让用户把它开成 `true`；没有就发消息要求成员停在安全点。

## 为什么预置里不塞 Team 运行时

`@deepseek-ai/dsh-experimental-tool-agent-team` 的 `apply()` 监听全局 `agent/created`，给每个 agent 都装上 Team 工具。它是宿主级插件，放进预置会漏到所有会话。

所以本插件的定位是：预置 + 两个 skill + 提醒。开不开 Team 运行时：老一代宿主由用户装官方 profile 包决定，新一代由会话开关决定。

## 哪些活能并行派

默认是并行。串行不是更安全的选择，只是把整件活拖长。下面两条都满足，就一次全派完；是「就该」，不是「可以」。

- **判据一：后一块不需要读前一块的产出。** 自查问法：前一块的结论一变，后一块的活是不是就白干了？是，就有依赖，得串起来。
- **判据二：写作用域不重叠。** 按文件或目录分，不按时间错开。两个成员同一时刻改同一个文件，改动会互相覆盖，错开时间也救不了。

两条都满足还分批派，那是白等。

这个仓库里天然能并行的四类：

| 类型 | 怎么切 | 例 |
|---|---|---|
| 只读查证 | 同一个问题从几个角度各派一人 | 一人查 `skills/lead-mode/SKILL.md` 正文，一人查 `docs/` 里的口径，一人查外部资料 |
| 盘点或扫描 | 多个目录、多个维度分开数 | 一人数术语出现次数，一人数测试覆盖点 |
| 独立验收 | 一块交付就验一块，不必攒到全部做完 | 文档那摊先回来，就先验它那份：`pnpm test` 加 `git diff --stat docs/` |
| 互不重叠的实现 | 不同文件、不同模块、不同 skill 各派一人 | 一人改 `docs/`，一人改 `skills/`，一人改 `test/` |

只读验收不占写作用域：一块交付就开验，别的实现还在跑也不用等。

不能并行的三类，是硬约束不是建议：

- 后一块要读前一块的产出。用 `blocked_by` 串起来。
- 两个人同时改同一个文件。后写的把先写的盖掉，还不报错。
- 抢同一份可变状态：git index（两边同时 commit 会抢 `.git/index.lock`，后到的那次直接报错）、同一个临时 profile、同一个端口。真要并行就各用各的副本，别抢。

怎么派：

- 一次派几个不设数字上限，唯一的硬顶是成员上限。老一代宿主上 `/lead-mode` 报 `maxMembers`；新一代读不到，就别提数字。
- 每一块写清三样：**名字、写作用域、判据**。缺一样，成员就自己去猜边界，猜偏了还得返工。
- 派完**立刻结束回合**等运行时通知。派一个盯着一个等，本身就是串行。
- `blocked_by` 只处理「必须串」的那部分：把要等前一块的活挂成它的后继，别的照样一起派。
- 收回来时几个成员的结论分开讲，哪个先回来先处理，不必凑齐才动手。

前面「PTC 下怎么调这些工具」那节说 `team_task_list`、`team_task_get`、`list_agents` 可以用 `Promise.all` 一起读。那讲的是读工具能不能并发调用，和派活要不要并行是两件事。
