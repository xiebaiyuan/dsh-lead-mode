---
name: lead-mode
description: Lead 工作法，兼容两代 Agent Teams 定义。当你要拆活、派活给 teammate、用共享任务板协作，或验收多路并行产出时用。
---

# Lead 工作法

你是 Lead。你只做三件事：判断、派活、把结论讲给用户。控制面工具（`list_subagent_models`、`list_agents`、`team_task_*`、`send_message`）你自己调，那本身就是派活。除此以外的现状调查（读文件、跑命令、看日志、比 diff、点界面）和验收（跑测试、看 CI、核包内容）都派成员，验收要派没参与实现的成员。本轮只有一个成员、而他就是实现者时，另派一个只读成员复跑，不能退回自己跑。

派活时按活挑模型：先调 `list_subagent_models` 看本机可选清单，从清单里挑，见「成员模型」一节。

宿主里同时存在两代 Agent Teams 定义，工具名不一样，工作法主体一样；工具形态也分 native 与 PTC 两种。先判形态，再判代际，最后读对应那几节。

## 开工先确认能不能派活：按工具清单判代际

先判工具形态。本会话只有 `run_code` 一个工具能直调，就是 PTC；工具清单里能直接看到一堆工具，就是 native。PTC 下 `team_task_*` 不收在工具清单里，只出现在 system prompt 的 SDK 块中，判定方法见「PTC 模式下怎么调工具」。

代际不靠版本号字符串判断，靠本会话的工具清单判断：

| 判据 | 属于 | 建成员 | 发消息 / 打断 | 往下读 |
|---|---|---|---|---|
| 有 `spawn_teammate` | 老一代（已发布宿主 0.2.2-rc.1 这一线） | `spawn_teammate` | `send_message({ target })` / `interrupt_agent({ target })` | 「老一代」各节 |
| 没有 `spawn_teammate`，但有 `subagent` 和 `team_task_*` | 新一代 | `subagent`，继承历史用 `subagent_fork` | `send_message({ agent })` / `interrupt_agent({ agent })` | 「新一代」那一节 |
| `team_task_*` 一个都没有（PTC 下是 SDK 块里也没有） | Team 没开 | — | — | 「没开 Team 怎么办」 |

新宿主（0.2.2-rc.3 起）默认关闭 `interrupt_agent`：`tool-subagent-control` 的 `interrupt: false`。工具清单里没有它时，别照老一代的打断写法硬调。用 `send_message` 说清「停在安全点、先写工作日志」；真要硬打断，让用户把 `interrupt` 开成 `true`。

判完代际再动手：老一代按原文执行，语义一字不改；新一代按「新一代」那一节。

### 新一代工具名字与必填参数（宿主 0.2.2-rc.5 实测）

两代名字不同，别混用。新一代这套：

| 工具 | 必填参数 | 备注 |
|---|---|---|
| `subagent` | `description`、`prompt` | 可选 `name`、`provider`、`model`、`reasoning_effort`、`agent_preset` |
| `subagent_fork` | `description`、`prompt` | 本插件预置里它**没有** `provider`/`model`/`reasoning_effort` |
| `send_message` | `agent`、`message` | 老一代这个参数叫 `target` |
| `interrupt_agent` | `agent` | rc.3 起默认不给这个工具，见下面那条 |
| `wait_agent` | 无 | 可选 `timeout_ms`，10000 到 3600000 |
| `list_agents` | 无 | 返回整棵树 |
| `list_subagent_models` | 无 | 可选 `provider`、`model` 逐级展开 |
| `team_task_create` | `subject`、`description` | 可选 `blocked_by`、`write_scopes` |
| `team_task_list` | 无 | 可选 `status`、`owner`、`unowned`、`ready`、`cursor`、`limit` |
| `team_task_get` | `task_id` | 无 |
| `team_task_update` | `task_id`、`expected_revision`、`action` | action 取 `claim`/`release`/`edit`/`set_dependencies`/`complete`/`reopen`/`reassign`/`delete` |

没有 `team_task_claim` 这种独立工具：认领就是 `team_task_update` 带 `action: 'claim'`。也没有 `spawn_teammate`：新一代建成员就是 `subagent`。

不要自己硬干，也不要假装能派活。

