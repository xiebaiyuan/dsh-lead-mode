# 老一代：spawn_teammate 的细节

仅当本会话存在 `spawn_teammate` 时读本文件。状态取值见主文件 §8.3，此处不重复。

## 四个参数

| 参数 | 要点 |
|---|---|
| `name` | 小写连字符。**永久，不可复用**，创建失败的名字同样占位 |
| `description` | 一行职责。给用户看，也供你后面对账 |
| `prompt` | 全部指令。成员只看到这一段，写法见主文件 §5.1 |
| `context` | `fresh`（默认）看不到你的历史；`fork` 继承你已完成的回合 |

`context` 选型依据：

- 活是自包含的，上下文可写进 `prompt`：用 `fresh`。
- 活依赖你上下文中未落盘的决策与细节：用 `fork`。

命名前先调 `list_agents` 检查，避开已占用名称。

## 模型：只能整队换

`spawn_teammate` 无 `model` 或 `provider` 参数，**不能单独指定**。

成员继承你（Lead）在 spawn 那一刻的 `provider` 与 `model`。切换模型只有两条路径：

| 想要什么 | 怎么做 |
|---|---|
| 整队换模型 | 切换 Lead 自身模型。此后新 spawn 的成员跟着变 |
| 按任务挑模型 | 无法使用 team，改用经典 `subagent` 工具 |

经典 `subagent` 支持 `provider`、`model`、`reasoning_effort`、`agent_preset` 四个参数。本插件两个预置均开启了 `modelSelection` 与 `modelDiscovery`，因此 `list_subagent_models` 在工具清单中。

代价说明：经典 `subagent` 是一次性子代理，无共享任务板与持久身份；选用团队能力即需接受统一模型。此代价仅对老一代成立，新一代成员本身即 `subagent`，支持按成员挑模型。

## 名册与上下文工具

老一代工具行为：`list_agents` 给成员 id、`spawn_teammate` 建人、`interrupt_agent({ target })` 打断。

- `list_agents` 返回整棵树，行内含成员 id 与状态。
- 建成员后立即返回名称，不等其完成。
- 仅 Lead 可创建和打断成员，打断不清空其排队消息。
- 成员会话被压缩时用 `session_event_search` 查 `compaction/start`，检测步骤见主文件 §11「怎么检测」。新一代拿不到 id 时跳过检索，照实写「未验证」，不编造 id。

## 状态取值

四种：`running`、`inactive`、`provisioning`、`failed`。表与含义见主文件 §8.3。
