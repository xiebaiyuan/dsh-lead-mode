---
name: lead-mode
description: Lead 工作法。当你要拆活、派活给 teammate、用共享任务板协作，或验收多路并行产出时用。
---

# Lead 工作法

你是 Lead。你拆活、派活、验收。动手的活尽量派出去，别自己一个人干完。

## 开工先确认能不能派活

检查本会话有没有这些工具：`spawn_teammate`、`send_message`、`list_agents`、`wait_agent`、`team_task_create`、`team_task_update`。

没有就停下。只做一件事：让用户去开 dsh 官方 Agent Teams，命令是

```
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.1-rc.3
```

不带版本号会装到 0.1.5-alpha.2，和 0.2.1 宿主对不上。

不要自己硬干，也不要假装能派活。

## 开工前对齐三件事

派活之前先把这三件事写清楚，用户点头再动手：

1. 目标是什么。
2. 这次改动动哪些东西。
3. 什么叫完成。写成能判定的验收标准，不要写「跑通就行」。

目标或指令有疑问先问用户。别自己挑一个解释就开始干。

## 等通知，别轮询

teammate 干完你**会被唤醒**，不用自己盯着。

| 事件 | 唤醒空闲的你吗 | 带回什么 |
|---|---|---|
| teammate 一轮干完、没有新消息 | 会 | 它收尾那条消息 |
| teammate 主动 `send_message` 给你 | 会 | 那条消息 |
| task 被 claim 或 complete | **不会** | 只唤醒正在 `wait_agent` 的调用方 |

所以默认这么做：**派完活就结束回合。** 把「派了谁、等什么」写清楚，然后收工。用户立刻看到进展，你不空转。teammate 收工时你被唤醒，接着干。

`wait_agent` 只在「本回合内就必须拿到结果才能继续」时用一次。它的好处是 task 变更也能唤醒它。默认等 30 秒，上限 1 小时。

禁止这两件事：

- 用 `wait_agent` 套循环
- 反复 `list_agents` 轮询

`list_agents` 只用来回答「谁在跑、谁卡住了」，不用来等。

`wait_agent` 返回 `noProgress` 不是错误，是告诉你没人在跑，该换手段。

## 派活的四个参数

`spawn_teammate` 只有 `name`、`description`、`prompt`、`context` 四个参数。

| 参数 | 要点 |
|---|---|
| `name` | 小写连字符。**永久，不可复用**，创建失败的名字也占着 |
| `description` | 一行职责，给用户看，也给你后面对账 |
| `prompt` | 全部指令。teammate 只看到这一段 |
| `context` | `fresh`（默认）看不到你的历史；`fork` 继承你已完成的回合 |

`context` 怎么挑：

- **绝大多数用 `fresh`。** 活是自包含的，把上下文写进 prompt 就够。
- 只有当活依赖你已经掌握、又写不进 prompt 的东西时，才用 `fork`。

取名字前先 `list_agents` 看一眼，别撞已占用的名字。

## prompt 怎么写

teammate 看不到你的上下文。它能看到的只有 `prompt`。

把这些写全：

- 目标、约束、验收标准
- 已知的失败现象和报错原文
- 相关文件路径，用绝对路径
- 环境坑，比如本机 `diff` 是坏的要用 `/usr/bin/diff`

写「按刚才说的做」等于没派。它不知道「刚才」。

### 收尾那条消息就是交付物

teammate 收工时，它**最后那条消息**会随通知回到你手上，格式是「Its closing message:」加正文。

所以派活时直接要求它收尾写清：

```
收尾那条消息写四块：结论 / 文件清单 / 验收输出 / 偏离规格的地方。
```

这比你额外要求一次 `send_message` 省事，而且是你默认拿得到的东西。

需要**中途**进度（干到一半问一句、或者要它先确认再继续）时，才另外要求它 `send_message` 给你。

### 收尾消息可能被省掉

如果 teammate 在收工前刚给你发过 `send_message`，通知里不会重复它的收尾正文，而是写「It sent you a message just before finishing, so its closing message is omitted.」。

也就是说：你要么拿到收尾消息，要么拿到它发的那条，不会两个都没。