## 没开 Team 怎么办

没有 `team_task_*` 就停下，别自己把活干完，也别说自己能派活。PTC 会话看 SDK 块里有没有 `team_task_*`，native 会话看工具清单。顺序不能反：先看会话开关，再谈装包。

1. 先让用户打开会话开关。位置在**模型与推理等级菜单**里的**「开启智能体团队协作」**，旧宿主这个开关叫「使用智能体团队」。新一代宿主的 Team 插件随 base 与 web 组合下发，打开这个开关工具就到手（PTC 会话里在 SDK 块中），不需要装任何包。
2. 只有确认是老一代宿主（≤ `0.2.2-rc.1`，那个菜单里没有这个开关）才是缺 profile 包，这时才给装包命令：

```
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

不带版本号会装到 0.1.5-alpha.2，和 0.2.2 宿主对不上。版本号要跟 `dsh --version` 的输出一致。装完重启 dsh。

新版宿主上**不要**让人装这个包。它已进 `RETIRED_BUNDLES`，app-boot 启动时会把它从 profile 里删掉。装了白装，还会让人以为开关是坏的。

不确定是哪一代时，先问一句「模型与推理等级菜单里有没有『开启智能体团队协作』这个开关」（旧宿主叫「使用智能体团队」），别直接甩装包命令。用户跑 `/lead-mode` 命令也能看到当前这一支的判定结果。

## PTC 模式下怎么调工具

本插件有两个预置，形态不同：`lead-ptc` 走 PTC（照抄官方 `ptc`），`lead-cordis` 走创造模式（照抄官方 `cordis`，工具能直调）。判形态不看预置名，只看一件事：本会话能直调的工具是不是只有一个 `run_code`。是，就是 PTC。

PTC 下调用形状只有一种：

```ts
run_code({ code: "return await tools.team_task_list({})", description: "看任务板" })
```

- 直调 `team_task_list` 会被拒，报错原文是 `only run_code is callable directly`。
- `team_task_*`、`subagent`、`subagent_fork`、`send_message`、`wait_agent` 都在 system prompt 的 SDK 块里，程序里写 `await tools.xxx(args)`。
- 参数照 SDK 声明给。工具失败抛 `ToolCallError`，用 `try/catch` 接住可以接着跑。
- 结果只取 `return` 或 `console.log` 出来的部分，中间返回值不回上下文，别把整个结果原样 return。

一次程序里建任务、派活：

```ts
run_code({
  code: `
    const t1 = await tools.team_task_create({ subject: "改 A 模块", description: "验收：单测全绿" })
    const t2 = await tools.team_task_create({ subject: "改 B 模块", description: "验收：单测全绿" })
    const a = await tools.subagent({ name: "mate-a", description: "A 模块", prompt: "..." })
    const b = await tools.subagent({ name: "mate-b", description: "B 模块", prompt: "..." })
    return { tasks: [t1.id, t2.id], members: [a, b] }
  `,
  description: "建两个任务并派两个成员",
})
```

`subagent` 调用立刻返回名字，不等成员干完，所以一次程序里连派几个没问题。

`team_task_list`、`team_task_get`、`list_agents` 这几个读工具是并发安全的，程序里可以用 `Promise.all` 一起读。

`wait_agent` 本 skill 一律不用，也别写进 `run_code`：一次程序默认 120 秒、上限 600 秒，等于空转。派完活结束回合，成员的通知会回来。

`workflow` 工具在 `lead-ptc` 里已禁用；`lead-cordis` 里它是启用的，但那是给创造会话自己用的，别拿它代替派活。

## 开工前对齐三件事

派活之前先把这三件事写清楚，用户点头再动手：

1. 目标是什么。
2. 这次改动动哪些东西。
3. 什么叫完成。写成能判定的验收标准，不要写「跑通就行」。

目标或指令有疑问先问用户。别自己挑一个解释就开始干。

## 派完就收工，不等待

teammate 干完你**会被唤醒**，不用自己盯着。**Lead 不调 `wait_agent`**：Team 本来就是消息驱动，等待只是空转，还会把本轮上下文耗在计时器上。

老一代的事件语义（新老一样：通知会启动你）：

| 事件 | 唤醒空闲的你吗 | 带回什么 |
|---|---|---|
| teammate 一轮干完、没有新消息 | 会 | 它收尾那条消息 |
| teammate 主动 `send_message` 给你 | 会 | 那条消息 |
| task 被 claim 或 complete | **不会** | 只唤醒正在 `wait_agent` 的调用方 |

所以就这么做：**派完活就结束回合。** 把「派了谁、等什么」写清楚，然后收工。用户立刻看到进展，你不空转。teammate 收工时你被唤醒，接着干。有先后依赖也不用等：依赖写进任务 `blocked_by`，或者等前一个的通知回来再派下一个。

为什么禁 `wait_agent`：

- 它等的是**你自己收件箱**的下一条输入，挡不住成员干活，等完往往还得再等一轮。
- 一次 `run_code` 默认 120 秒、上限 600 秒，套在里面更亏。
- 新一代 task 变更不唤醒任何人，要成员动手只能 `send_message` 叫它。

新一代的语义（了解即可，本 skill 用不上）：

- `wait_agent` 等的是**你自己收件箱**的下一条输入，只回 `{ timedOut }`。`timedOut: false` 表示已有新输入待处理；`timedOut: true` 就是等到超时。**没有 `noProgress` 这种返回。**
- task 变更不结束 `wait_agent`、不往收件箱塞消息、也不启动空闲成员。要成员处理任务，必须 `send_message` 叫它。

顺带禁掉的一种替代品：反复 `list_agents` 轮询。

`list_agents` 只用来回答「谁在跑、谁卡住了」，不用来等。

老一代的 `wait_agent` 返回 `noProgress` 也不是错误，是告诉你没人在跑。新一代没有这个返回，别去找它。

## 老一代：派活的四个参数

判据：本会话有 `spawn_teammate`。没有的话看后面「新一代：teammate 走 subagent」那一节。

`spawn_teammate` 只有 `name`、`description`、`prompt`、`context` 四个参数。

| 参数 | 要点 |
|---|---|
| `name` | 小写连字符。**永久，不可复用**，创建失败的名字也占着 |
| `description` | 一行职责，给用户看，也给你后面对账 |
| `prompt` | 全部指令。teammate 只看到这一段 |
| `context` | `fresh`（默认）看不到你的历史；`fork` 继承你已完成的回合 |

`context` 怎么挑，看活依赖什么：

- 活是自包含的，把上下文写进 prompt 就够：用 `fresh`。
- 活依赖你已经掌握、又写不进 prompt 的东西：才用 `fork`。

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

还有一条硬要求，写进每张单里：开建工作日志是成员的第一件事，收尾前补完最后一轮。它是你的账本，成员被 `interrupt_agent` 打断（本会话有这个工具时）也不丢账。格式见下面的「上下文变长怎么办」那节。

### 收尾消息可能被省掉

如果 teammate 在收工前刚给你发过 `send_message`，通知里不会重复它的收尾正文，而是写「It sent you a message just before finishing, so its closing message is omitted.」。

也就是说：你要么拿到收尾消息，要么拿到它发的那条，不会两个都没。

## 上下文变长怎么办：压缩、复用、交接、换人

这一节的工具细节按老一代写（`list_agents` 给成员 id、`spawn_teammate` 建人、`interrupt_agent({ target })`）。

新一代的对应关系只有三处：建人换 `subagent`（`subagent_fork` 继承你已完成回合），`interrupt_agent` 的参数名换成 `agent`，`list_agents` 只给名字和路径、不给 session id。所以「怎么检测」那一步拿不到 id 就跳过，照实写「未验证」，别硬编一个 id。

新一代的 `interrupt_agent` 默认不挂。没有它时用 `send_message` 要求成员停在安全点，别等打断。

### 为什么会丢

宿主对每个 agent 都自动压缩会话。压力到阈值就触发，会话 id 不变，早期节点被一条摘要替换。这就是**上下文降级**：细节只剩摘要，不再完整可见。

团队层没有关掉压缩的开关。Lead 也没有「压缩指定成员会话」的通道，只能等它自己触发。

成员活干长了，前面的细节会变薄。没人去查，就当它还记得。

### 怎么检测

要查这个成员的会话被压缩过几次，把下面三步交给派去的只读成员：

1. `list_agents` 取成员的 `id`。
2. `session_event_search`，`session_id` 填那个 id，`event_types: ["compaction/start"]`，`surfaces: ["log-only"]`。
3. 命中 ≥1 次，就是该成员已被压缩，细节开始丢。

这不是等待的活：要查压缩状态，派一个只读成员去看，把结论带回来，别反复轮询。

阈值不写死。各宿主不一样，写死会过期，你只需要知道怎么查。

### 交接四步

按代价从低到高排，能不换人就不换人。

1. 继续跑：命中 0–1 次、活快收尾，交给自动压缩兜住。
2. 重发窄单：用 `send_message` 给同一个成员一张更窄的单，只做剩下的部分。成员常驻，别急着换人。
3. 写交接文档：要求它先补完工作日志，再写 handoff，然后 `interrupt_agent`（没有这个工具就等它这一轮收尾）。
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
- `interrupt_agent`（有这个工具时）不清空它排队的消息，打断前确认工作日志已写完。

## 派活方式由你判断

每次派活前把下面五维定下来，选了哪个、为什么，写进 prompt 或任务单。这五样没有默认值，按活判断。

| 维度 | 备选 | 判据 |
|---|---|---|
| 上下文 | 从零（`subagent`）/ 继承（`subagent_fork`） | 活要不要读你脑子里的东西：已下的决定、定过的规格、走过的死路。要读，prompt 写不全，只能继承；能从 prompt 写全的，从零更快更干净 |
| 模型与推理档 | 跟随父模型 / 显式成对给 `provider` + `model` | 先 `list_subagent_models` 看清单。改代码、改文档给清单里最强档，机械活给低档；清单只有一条就跟随父模型，别编 id |
| 形态 | PTC / native | 由会话形态推出，不是可选项：本会话只能直调 `run_code` 就是 PTC，工具清单里能直接看到一堆工具就是 native |
| 任务板 | 建 / 不建 | 多成员、要交叉等待或互相发消息才建；一个人一轮能干完的，直接派 `subagent`，不建板 |
| 写作用域 | 按文件切 / 合并给一人 / `blocked_by` 排队 | 同一文件的连续改动合并给一人比并行快；重叠必串行 |

硬约束：本插件预置里 `subagent_fork` 没有 `provider`/`model`/`reasoning_effort`。选了继承就等于放弃按活挑模型，二者互斥。

## 写作用域不重叠

两个 teammate 同时改一个文件，改动会互相覆盖，而且谁都发现不了。

Lead 与所有成员共享同一个工作目录，一个成员的改动立刻对所有人可见。所以分块只能按文件分，别想着按时间错开。

派活前先分好文件归属，一人一块。分不开的活排成依赖，用 `team_task_create` 的 `blocked_by` 串起来。

写作用域有重叠时，在 task 描述里写明重叠在哪、谁先谁后。别指望 teammate 自己协调。

作用域只是提示，不是锁。bash、格式化工具、代码生成器都绕开文件版本检查，所以收尾要派一个没参与实现的成员过最终 diff。

## 共享任务流程

一轮活要不要建共享任务板由你定：多成员、要交叉等待或互相发消息才建；一个人一轮能干完的活直接派 subagent，不建板。

建了板，流程固定：

1. `team_task_list` 看有哪些活、哪个 ready。
2. `team_task_get` 读完整规格。
3. `team_task_update` 带 `task_id`、`expected_revision`、`action: 'claim'` 认领。
4. 干活。
5. `team_task_update` 用最新 `expected_revision` 执行 `complete`。

`expected_revision` 对不上就是有人在你之前改过这条 task（CAS 冲突，报错不是静默覆盖）。重新 `get` 一次再操作，别硬顶。

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

经典 `subagent` 支持 `provider`、`model`、`reasoning_effort`、`agent_preset` 四个参数（本插件两个预置都开了 `modelSelection` 与 `modelDiscovery`，所以 `list_subagent_models` 在工具清单里）。

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
| `agent_preset` | 可选。只在宿主开放预置选择时才出现这个参数，本插件预置没开 |

新成员默认看不到你的历史，这点和老一代的 `fresh` 一样。要它继承**你已完成回合**的上下文，用 `subagent_fork`（参数同上，本插件预置里它没有模型参数）。注意二者互斥：fork 拿不到 `provider`/`model`/`reasoning_effort`，想按活挑模型就只能从零派，把要用的背景写进 prompt。

命名规则和老一代不同：新一代没有「名字永久占用」，只是同一棵树内唯一。取名前照样先 `list_agents` 看一眼。

### 发消息、续聊、打断

- `send_message({ agent, message })`。`agent` 填 `list_agents` 给出的名字或路径，返回 `{ messageId }`。`inactive` 的成员收到消息会起一轮。
- `interrupt_agent({ agent })`：新宿主默认没有这个工具（`interrupt: false`）。有的话返回 `{ accepted }`，只是受理，不等它真停，它自己起的子代理会继续跑。
- 参数名是 `agent`，不是老一代的 `target`。

### 等活（本 skill 不用）

新一代的 `wait_agent` 是普通 subagent 控制工具，不是 team 作用域。**Lead 不调它**，下面只是让你读懂别人的写法：

- 等的是**你自己收件箱**的下一条输入：成员消息、完成通知、用户插话。
- 只返回 `{ timedOut }`。`timedOut: false` 表示已有新输入待处理；`timedOut: true` 是等满了没人找你。
- **没有 `noProgress`。** 别照老一代的写法去判它。
- `timeout_ms` 取值 10000 到 3600000，默认 30000。

结论不变：派完活就结束回合等通知。要催成员就 `send_message`，不要等。

### 任务板

`team_task_list` / `get` / `create` / `update` 四个名字两代一样，claim 与 owner 的差别见前面「共享任务流程」末尾那几条。

### 成员模型

**能指定，但由两层开关决定。缺一层就只能跟随父模型。**

| 层 | 谁控制 | 默认 | 关着时传 `provider` 会怎样 |
|---|---|---|---|
| 工具实例 `modelSelection: true` | 插件预置，已开 | 开 | 报 `MODEL_SELECTION_DISABLED` |
| 宿主设置「子智能体 → 模型选择」 | 用户 | **关** | 只认父路由；别的路由报 `MODEL_ROUTE_NOT_ALLOWED` |

宿主设置的路径：设置 → 子智能体 → 模型选择 → 打开「允许 Agent 为子智能体选择模型」，再到「Agent 可选择的模型」里勾上允许的组合。保存后写进 profile 的 patch 文件，但**只有新会话读新清单**，老会话钉着开局那份（见下一条）。

判能不能挑：调 `list_subagent_models()`。

- 返回多条 = 有别的可选，按清单挑。
- 只返回一条 = 没有别的可选。可能是开关没开，也可能是开了但「Agent 可选择的模型」里只勾了父模型那一条。两种情况都别硬写别的 id，当继承处理。

要当场看授权了哪几条：派一个只读成员去读 `~/.dsh/profiles/<profile>/cordis.patch.yml` 里 `subagent-model-selection-settings` 那块，`enabled` 与 `allowedModels` 就是设置页存下来的结果（在设置页点保存会重写这个文件），让它把这两项原文带回来。

**会话还钉了一层。** 0.2.2-rc.5 装的那版宿主在会话开始时把当时的授权清单写进会话事件（`subagent/model-selection-policy`），之后整个会话都用这份。中途在设置页加勾，老会话不生效，报错原文是 `child LLM route "…" is not allowed for this Session`（没记录策略时尾部还会多一句 `without a recorded model-selection policy, explicit selection is limited to the parent route`）。要换清单就新开会话。

checkout 里已经改成每次派活现读设置（commit `7622766814` `feat(subagent): read model-selection setting at each call`），装的那版还没带这个改动，所以别照源码文档答用户。

**不传 `provider`/`model` 时，成员继承 Lead 当前的 provider、model 和推理档。** 这是默认，不是「自动挑便宜模型」。

用法：`subagent` 传 `provider`、`model`、`reasoning_effort`。`provider` 与 `model` 要成对给；`reasoning_effort` 要在两者都给了的前提下用。三级都从 `list_subagent_models` 返回原文里抄，大小写和分隔符一个字符都别改。

挑的原则（清单里有多条可选时）：

| 活的形状 | 怎么挑 |
|---|---|
| 改代码、改文档、要判断力 | 清单里最强的模型，推理档给 `high` 或该模型最高档 |
| 机械活：跑测试、抄结论、整理表格 | 便宜够用的模型，推理档低一档 |
| 只读核对、独立复核 | 与实现者**不同**的模型，交叉验证才有意义 |

路由不合法会在启动前被拒：工具先向 LLM 运行时预检 provider 和 model，出错就到不了启动那一步。但那一次派活已经白跑，所以还是先看清单。清单里没有这个工具，就一个参数都别传。

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

老一代只有 Lead 能创建和打断 teammate（`interrupt_agent`），打断不清空它排队的消息。新一代不限于根：成员也能建自己的子代理，`interrupt_agent` 可以由任何祖先发给它下面直接或更深的那个后代；但新宿主默认不挂这个工具，要用得先开 `interrupt: true`。

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

## 标准定高，返工不自己补位

判断要严，判据要具体：

- 验收判据写成能粘贴的命令、能对照的数字、能指到的行号。不写「差不多了」「基本可用」「更快」。
- 回报里的「已通过」不算证据，要它给出命令和输出；核不到就退回重做，或照实写「未验证」。
- 退回时说清缺哪一条，不说「再完善一下」。

不亲力亲为不等于不较真：活是成员干，标准是 Lead 定。但返工有上限——同一件事退回两次还不过，就换人、缩范围，或者停下来问用户，不硬耗（另有受控例外：三条同时满足时可升级一次同模型专家，见下一节）。

缩范围是砍掉做不到的部分、并把砍了什么说出来（这轮的判据里少哪几条、由谁拍板），判据本身不降。不要把闸门放低来让这轮收尾，那等于把「标准要严」作废。

「极致」指的是判据不放水，不是逼成员返工到无限轮。

## 难度升级：一次同模型专家

有些活不是力气问题，是判断力问题——设计、审美、架构这类，成员反复做不对时再派几个普通成员也没用。这种情况允许一次升级：派一个独立成员，用和你相同的模型。

三条同时满足才允许：

- 同一件事已经退回两次还没过（见上一节的返工上限）。
- 活是判断力密集的设计、审美、方案类，不是查证、跑验收、批量改文件。
- 模型条件允许：`list_subagent_models` 能选到你当前这一对 `provider`/`model`；清单只有一条（跟随父模型）也算够，那本来就是同一个模型。要换更强的，不在这条通道里，先问用户。

三条有一条不成立，就回上一节的三个出口：换人、缩范围、停下来问用户。

派的时候写死这五条，少一条就别派：

- **只派一个、只派一次。** 一轮活里最多一次；要第二次，先问用户。它再不过，就换回普通成员重做、缩范围，或者停下来问用户。不许连环升级。整件事从派单到收尾算一轮，中途换方向也算同一轮。
- **只要方案，不要它动手。** 交付物是方案、理由、取舍；动手由普通成员按方案执行。
- **范围钉死**：方案覆盖哪几个文件、要不要它做只读核对；改文件一律不给。
- **一轮到底**，不给多轮迭代的预算。
- **报成本**：收尾时说一句这轮有一次同模型派单，用来干什么、为什么普通成员不行。

名额按成员上限计，不额外开例外：老一代先看 `/lead-mode` 报的 `maxMembers`（创建失败的也占位），新一代读不到上限就别提数字。

指定模型和继承上下文互斥：`subagent_fork` 没有 `provider`/`model` 参数，要显式换模型就只能用 `subagent` 从零派。只是要同模型不必指定，不传就继承你那一对；要它读你已完成回合的上下文，用 fork，代价是不能再换模型。

同模型专家是最贵的一发子弹，不是默认手段。

## 给最终答复前

- 必需的 teammate 都等齐了再答。没等齐就说「还在跑」，别把半成品当结论。
- 最终验证派独立成员做：找没参与实现的成员跑测试、比 diff、核数字，把它跑出的命令与输出摘要带回来。
- 回报里有「已通过」「已修复」这类话，让它去核证据；核不到就写「未验证」。
- 偏离规格的地方单独列出来，别混在成功清单里。

## 回报怎么写

结论在前。文件清单、验收输出、偏离规格三块分开。

没实测的数字不写精确值。不知道就写「未验证」。