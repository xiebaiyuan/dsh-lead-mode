# 老一代：spawn_teammate 的细节

只有 `spawn_teammate` 存在的会话读这一份。状态取值看主文件 §8.3，这里不重复。

## 四个参数

| 参数 | 要点 |
|---|---|
| `name` | 小写连字符。**永久，不可复用**，创建失败的名字也占着 |
| `description` | 一行职责。给用户看，也给你后面对账 |
| `prompt` | 全部指令。成员只看到这一段，写法见主文件 §5.1 |
| `context` | `fresh`（默认）看不到你的历史；`fork` 继承你已完成的回合 |

`context` 怎么挑，看活依赖什么：

- 活是自包含的，把上下文写进 prompt 就够：用 `fresh`。
- 活依赖你已经掌握、又写不进 prompt 的东西：才用 `fork`。

取名字前先 `list_agents` 看一眼，别撞已占用的名字。

## 模型：只能整队换

`spawn_teammate` 没有 model 或 provider 参数，**不能单独指定**。

成员继承你（Lead）在 spawn 那一刻的 provider 和 model。想换只有两条路：

| 想要什么 | 怎么做 |
|---|---|
| 整队换模型 | 切 Lead 自己的模型。之后新 spawn 的成员跟着变 |
| 按任务挑模型 | 用不了 team，改用经典 `subagent` 工具 |

经典 `subagent` 支持 `provider`、`model`、`reasoning_effort`、`agent_preset` 四个参数。本插件两个预置都开了 `modelSelection` 与 `modelDiscovery`，所以 `list_subagent_models` 在工具清单里。

代价说清楚：经典 `subagent` 是一次性子代理，没有共享任务板，没有持久身份。要用团队就得接受统一模型。这段代价只对老一代成立，新一代的成员本身就是 `subagent`，也能按成员挑模型。

## 名册与上下文工具

这一代的工具细节按老一代写：`list_agents` 给成员 id、`spawn_teammate` 建人、`interrupt_agent({ target })` 打断。

- `list_agents` 返回整棵树，行里带成员 id 与状态。
- 建成员后立刻返回名字，不等它干完。
- 只有 Lead 能创建和打断成员，打断不清空它排队的消息。
- 成员会话被压缩时用 `session_event_search` 查 `compaction/start`，检测配方在主文件 §11 的「怎么检测」一节。新一代拿不到 id，那一步就跳过，照实写「未验证」，别硬编一个 id。

## 状态取值

四种：`running`、`inactive`、`provisioning`、`failed`。表在主文件 §8.3，含义也在那里讲。
