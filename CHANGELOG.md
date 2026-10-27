# Changelog

## 0.1.3

按 dsh 0.2.1-rc.3 的源码核实了团队行为，修正 skill 里过时的等待方式。

- skill 新增「等通知，别轮询」：唤醒 Lead 的路径只有 teammate 主动 `send_message`；task 变更只唤醒正在 `wait_agent` 的调用方；teammate 静默收工不产生通知。
- skill 新增「派活的四个参数」与「prompt 里必须写回报要求」。漏掉回报要求会导致 teammate 干完不吭声。
- skill 新增「teammate 用什么模型」：`spawn_teammate` 无法单独指定模型，teammate 继承 Lead 的 provider/model。要按任务挑模型得改用经典 `subagent`。
- skill 新增状态含义表，写清 `inactive` 不代表完成或失败。
- persona 同步加入回报要求、唤醒规则、不要轮询、模型继承四条。
- 两份 README 的 skill 覆盖描述同步，并列出两条只能读源码确认的事实。
- 新增两条测试守住回报要求与模型继承文案；删掉对应文案会失败（已做变异验证）。
- 预设与官方 `standard` 的差异仍只有 persona 一处。

## 0.1.2

- 英文 README 改成默认的 `README.md`，中文改成 `README.zh-CN.md`。GitHub 页面和 npm 包页默认展示英文版。
- 两份 README 标题下加语言切换入口。
- 新增「提供的能力」一节，放在安装之前。四样能力各自说明入口、用法、缺了会怎样。
- `package.json` 的 description 改成中英双语。

## 0.1.1

- 发布改用 npm Trusted Publishing（OIDC）：打 tag 触发，不存 token，不弹 2FA。用之前要在 npmjs.com 配一次 Trusted Publisher。
- `release.yml` 的 Node 从 22 提到 24，Trusted Publishing 要求 npm CLI ≥ 11.5.1。
- `release.yml` 去掉 `npm install`。本包零 dependencies，而 peer 里的 `@deepseek-ai/*` 会拉九百多个包。
- README 补「发新版本」一节，含 npm 侧要填的四个字段。

## 0.1.0

首个版本。

- 新增 `lead-mode` 预设：镜像官方 `standard` 预设的全部 22 个插件行，只把 persona 换成 Lead 人设。
- persona prefix 里写明 Agent Teams 前置条件：本会话没有 `spawn_teammate` / `send_message` / `team_task_*` 时，先让用户开官方 Team 模式，不要自己硬干。
- 新增 `lead-mode` 运行时 skill，内容随包分发。
- 新增 `/lead-mode` 斜杠命令，报告 Team 运行时与预设的挂载状态。
- 启动自检：`agentTeams` 服务缺失时输出中文警告。
- 不捆绑 Team 运行时。`@deepseek-ai/dsh-experimental-tool-agent-team` 监听全局 `agent/created`，属宿主平面，由官方 profile 包提供。
