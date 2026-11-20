# dsh-lead-mode

中文 | [English](README.md)

版本 0.2.7 · 宿主 >= 0.2.2-rc.3 · MIT

给 DSH（DeepSeek Harness）加 Lead 模式：模型当 Lead，拆活、派活、验收，动手的活交给成员。工具官方给，方法这里补。

## 为什么需要它

官方的 Agent Teams 运行时只给工具：老一代是 `spawn_teammate`、`send_message`、`team_task_*`；新一代用 `subagent` 建成员，`send_message` 与 `team_task_*` 还在，`wait_agent` 搬进了 subagent 控制工具。什么时候派活、派给谁、怎么等结果、怎么验收、多成员的产出怎么合并，它不管。

官方预置默认不带 Team 工具，它由会话开关单独控制。模型手里没有，它就会自己硬干，或者拿 `subagent` 顶替 teammate。用户与模型都不知道缺了这一步。

本插件补这一层方法，不替代官方 Team 模式。问题拆解与证据见 [docs/why.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/why.md)。

## 愿景

> 让你的 AI 团队明确你的需求，Lead 监督完整的拆解与执行过程，把模型的能力发挥到 200%。

200% 是目标，不是实测数字。

三条不变量：

1. 方法比工具活得久。工具换名、宿主换代，工作法不变。两代 Agent Teams 兼容是这条的第一次压力测试。
2. 交付物落在文件里。收尾消息、工作日志、团队汇总都在磁盘上，过一周还能回看。
3. 缺东西就告诉你怎么补。不沉默、不硬撑，下一步一定是一条可粘贴的命令或一个具体的开关。

## 特点

| 特点 | 证据 |
|---|---|
| 只加一层方法，不动宿主 | `cordis.patch.yml` 全文三行 `insert`（本插件 + 两个预置）；官方预置一个字没改；不注册工具、不监听 agent 生命周期、不拦截请求；卸载即回收 |
| 缺 Team 就停手，不硬凑 | 预置里的人设每轮查一次工具清单；启动时打一条 `warn`；`/lead-mode` 报状态。老一代不假装能派活，也不拿 `subagent` 顶替 teammate |
| Lead 只决策和派活 | persona 里写死：拆活、派活、验收，不自己写代码、不改文件；查证、跑验收、回话仍归 Lead |
| 派谁的模型从清单里挑 | persona 要求先调 `list_subagent_models`，从返回的清单里挑 provider/model 成对给出（可带推理档），不许编造 id |
| 两代 Agent Teams 都认 | 按工具清单判代际，不按版本号；老一代按原文，新一代按新语义：`send_message` 用 `agent`、task 变更不唤醒。Lead 不等：派完就结束回合，收工通知会起下一轮 |
| 方法落成文件，不落成口号 | 一人一份工作日志（状态摘要 + 只追加的轮次记录）；上下文降级有四级交接阶梯；收尾有六块骨架的团队汇总落到 `reports/`；结论挂证据指针（`路径:行号`、可粘贴命令、worklog 段名或 `session-<id>#seq`） |
| 上下文预算算过账 | persona prefix 398 字（0.2.6 是 314 字，0.2.5 从 2002 字压下来），两个预置逐字相同，每轮都进 system prompt；细节按需加载 |
| 看得见的交给 dsh-context | 不重复造页面，只指向它的编队页（见下方友链） |

这些证据都在仓库里，可以自己核对：`cordis.patch.yml`、`lib/index.js`、`skills/`、`CHANGELOG.md`。

## 30 秒上手

1. 装：`dsh plugin --profile <你的 profile 名> add dsh-lead-mode`
2. 开 Team：模型与推理等级菜单里有「开启智能体团队协作」就打开，旧宿主这个开关叫「使用智能体团队」。老一代宿主没有这个开关，装官方 profile 包，版本号按 `dsh --version` 的输出换：

   ```bash
   dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
   ```

3. 重启 dsh，新建会话的预置列表里挑一个：「Lead · PTC」给写程序调工具的会话，「Lead · 创造」给能直调工具、要改 DSH 自己的会话。然后敲 `/lead-mode` 看依赖状态。
4. 干活：模型自己拆活、派活、验收。

不换预置也能用：任何会话敲 `/skill lead-mode` 或 `/skill team-digest`。细节见 [docs/usage.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/usage.md)。

