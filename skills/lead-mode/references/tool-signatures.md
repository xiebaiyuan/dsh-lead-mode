# 两代工具名与参数差异

写调用前核对一次。完整签名由宿主工具清单或 SDK 块给出，此处不复述；下表差异基于宿主 `0.2.2-rc.5` 实测，切换宿主版本后先对照清单复核。

| 用途 | 老一代（有 `spawn_teammate`） | 新一代（有 `subagent`） |
|---|---|---|
| 建成员 | `spawn_teammate({ name, description, prompt, context })` | `subagent({ name, description, prompt, cwd, provider, model, reasoning_effort, agent_preset })` |
| 继承历史 | `spawn_teammate({ context: 'fork' })` | `subagent_fork({ ... })`，本插件预置里无模型参数 |
| 发消息 | `send_message({ target, message })` | `send_message({ agent, message })` |
| 打断 | `interrupt_agent({ target })` | `interrupt_agent({ agent })`，rc.3 起默认关闭 |
| 看名册 | `list_agents` 给成员 id、名字、状态 | `list_agents` 给名字、路径、状态 |
| 挑模型 | 不支持，只能整队换 Lead 模型 | `list_subagent_models` 查清单，成对传 `provider` + `model` |
| 认领任务 | `team_task_update({ action: 'claim' })` | 同左 |
| 任务 owner 字段 | `ownerName` | `ownerId` |

三条常见误用：

- 不存在 `team_task_claim` 独立工具；认领须调 `team_task_update` 并传 `action: 'claim'`。
- 新一代不存在 `spawn_teammate`；建成员调用 `subagent`。
- `wait_agent` 等待的是你自己收件箱的下一条输入（成员消息、完成通知、用户插话），仅返回 `{ timedOut }`，无 `noProgress` 字段；`timeout_ms` 范围 10000 到 3600000（默认 30000）。本 skill 禁用 `wait_agent`，原因见主文件 §5.3。
