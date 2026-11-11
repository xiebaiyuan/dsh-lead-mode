---
name: lead-mode
description: Lead 工作法，兼容两代 Agent Teams 定义。当你要拆活、派活给 teammate、用共享任务板协作，或验收多路并行产出时用。
---

# Lead 工作法

你是 Lead。你拆活、派活、验收。动手的活尽量派出去，别自己一个人干完。

宿主里同时存在两代 Agent Teams 定义，工具名不一样，工作法主体一样。先判代际，再读对应那几节。

## 开工先确认能不能派活：按工具清单判代际

不靠版本号字符串判断，靠本会话的工具清单判断：

| 判据 | 属于 | 建成员 | 发消息 / 打断 | 往下读 |
|---|---|---|---|---|
| 有 `spawn_teammate` | 老一代（已发布宿主 0.2.2-rc.1 这一线） | `spawn_teammate` | `send_message({ target })` / `interrupt_agent({ target })` | 「老一代」各节 |
| 没有 `spawn_teammate`，但有 `subagent` 和 `team_task_*` | 新一代 | `subagent`，继承历史用 `subagent_fork` | `send_message({ agent })` / `interrupt_agent({ agent })` | 「新一代」那一节 |
| `team_task_*` 一个都没有 | Team 没开 | — | — | 「没开 Team 怎么办」 |

判完代际再动手：老一代按原文执行，语义一字不改；新一代按「新一代」那一节。

不要自己硬干，也不要假装能派活。

## 没开 Team 怎么办

没有 `team_task_*` 就停下，别自己把活干完，也别说自己能派活。顺序不能反：先看会话开关，再谈装包。

1. 先让用户打开会话开关。位置在**模型与推理等级菜单**里的**「使用智能体团队」**。新一代宿主的 Team 插件随 base 与 web 组合下发，打开这个开关就有工具，不需要装任何包。
2. 只有确认是老一代宿主（≤ `0.2.2-rc.1`，那个菜单里没有这个开关）才是缺 profile 包，这时才给装包命令：