## 它给你什么

| 能力 | 入口 | 你要做什么 |
|---|---|---|
| Lead 预置 | 预置下拉里的「Lead · PTC」或「Lead · 创造」 | 挑一个切过去 |
| Lead 工作法 skill | `/skill lead-mode`，模型也会自己加载 | 不用管 |
| 团队汇总 skill | `/skill team-digest`，模型收尾前自己判断写不写 | 不用管 |
| 依赖自检 | `/lead-mode` | 依赖不对时敲一下 |
| 两层前置提醒 | 自动 | 不用管 |

只新增，不修改。撞名时宿主先到先得，本插件让位。

两个预置，因为 Lead 只换方法、不换能力：

| 预置 | 行数 | 基线 | 差异 |
|---|---|---|---|
| `lead-ptc` | 24 | 官方 `ptc` 逐字段 | 只换 persona |
| `lead-cordis` | 23 | 官方 `cordis`（创造）逐字段 | persona，外加 `skill-filesystem` 不带 `customSkillDirs` |

`customSkillDirs` 是故意不带的：官方那条表达式按 patch 文件自己的位置解析 `@deepseek-ai/dsh-agent-preset`，本包从那里解析不到宿主包，照抄会在加载时抛错。代价是 `dsh-doc` skill 不在 `lead-cordis` 的文件系统 skill 目录里。五样能力的细说在 [docs/usage.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/usage.md)。

两个预置都按 web-app 的预置抄，只适合桌面端或 Web profile。headless profile 没有这些工具行，别在那边切 Lead 预置。

PTC 是官方的新工具形态：模型写一段 TypeScript 程序调工具，只有 `run_code` 能直调，其余工具都在程序里用 `tools.xxx()` 调。Lead 的派活、建任务、发消息都按这个写法走，细节在 `lead-mode` skill 里。`lead-cordis` 里工具能直调，并且带 `tool-cordis` —— 这就是这台宿主上「创造」的意思。

## 友链：dsh-context

本插件只做 Lead 模式。整队状态与通信的可视化是 [dsh-context](https://github.com/bowenliang123/dsh-context) 的活，那是另一个项目。

| 项 | 值 |
|---|---|
| 仓库 | https://github.com/bowenliang123/dsh-context |
| 作者 | bowenliang123 |
| 许可 | Apache-2.0 |
| 装法 | `dsh plugin --profile <你的 profile 名> add dsh-context` |

它不随本插件安装，也不是本插件的依赖。只有装了它，编队页才存在。

装好后每个会话多一个「编队 / Fleet」标签页（在 Context 右边），右栏的 Context 面板里有同一张卡，五个区块：

| 区块 | 看什么 |
|---|---|
| 概要 | 成员状态、实时上下文、预估花费、任务进度 |
| Agent Network | 当前 agent、它的父级、全部子代理，一人一张卡 |
| Fleet Members | 每个成员的角色、模型、最新回复、运行时长、步数、在办任务数 |
| Tasks | 团队任务与子代理派活放一起，按 owner 分组，带 blocked-by 链 |
| Agent Comms | 谁跟谁说了什么：团队消息、邮箱投递、运行时的结算通知 |

## 文档地图

| 想看什么 | 去哪 |
|---|---|
| 为什么需要、问题拆解、边界 | [docs/why.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/why.md) |
| 安装、开启 Team、用法、能力细说、依赖表 | [docs/usage.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/usage.md) |
| 两代 Agent Teams 对照与判定 | [docs/agent-teams.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/agent-teams.md) |
| 设计取舍：不干扰官方、预置差异 | [docs/design.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/design.md) |
| 目录、开发、测试、发版 | [docs/development.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/docs/development.md) |
| 术语 | [GLOSSARY.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/GLOSSARY.md) |
| 版本记录 | [CHANGELOG.md](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/CHANGELOG.md) |
| 团队汇总样例 | [reports/](https://github.com/xiebaiyuan/dsh-lead-mode/tree/main/reports) |

`docs/` 不进 npm 包，这几篇只在 GitHub 上有；链接都写成绝对地址，在 npm 页面上也能点开。

## 许可

MIT。全文见 [LICENSE](https://github.com/xiebaiyuan/dsh-lead-mode/blob/main/LICENSE)。