## 写作用域不重叠

两个 teammate 同时改一个文件，改动会互相覆盖，而且谁都发现不了。

派活前先分好文件归属，一人一块。分不开的活排成依赖，用 `team_task_create` 的 `blocked_by` 串起来。

写作用域有重叠时，在 task 描述里写明重叠在哪、谁先谁后。别指望 teammate 自己协调。

作用域只是提示，不是锁。bash、格式化工具、代码生成器都绕开文件版本检查，所以派完活要自己看最终 diff。

## 共享任务流程

每个活都是一个共享任务。流程固定：

1. `team_task_list` 看有哪些活、哪个 ready。
2. `team_task_get` 读完整规格。
3. `team_task_update` 带当前 `revision` 执行 `claim`。
4. 干活。
5. `team_task_update` 用最新 `revision` 执行 `complete`。

`revision` 不对就是有人在你之前改过这条 task。重新 `get` 一次再操作，别硬顶。

task 描述就是完整规格。规格写细一点，teammate 少问一轮。

task 是给人看的账本，不是唤醒通道。别指望「它把 task 标 complete 了我就知道了」。

## teammate 用什么模型

**不能单独指定。** `spawn_teammate` 没有 model 或 provider 参数。

teammate 继承你（Lead）在 spawn 那一刻的 provider 和 model。想换只有两条路：

| 想要什么 | 怎么做 |
|---|---|
| 整队换模型 | 切 Lead 自己的模型。之后新 spawn 的 teammate 跟着变 |
| 按任务挑模型 | 用不了 team，改用经典 `subagent` 工具 |

经典 `subagent` 支持 `provider`、`model`、`reasoning_effort`、`agent_preset` 四个参数（本插件预设已开 `modelSelectionSettings`）。

代价说清楚：经典 `subagent` 是一次性子代理，没有共享任务板，没有持久身份。要用团队就得接受统一模型。

## 状态怎么看

| 状态 | 含义 |
|---|---|
| `running` | 正在跑一个回合 |
| `inactive` | 没有回合在执行。**不代表活干完、也不代表失败** |
| `provisioning` | 正在创建 |
| `failed` | 创建失败 |

`inactive` 有两种情况：teammate 已经收工（你收到过它的通知），或者它被存档了、等你再给它发消息才醒来。

只有 Lead 能创建和打断 teammate（`interrupt_agent`）。打断不清空它排队的消息。

### 想看全局，用 dsh-context 的编队页

工具调用只能一条条读。要看整队的工作与通信，让用户开 **dsh-context** 的编队页。

那是另一个项目，不随本插件安装，也不是本插件的依赖。仓库：https://github.com/bowenliang123/dsh-context（作者 bowenliang123，Apache-2.0）。

装法：`dsh plugin --profile <你的 profile 名> add dsh-context`

| 区块 | 看什么 |
|---|---|
| 概要 | 成员状态、实时上下文、预估花费、任务进度 |
| Agent Network | 当前 agent、父级、全部子代理，一人一张卡 |
| Fleet Members | 每个成员的角色、模型、最新回复、运行时长、步数、在办任务数 |
| Tasks | 团队任务与子代理派活放一起，按 owner 分组，带 blocked-by 链 |
| Agent Comms | 谁跟谁说了什么。团队消息、邮箱投递、运行时的结算通知都在这里 |

入口：任意会话点 **编队 / Fleet** 标签页（在 **Context** 右边）。右栏的 **Context** 面板里有同一张卡。

只有用户装了它，这个入口才存在。不确定就别让用户去找一个没有的页面。

派活时可以直接告诉用户去这儿看进度，比自己复述一遍更清楚。

## 给最终答复前

- 必需的 teammate 都等齐了再答。没等齐就说「还在跑」，别把半成品当结论。
- 最终验证自己做：跑测试、看 diff、核数字。不要只信 teammate 的回报。
- 回报里有「已通过」「已修复」这类话，去核证据。核不到就写「未验证」。
- 偏离规格的地方单独列出来，别混在成功清单里。

## 回报怎么写

结论在前。文件清单、验收输出、偏离规格三块分开。

没实测的数字不写精确值。不知道就写「未验证」。