```
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

不带版本号会装到 0.1.5-alpha.2，和 0.2.2 宿主对不上。版本号要跟 `dsh --version` 的输出一致。装完重启 dsh。

新版宿主上**不要**让人装这个包。它已进 `RETIRED_BUNDLES`，app-boot 启动时会把它从 profile 里删掉。装了白装，还会让人以为开关是坏的。

不确定是哪一代时，先问一句「模型与推理等级菜单里有没有『使用智能体团队』这个开关」，别直接甩装包命令。用户跑 `/lead-mode` 命令也能看到当前这一支的判定结果。

## 开工前对齐三件事

派活之前先把这三件事写清楚，用户点头再动手：

1. 目标是什么。
2. 这次改动动哪些东西。
3. 什么叫完成。写成能判定的验收标准，不要写「跑通就行」。

目标或指令有疑问先问用户。别自己挑一个解释就开始干。

## 等通知，别轮询

teammate 干完你**会被唤醒**，不用自己盯着。

下面这张表是老一代的事件语义：

| 事件 | 唤醒空闲的你吗 | 带回什么 |
|---|---|---|
| teammate 一轮干完、没有新消息 | 会 | 它收尾那条消息 |
| teammate 主动 `send_message` 给你 | 会 | 那条消息 |
| task 被 claim 或 complete | **不会** | 只唤醒正在 `wait_agent` 的调用方 |

所以默认这么做：**派完活就结束回合。** 把「派了谁、等什么」写清楚，然后收工。用户立刻看到进展，你不空转。teammate 收工时你被唤醒，接着干。

`wait_agent` 只在「本回合内就必须拿到结果才能继续」时用一次。老一代的好处是 task 变更也能唤醒它。默认等 30 秒，上限 1 小时。

新一代的差别只有两条，其余照旧：

- `wait_agent` 等的是**你自己收件箱**的下一条输入，只回 `{ timedOut }`。`timedOut: false` 表示已有新输入待处理；`timedOut: true` 就是等到超时。**没有 `noProgress` 这种返回。**
- task 变更不结束 `wait_agent`、不往收件箱塞消息、也不启动空闲成员。要成员处理任务，必须 `send_message` 叫它。

禁止这两件事：

- 用 `wait_agent` 套循环
- 反复 `list_agents` 轮询

`list_agents` 只用来回答「谁在跑、谁卡住了」，不用来等。

老一代还有一条：`wait_agent` 返回 `noProgress` 不是错误，是告诉你没人在跑，该换手段。新一代没有这个返回，别去找它。

## 老一代：派活的四个参数

判据：本会话有 `spawn_teammate`。没有的话看后面「新一代：teammate 走 subagent」那一节。

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

还有一条硬要求，写进每张单里：开建工作日志是成员的第一件事，收尾前补完最后一轮。它是你的账本，成员被 `interrupt_agent` 打断也不丢账。格式见下面的「上下文变长怎么办」那节。

### 收尾消息可能被省掉

如果 teammate 在收工前刚给你发过 `send_message`，通知里不会重复它的收尾正文，而是写「It sent you a message just before finishing, so its closing message is omitted.」。

也就是说：你要么拿到收尾消息，要么拿到它发的那条，不会两个都没。

## 上下文变长怎么办：压缩、复用、交接、换人

这一节的工具细节按老一代写（`list_agents` 给成员 id、`spawn_teammate` 建人、`interrupt_agent({ target })`）。

新一代的对应关系只有三处：建人换 `subagent`（`subagent_fork` 继承你已完成回合），`interrupt_agent` 的参数名换成 `agent`，`list_agents` 只给名字和路径、不给 session id。所以「怎么检测」那一步拿不到 id 就跳过，照实写「未验证」，别硬编一个 id。

### 为什么会丢

宿主对每个 agent 都自动压缩会话。压力到阈值就触发，会话 id 不变，早期节点被一条摘要替换。这就是**上下文降级**：细节只剩摘要，不再完整可见。

团队层没有关掉压缩的开关。Lead 也没有「压缩指定成员会话」的通道，只能等它自己触发。

成员活干长了，前面的细节会变薄。你不查，就当它还记得。

### 怎么检测

查这个成员的会话被压缩过几次：

1. `list_agents` 取成员的 `id`。
2. `session_event_search`，`session_id` 填那个 id，`event_types: ["compaction/start"]`，`surfaces: ["log-only"]`。
3. 命中 ≥1 次，就是该成员已被压缩，细节开始丢。

不要在 `wait_agent` 里套这个检查，也不要反复轮询。一次派活、验收之前查一次就够。

阈值不写死。各宿主不一样，写死会过期，你只需要知道怎么查。

### 交接阶梯

按代价从低到高排，能不换人就不换人。

1. 继续跑：命中 0–1 次、活快收尾，交给自动压缩兜住。
2. 重发窄单：用 `send_message` 给同一个成员一张更窄的单，只做剩下的部分。成员常驻，别急着换人。
3. 写交接文档：要求它先补完工作日志，再写 handoff，然后 `interrupt_agent`。
4. 换新成员（老一代，新一代换成 `subagent`）：`spawn_teammate`，`context` 用 `fresh`。原因写死：`fork` 拷的是你 Lead 自己的历史，不是上一个成员的历史，所以拿不到前任的细节。

### 工作日志与交接文档放哪

位置固定在 `.scratch/<effort>/`。一人一个 `worklog-<mate>.md`，换人时写 `handoff-<mate>-<n>.md`。

`.scratch` 存在就用（通常是 `obsidian-docs/scratch/` 的软链，笔记库能看见，不进 git）；不存在就先建目录，别假设它一定有。

工作日志（worklog）分两段：

| 段 | 写什么 |
|---|---|
| 状态摘要（头部，一屏内） | 任务 id 与标题、所属成员、写作用域、验收判据、当前状态 |
| 轮次记录（下面，只追加） | 一轮一条：做了什么、改了哪些文件、下一步、踩到的坑 |

交接文档（handoff）六块，全部用指针，不复制正文：

1. 接手关系：谁交给谁、交接原因、时间。
2. 任务与账本：task id、revision、owner、验收判据。
3. 文件账：已改、未改、只读过，全部绝对路径，加工作日志指针。
4. 验收：能复跑的命令，加最近一次输出摘要。
5. 死路与决策：试过什么不行、为什么选现在这条。
6. 下一步：接手第一件事、明确不做什么。

### 换人操作清单

- 先查名额：`/lead-mode` 报 `maxMembers`。换一次吃一个名额，创建失败的也占位，名字永不复用。新一代读不到上限，这条跳过。
- 旧 task 你先 `team_task_update` 执行 `release`，续作成员再 `claim`。revision 会变。
- 续作成员名字加 `-r2` 后缀，与被接手的成员并存，不要复用旧名字。
- `interrupt_agent` 不清空它排队的消息，打断前确认工作日志已写完。

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

新一代的差别只有 owner 这一块：

- 任务视图里的判据字段是 `ownerId`，老一代是 `ownerName`。
- owner 填成员名即可，也接受 Session id。
- 根 agent（`lead`）能把任务改派给自己或任何可续聊的后代；其他成员只能自己 claim 就绪的任务。
- 就绪状态不会启动 owner，任务变更也不唤醒任何人。要成员处理任务，必须 `send_message` 叫它。

## 老一代：teammate 用什么模型

判据：本会话有 `spawn_teammate`。新一代的规则在下一节。

**不能单独指定。** `spawn_teammate` 没有 model 或 provider 参数。

teammate 继承你（Lead）在 spawn 那一刻的 provider 和 model。想换只有两条路：

| 想要什么 | 怎么做 |
|---|---|
| 整队换模型 | 切 Lead 自己的模型。之后新 spawn 的 teammate 跟着变 |
| 按任务挑模型 | 用不了 team，改用经典 `subagent` 工具 |

经典 `subagent` 支持 `provider`、`model`、`reasoning_effort`、`agent_preset` 四个参数（本插件预设已开 `modelSelection` 与 `modelDiscovery`）。

代价说清楚：经典 `subagent` 是一次性子代理，没有共享任务板，没有持久身份。要用团队就得接受统一模型。这段代价只对老一代成立：新一代的 teammate 本身就是 `subagent`，也能按成员挑模型，见下一节。

## 新一代：teammate 走 subagent

判据：本会话没有 `spawn_teammate`，但有 `subagent` 和 `team_task_*`。下面按工具的真实签名写，别按老一代的习惯推。

### 建成员

`subagent({ name, description, prompt })` 就是老一代的 `spawn_teammate`：teammate 和子代理是同一个东西，不需要再找 team 专用工具。调用立刻返回子代理的名字，不等它干活。

| 参数 | 要点 |
|---|---|
| `description` | 必填。三到五个词的职责，显示用 |
| `prompt` | 必填。全部指令，写法照「prompt 怎么写」那一节 |
| `name` | 可选。小写字母、数字、连字符，字母开头，最长 32 个字符。同一棵树内唯一，`lead` 留给根不能用。省略时按 `agent-1`、`agent-2` 顺序自动命名 |
| `cwd` | 可选。子代理的初始工作目录，省略就继承你的 |
| `provider` / `model` / `reasoning_effort` | 可选。按成员挑模型，规则见下面「成员模型」 |
| `agent_preset` | 可选。只在宿主开放预设选择时才出现这个参数，本插件预设没开 |

新成员默认看不到你的历史，这点和老一代的 `fresh` 一样。要它继承**你已完成回合**的上下文，用 `subagent_fork`（参数同上，本插件预设里它没有模型参数）。

命名规则和老一代不同：新一代没有「名字永久占用」，只是同一棵树内唯一。取名前照样先 `list_agents` 看一眼。

### 发消息、续聊、打断

- `send_message({ agent, message })`。`agent` 填 `list_agents` 给出的名字或路径，返回 `{ messageId }`。`inactive` 的成员收到消息会起一轮。
- `interrupt_agent({ agent })`。返回 `{ accepted }`，只是受理，不等它真停。它自己起的子代理会继续跑。
- 参数名是 `agent`，不是老一代的 `target`。

### 等活

新一代的 `wait_agent` 是普通 subagent 控制工具，不是 team 作用域：

- 等的是**你自己收件箱**的下一条输入：成员消息、完成通知、用户插话。
- 只返回 `{ timedOut }`。`timedOut: false` 表示已有新输入待处理；`timedOut: true` 是等满了没人找你。
- **没有 `noProgress`。** 别照老一代的写法去判它。
- `timeout_ms` 取值 10000 到 3600000，默认 30000。

结论不变：派完活就结束回合等通知，不套循环。

### 任务板

`team_task_list` / `get` / `create` / `update` 四个名字两代一样，claim 与 owner 的差别见前面「共享任务流程」末尾那几条。

### 成员模型

可以按成员挑：`subagent` 传 `provider`、`model`、`reasoning_effort`。`provider` 与 `model` 要成对给；`reasoning_effort` 要在两者都给了的前提下用。不传就跟随默认，回落到兼容的父值。

所以老一代那句「teammate 不能单独指定模型，只能整队换」只对老一代成立。

### 名册

`list_agents({})` 返回整棵树，从根开始，含你自己这一行。行是 `{ name, status, description? }`。

- 后代名字是从根算起的路径，比如 `reviewer/checker`；根固定叫 `lead`。
- 可以直接给树里任何其他成员发消息。
- 状态多了三种：`corrupt`、`unsupported`、`unavailable`，说的是这一行自己的后代读不出来，这一行本身仍是能发消息的成员。
- `inactive` 仍然不代表活干完、也不代表失败。

### 完成通知

成员的完成通知会自动送到你手上，带着它的最终答复，「Its closing message:」这个格式仍然适用。收工前刚给你发过 `send_message` 的，通知里省掉收尾正文。

### 成员上限

新一代读不到上限：`maxMembers` 这个配置键已被拒绝。别在报告里写一个假数字。

## 状态怎么看

| 状态 | 含义 |
|---|---|
| `running` | 正在跑一个回合 |
| `inactive` | 没有回合在执行。**不代表活干完、也不代表失败** |
| `provisioning` | 正在创建 |
| `failed` | 创建失败 |

这张表是老一代的取值。新一代没有 `provisioning` 与 `failed`，多了 `corrupt`、`unsupported`、`unavailable` 三种，含义见「新一代」那节的「名册」。

`inactive` 有两种情况：teammate 已经收工（你收到过它的通知），或者它被存档了、等你再给它发消息才醒来。

老一代只有 Lead 能创建和打断 teammate（`interrupt_agent`），打断不清空它排队的消息。新一代不限于根：成员也能建自己的子代理，`interrupt_agent` 可以由任何祖先发给它下面直接或更深的那个后代。

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

## 收尾要写团队汇总

本 effort 有 2 个以上成员或跨 2 轮以上时，收尾要写一份团队汇总。加载 `team-digest` skill：触发阈值、落盘路径、六块骨架、原料取法都在那里，这里不展开格式。

## 给最终答复前

- 必需的 teammate 都等齐了再答。没等齐就说「还在跑」，别把半成品当结论。
- 最终验证自己做：跑测试、看 diff、核数字。不要只信 teammate 的回报。
- 回报里有「已通过」「已修复」这类话，去核证据。核不到就写「未验证」。
- 偏离规格的地方单独列出来，别混在成功清单里。

## 回报怎么写

结论在前。文件清单、验收输出、偏离规格三块分开。

没实测的数字不写精确值。不知道就写「未验证」。