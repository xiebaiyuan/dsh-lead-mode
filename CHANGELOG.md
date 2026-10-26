# Changelog

## 0.1.0

首个版本。

- 新增 `lead-mode` 预设：镜像官方 `standard` 预设的全部 22 个插件行，只把 persona 换成 Lead 人设。
- persona prefix 里写明 Agent Teams 前置条件：本会话没有 `spawn_teammate` / `send_message` / `team_task_*` 时，先让用户开官方 Team 模式，不要自己硬干。
- 新增 `lead-mode` 运行时 skill，内容随包分发。
- 新增 `/lead-mode` 斜杠命令，报告 Team 运行时与预设的挂载状态。
- 启动自检：`agentTeams` 服务缺失时输出中文警告。
- 不捆绑 Team 运行时。`@deepseek-ai/dsh-experimental-tool-agent-team` 监听全局 `agent/created`，属宿主平面，由官方 profile 包提供。
