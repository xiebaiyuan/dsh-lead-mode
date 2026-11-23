# 两代工具名与参数差异

只在写调用前对一眼。完整签名由宿主工具清单或 SDK 块给出，这里不抄；下表差异按宿主 0.2.2-rc.5 实测，换了宿主版本先对着清单核一遍。

| 用途 | 老一代（有 `spawn_teammate`） | 新一代（有 `subagent`） |
|---|---|---|
| 建成员 | `spawn_teammate({ name, description, prompt, context })` | `subagent({ name, description, prompt, cwd, provider, model, reasoning_effort, agent_preset })` |
| 继承历史 | `spawn_teammate({ context: 'fork' })` | `subagent_fork({ ... })`，本插件预置里它没有模型参数 |
| 发消息 | `send_message({ target, message })` | `send_message({ agent, message })` |
| 打断 | `interrupt_agent({ target })` | `interrupt_agent({ agent })`，rc.3 起默认不挂 |
| 看名册 | `list_agents` 给成员 id、名字、状态 | `list_agents` 给名字、路径、状态 |
| 挑模型 | 不支持，只能整队换 Lead 的模型 | `list_subagent_models` 查清单，成对传 `provider` + `model` |
| 认领任务 | `team_task_update({ action: 'claim' })` | 同左 |
| 任务 owner 字段 | `ownerName` | `ownerId` |

三条容易踩的：

- 没有 `team_task_claim` 这种独立工具。认领就是 `team_task_update` 带 `action: 'claim'`。
- 新一代没有 `spawn_teammate`。建成员就是 `subagent`。
- `wait_agent` 等的是你自己收件箱的下一条输入（成员消息、完成通知、用户插话），只返回 `{ timedOut }`，没有 `noProgress`；`timeout_ms` 范围 10000 到 3600000，默认 30000。本 skill 一律不用，理由见主文件 §5.3。
