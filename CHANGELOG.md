# Changelog

## 0.1.7

成员会话被压缩后，Lead 得知道细节已经变薄了，并且有固定的处置顺序。

skill 新增「上下文变长怎么办：压缩、复用、交接、换人」一节，含五块：

- **为什么会丢**：宿主对每个 agent 都自动压缩，会话 id 不变，早期节点被一条摘要替换。团队层关不掉，Lead 也没有压缩别人会话的通道。
- **怎么检测**：三步配方。`list_agents` 取成员的 id，`session_event_search` 带 `event_types: ["compaction/start"]` 与 `surfaces: ["log-only"]` 查它，命中 ≥1 次就是已压缩。不写死阈值数字，各宿主不同，写死会过期。
- **交接阶梯**：四级按代价升序 —— 继续跑、`send_message` 重发窄单给同一成员、写交接文档后 `interrupt_agent`、`spawn_teammate` 换人。换人固定用 `fresh`，理由写死：`fork` 拷的是 Lead 自己的历史，不是上一个成员的历史。
- **工作日志与交接文档放哪**：固定 `.scratch/<effort>/`，一人一个 `worklog-<mate>.md`，换人写 `handoff-<mate>-<n>.md`。工作日志两段（状态摘要 + 只追加的轮次记录），交接文档六块（接手关系、任务与账本、文件账、验收、死路与决策、下一步）。
- **换人操作清单**：先查名额，旧 task 先 `release` 再让续作成员 `claim`，续作成员名字加 `-r2` 后缀，`interrupt_agent` 不清空排队消息。

派活那节加一条硬要求：开建工作日志是成员的第一件事，收尾前补完最后一轮。

同一条要求也写进 persona prefix（`cordis.patch.yml`）。skill 是按需加载的，常驻 system prompt 里没有它，Lead 不加载 skill 就等于没有这条规矩。两处都留。

新增六条测试：检测配方三步与「不要轮询」、阶梯四级与三个处置工具、命名约定与软链说明、第 4 级必须写 `fresh` 加 `fork` 的理由、正文不许出现 `0.8` / `65536` / `0.16` 三个阈值数字（以上五条在 `test/smoke.test.mjs`），以及 persona prefix 要求成员第一步建工作日志（`test/preset.test.mjs`）。测试按小节切片断言，不是全文碰运气。

仓库根新增 `GLOSSARY.md`，定名十个术语：Lead、成员、成员名额、收尾消息、工作日志、状态摘要、上下文降级、交接文档、交接阶梯、续作成员。

预设与官方 `standard` 的差异仍只有 persona 一处。

## 0.1.6

把 dsh-context 写成正式友链，中英都标清它是另一个项目。

- 两份 README 的「看工作和通信状态」改名为「友链：dsh-context」/「Friendly link: dsh-context」，并加一张信息表：仓库地址、作者 bowenliang123、Apache-2.0、安装命令。
- skill 同一节补上仓库地址与许可，并写明「不随本插件安装，也不是本插件的依赖」。
- skill 补一句提醒：只有用户装了它，编队页才存在，别让用户去找一个没有的页面。
- 新增一条测试逐项核对两份 README 的友链节（标题、仓库地址、许可、安装命令、三个区块名），并把仓库地址与许可也纳入 skill 的断言。三个变异各删一处都变红。
- 预设与官方 `standard` 的差异仍只有 persona 一处。

## 0.1.5

看整队状态与通信时，指向 dsh-context 的编队页。

- skill 的「状态怎么看」新增「想看全局，用 dsh-context 的编队页」，列出编队页的五个区块（概要 / Agent Network / Fleet Members / Tasks / Agent Comms），并写明入口是「编队 / Fleet」标签页、右栏 Context 面板有同一张卡。
- 两份 README 新增「看工作和通信状态：配 dsh-context」一节，含安装命令与区块表。
- 新增一条测试守住友链、标签页名与三个区块名；删 dsh-context 或删 Agent Comms 都会红（已做变异验证）。
- dsh-context 是另一个插件，不随本插件安装。
- 预设与官方 `standard` 的差异仍只有 persona 一处。

## 0.1.4

纠正 0.1.3 里一条写错的事实。

0.1.3 说「teammate 静默收工不产生通知」。**这条是错的。** 读 `dsh-subagent` 的
`manager.ts` 才看清完整链路：

- `announce()` 对 `kind === 'local'` 一律调 `watchLocalSettlement`。
- 后者在子代理 `whenIdle` 且收件箱为空时判定 `ready`，走 `finishDisposal` →
  `notifySettlement`。
- `notifySettlement` 用 `sendWaking` 投递，空闲的 Lead 走 `followup`，会被唤醒。
- `createSettlementMessage` 把子代理最后的正文拼成「Its closing message:」带回。

所以 teammate 收工**会**通知 Lead，而且带回它收尾那条消息。我先前只看到
`notifySettlement` 挂在销毁路径上，漏了 `watchLocalSettlement` 这条自然结算。

改动：

- skill 的唤醒规则表改对：teammate 收工与主动 `send_message` 都会唤醒 Lead。
- skill 新增「收尾那条消息就是交付物」：派活时要求 teammate 把交付物写进收尾消息，比额外要求一次 `send_message` 省事。同时说明收尾正文在「刚发过消息」时会被省略。
- 删掉「不写回报要求就不会有通知」这条错误因果。回报要求仍然建议写，理由是拿到的信息更结构化，不是「否则没通知」。
- task 那条保留并写清：task 是账本，不是唤醒通道。
- persona、两份 README 同步。
- 测试断言换成唯一且精确的证据（通知格式串「Its closing message:」），三个变异各删一处都变红。

## 0.1.3

按 dsh 0.2.1-rc.3 的源码核实了团队行为，修正 skill 里过时的等待方式。

- skill 新增「等通知，别轮询」。**其中「teammate 静默收工不产生通知」一句是错的，已在 0.1.4 纠正。**
- skill 新增「派活的四个参数」与 prompt 写法。
- skill 新增「teammate 用什么模型」：`spawn_teammate` 无法单独指定模型，teammate 继承 Lead 的 provider/model。要按任务挑模型得改用经典 `subagent`。
- skill 新增状态含义表，写清 `inactive` 不代表完成或失败。
- persona 同步加入唤醒规则、不要轮询、模型继承。
- 两份 README 的 skill 覆盖描述同步。
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
