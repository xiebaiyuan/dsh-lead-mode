# dsh-lead-mode

中文 | [English](README.md)

给 DSH 加一个 Lead 模式。一个预设、两个 skill、一个自检命令、两条前置提醒。

官方 Team 运行时只给工具。老一代是 `spawn_teammate`、`send_message`、`team_task_*`；新一代改成用 `subagent` 建成员，`send_message`、`team_task_*`、`wait_agent` 从 subagent 体系下发。什么时候派活、派给谁、怎么等结果、收尾怎么写、多成员的产出怎么合并，这些方法它不管。本插件补的就是这一层。它不替代官方 Team 模式，是配套。

装好后模型能按 Lead 的方式干活：拆活、派活、验收。动手的活尽量派出去。

## 提供的能力

五样东西，都不碰 dsh 本体。

| 能力 | 入口 | 你要做什么 |
|---|---|---|
| Lead 模式预设 | 预设下拉里的「Lead 模式」 | 切过去 |
| Lead 工作法 skill | `/skill lead-mode`，模型也会自己加载 | 不用管 |
| 团队汇总 skill | `/skill team-digest`，模型收尾前自己判断写不写 | 不用管 |
| 依赖自检 | `/lead-mode` | 依赖不对时敲一下 |
| 两层前置提醒 | 自动 | 不用管 |

只新增，不修改。`cordis.patch.yml` 全文只有两行 `insert`：一行本插件，一行新建的 `lead-mode` 预设。官方 `standard` 预设一个字没动，新预设的 21 行逐字段照抄它，只换 persona。

不注册任何工具，不监听 agent 生命周期，不拦截任何请求。`lib/index.js` 只往两个注册表写：`skills`（两个 skill）与 `commands`（一个命令）；启动时另打一条 warn。卸载后这些条目全部消失，官方行为回到原样。

唯一可能撞的地方是同名 skill 或命令。你已经装了 `lead-mode` 或 `team-digest` 时，宿主按先到先得处理，打一条 warn，忽略本插件那条；撞了也只是我们让位。

### 一、Lead 模式预设

切过去，这个会话的模型就换成 Lead 人设。

预设内容等于官方 `standard` 预设的全部 22 行，只把 persona 换掉。工具一个不少：bash、文件读写、搜索、web、todo、skill、goal、plan、compaction、subagent、workflow 全在。

也就是说，切到 Lead 模式不会让你少任何能力，只是换了工作方式。

### 二、Lead 工作法 skill

一套拆活、派活、验收的方法，随包分发。

它不绑预设。任何会话都能加载，两条路：

- 模型判断需要时自己加载（skill 标记为模型可调用）
- 你直接敲 `/skill lead-mode`

覆盖这些内容：开工前对齐目标、派活必须自包含、写作用域不重叠、共享任务的 list/get/claim/complete 流程、怎么等 teammate（两代答案不同，见「两代 Agent Teams 定义」）、teammate 的模型从哪来、最终验证自己做。

其中两条是读源码才确认的，容易踩：

| 事实 | 为什么重要 |
|---|---|
| teammate 收工会自动通知你，通知里带它收尾那条消息 | 派完活结束回合就够，不用盯着等 |
| task 变更不会唤醒空闲的 Lead | 别指望「它把 task 标 complete 了我就知道了」。老一代只唤醒正在 `wait_agent` 的调用方；新一代谁都不唤醒，`wait_agent` 只等自己的收件箱 |

所以 skill 的默认建议是：派完活就结束回合等通知（用户立刻看到进展），只有本回合内就必须拿到结果时才用一次 `wait_agent`。不要 `wait_agent` 套循环，也不要反复 `list_agents` 轮询。

派活 prompt 里要要求 teammate **把交付物写进收尾那条消息**——那条消息会随通知回到你手上。

### 三、团队汇总 skill

收尾时全队产出散在 N 条收尾消息和 N 份工作日志里，没人合并，过一周想回看就得重新查一遍。这个 skill 把它们合成一份 `reports/<YYYY-MM-DD>-<effort>.md`。

| 项 | 规则 |
|---|---|
| 什么时候写 | 给最终答复前，本 effort 有 2 个以上成员，或跨 2 轮以上 |
| 写到哪 | `reports/<YYYY-MM-DD>-<effort>.md`，单一路径，收尾一次成型 |
| 六块骨架 | 结论 / 谁干了什么 / 验收证据 / 偏离与未验证 / 死路与决策 / 未决与下一步 |
| 原料分层 | 收尾消息做骨架，工作日志补过程细节，会话日志兜底 |

六块标题写死，某块没内容就写「无」。原料按顺序取，上层够用就不下钻。细节看 `team-digest` skill。

### 四、依赖自检命令

`/lead-mode` 报告当前依赖状态。

| 报什么 | 内容 |
|---|---|
| Team 运行时 | 挂没挂；老一代挂了再报 `maxMembers` |
| lead-mode 预设 | 注册没注册 |
| 缺东西时 | 按代际给下一步：新一代先提示会话开关，老一代给带版本号的安装命令 |

依赖齐全返回 success，缺东西返回 error。不会静默跳过。

### 五、两层前置提醒

**本会话没有 Team 工具时，提醒你去开官方 Agent Teams，而不是让模型硬干。**

走两条路：

| 通道 | 谁看得见 | 什么时候出现 |
|---|---|---|
| persona 第一段 | 模型 | 一切到 Lead 模式就在。system prompt 的第 0 段 |
| 启动 warn 与 `/lead-mode` | 用户 | 检测到 Team 运行时缺失时 |

两条讲同一件事：Team 工具不齐就先停下来，告诉你下一步怎么开。新宿主去打开会话开关，老宿主去装 profile 包。

老一代宿主上，模型不会假装能派活，也不会拿 `subagent` 顶替 teammate；新一代的 teammate 本来就是 `subagent` 建的，这条不适用。

## 两代 Agent Teams 定义

Lead 模式靠 dsh 官方的 Team 运行时派活，本插件不带它。这套运行时在两代宿主上是两套 API：老一代是已发布的 0.2.2-rc.1；新一代只在本地 master 上，还没发版，没有版本号可指。

| 维度 | 老一代：已发布宿主 0.2.2-rc.1 | 新一代：本地 master，未发布 |
|---|---|---|
| 定义在哪 | 桌面端 asar 内的 `@deepseek-ai/dsh-experimental-tool-agent-team@0.2.2-rc.1` | `packages/team/tool-agent-team` 与 `packages/subagent/*` |
| 建成员 | `spawn_teammate({ name, description, prompt, context })` | `subagent({ name?, description, prompt, cwd?, agent_preset?, provider?, model?, reasoning_effort? })`；要继承历史用 `subagent_fork` |
| 成员身份 | 持久命名的成员，带 `target` | Session id 加一个 agent 名；名字是从根算起的路径（如 `reviewer/checker`），根固定叫 `lead` |
| 发消息 | `send_message({ target, message })` | `send_message({ agent, message })`，返回 `{ messageId }` |
| 打断 | `interrupt_agent({ target })` | `interrupt_agent({ agent })`，返回 `{ accepted }` |
| 名册 | `list_agents({})` 列 Lead 加成员 | `list_agents({})` 列整棵树，每行 `{ name, status, description? }`，状态多了 `corrupt`、`unsupported`、`unavailable` |
| 等待语义 | team 作用域：等成员状态、消息、任务变更；没人能产出变更时立刻回 `noProgress` | 普通 subagent 控制工具：等调用者自己的下一条输入（成员消息、完成通知、用户插话），只回 `{ timedOut }`，没有 `noProgress` |
| 任务板 owner | `team_task_*` 四个工具，owner 填成员名 | 同样四个工具，owner 填成员名或 Session id；判据字段从 `ownerName` 变成 `ownerId` |
| 开启方式 | 装 profile 包 `@deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1` | 不要装这个包：它已进 `RETIRED_BUNDLES`，app-boot 会把 profile 里的它删掉。Team 插件随 base 与 web 组合下发，按会话开：模型与推理等级菜单里的「使用智能体团队」 |
| 成员模型 | 继承 Lead，`spawn_teammate` 没有模型参数 | `subagent` 有 `provider`、`model`、`reasoning_effort`（`standard` 预设已开 `modelSelection`）；`agent_preset` 可指定预设 |
| 成员上限 | `agentTeams.config.maxMembers` | 配置键 `maxMembers` 已被拒绝，读不到上限 |

新一代删掉了 `spawn_teammate`；`wait_agent` 从 team 工具搬到 subagent 控制工具，语义换成「等自己的收件箱」。

### 怎么知道自己属于哪一代

不按版本号认，按工具清单认。

| 你看到的 | 属于 | 下一步 |
|---|---|---|
| 有 `spawn_teammate` | 老一代 | 装 profile 包，见下一节 |
| 没有 `spawn_teammate`，但有 `subagent` 和 `team_task_*` | 新一代 | 不用装，确认会话开关已开 |
| `team_task_*` 一个都没有 | Team 没开 | 先找会话开关；确认是老一代宿主没有这个开关，才去装包 |

顺序不能反。新一代宿主上让人去装 profile 包是错的：那个包会被 app-boot 移除，装了也白装。

### 老一代：装 profile 包

```bash
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

上面写的 `0.2.2-rc.1` 是当前宿主线，按你自己 `dsh --version` 的输出替换。

**必须带版本号，而且要和宿主版本一致。** 不带会装到 `latest` 上的 0.1.5-alpha.2，那是给 0.1.x 宿主用的，在 0.2.2 宿主上挂不上。`next` 指向的 0.2.2-rc.1 才是这条线现在对的版本，也是本插件文案里钉的那个。团队包把 `dsh-*` 的 peer 钉死到具体版本，老 rc 装到新宿主上，peer 对不上。装完重启 dsh。

不确定装没装？进 dsh 敲 `/lead-mode`，它会报依赖状态。

### 新一代：不要装 profile 包，开会话开关

新一代宿主上不要执行上面那条命令。`@deepseek-ai/dsh-experimental-agent-team-profile` 已进官方的 `RETIRED_BUNDLES`，app-boot 会把它从 profile 里删掉。Team 插件随 base 与 web 组合下发。

开法是按会话开：打开「模型与推理等级」菜单，把「使用智能体团队」开关打开。这个开关是会话级的，不是 profile 级的。

## 装本插件

两条路，选一条。

从 npm：

```bash
dsh plugin --profile <你的 profile 名> add dsh-lead-mode
```

从 GitHub：

```bash
dsh plugin --profile <你的 profile 名> add https://github.com/xiebaiyuan/dsh-lead-mode
```

装完重启 dsh。在预设列表里选「Lead 模式」。

## 用法

三步。

**1. 切到 Lead 模式。** 新会话的预设列表里选「Lead 模式」。切过去之后，模型 system prompt 的第一段就换成 Lead 人设，开头那段提醒跟着进去。

**2. 敲 `/lead-mode` 查依赖。** 这条命令不派活，只报状态。缺东西时它按代际给下一步：新一代提示会话开关，老一代给出带版本号的安装命令。

**3. 让模型干活。** 派活工具齐了，模型会自己拆活、派给 teammate、等齐再收尾。工具不齐，它第一句就是让你去开 Team 运行时。

## 只用 skill，不换预设

预设不动也能用。插件装好，预设保持 `standard` 或你自己的，任何会话敲 `/skill lead-mode` 就加载那套方法；模型判断任务需要时也会自己加载。

少了一样东西：persona 里那段前置提醒只在 `lead-mode` 预设里，不切过去就看不到。所以第一次先敲 `/lead-mode` 看依赖：缺 Team 运行时它会给下一步，新一代是会话开关，老一代才是带版本号的安装命令。

`team-digest` 同理。它不绑预设，任何会话可用，收尾时模型自己判断要不要写汇总。

## 友链：dsh-context

本插件只做 Lead 模式。团队状态与通信的可视化是 **dsh-context** 的活，那是另一个项目：

| 项 | 值 |
|---|---|
| 仓库 | https://github.com/bowenliang123/dsh-context |
| 作者 | bowenliang123 |
| 许可 | Apache-2.0 |
| 装法 | `dsh plugin --profile <你的 profile 名> add dsh-context` |

它不随本插件安装，也不是本插件的依赖。本插件只在文档和 skill 里指个路。

### 为什么指到这里

工具调用只能一条条读。`list_agents` 给一行状态，`team_task_list` 给任务归属。要看整队谁在干什么、谁跟谁说了什么，得开一页。

dsh-context 在每个会话里加一个 **编队 / Fleet** 标签页（在 **Context** 右边），右栏的 **Context** 面板里有同一张卡。

| 区块 | 看什么 |
|---|---|
| 概要 | 成员状态、实时上下文、预估花费、任务进度 |
| Agent Network | 当前 agent、它的父级、全部子代理，一人一张卡 |
| Fleet Members | 每个成员的角色、模型、最新回复、运行时长、步数、在办任务数 |
| Tasks | 团队任务与子代理派活放一起，按 owner 分组，带 blocked-by 链 |
| Agent Comms | 谁跟谁说了什么。团队消息、邮箱投递、运行时的结算通知都在这里 |

点图上的成员或成员卡，Tasks 与 Agent Comms 会收窄到那一个人。Agent Comms 里点开一条能看到完整记录：来自哪个会话日志、第几号事件、是运行时写的结算通知还是子代理自己发的、完整收尾报告。

Lead 模式 skill 里也写了这个入口，所以派活时模型会直接让你去这儿看进度。

## 依赖的官方 bundle 与版本

本插件不捆绑下面这些包。它们由宿主或官方 bundle 提供；带版本约束的那些写在 `peerDependencies` 里，profile 包不在其中，要用户自己装。

| 包 | 版本要求 | 谁提供 | 缺了会怎样 |
|---|---|---|---|
| `@deepseek-ai/dsh-experimental-agent-team-profile` | `0.2.2-rc.1` | 用户显式安装，只给老一代宿主 | 只在老一代宿主上：派不了活，`/lead-mode` 报 error，启动 warn |
| `@deepseek-ai/dsh` | `>=0.2.2-rc.1` | 宿主 | 装不上 |
| `@deepseek-ai/cordis` | `^4.0.5` | 宿主 | 装不上 |
| `@deepseek-ai/schemastery` | `^3.18.5` | 宿主 | 装不上 |
| `@deepseek-ai/dsh-agent-preset-registry` | `>=0.2.2-rc.1` | 宿主 | 预设行不生效，`/lead-mode` 报「查不到」 |
| `@deepseek-ai/dsh-skill` | `>=0.2.2-rc.1` | 宿主 | skill 不注册，启动 warn |
| `@deepseek-ai/dsh-commands` | `>=0.2.2-rc.1` | 宿主 | `/lead-mode` 不注册，启动 warn |

目标宿主版本写在 `package.json` 的 `dshTarget` 字段：`0.2.2-rc.1`。

第一行只管老一代宿主。新一代宿主上这个包已进 `RETIRED_BUNDLES`，不需要装，也装不住。

## 为什么老一代的安装命令要带版本号

`@deepseek-ai/dsh-experimental-agent-team-profile` 在 npm 上有三个 dist-tag：

| dist-tag | 版本 | 配哪个宿主 |
|---|---|---|
| `latest` | 0.1.5-alpha.2 | 0.1.x |
| `alpha` | 0.2.2-alpha.3 | 0.2.2 线早期预览 |
| `next` | 0.2.2-rc.1 | 0.2.2 |

裸写包名，npm 解析 `latest`，装到 0.1.5-alpha.2。这个版本是给 0.1.x 宿主用的，在 0.2.2 宿主上挂不上。装完 dsh 里看不到 Team 工具，`/lead-mode` 还是报「未挂载」。

实测（2026-10-26，npm 11.20.0）：

```
$ npm view @deepseek-ai/dsh-experimental-agent-team-profile version
0.1.5-alpha.2
```

所以本插件文案里所有出现安装命令的地方都带 `@0.2.2-rc.1`：persona prefix、`/lead-mode` 输出、启动 warn、SKILL.md，也就是当前的 `dshTarget`。`test/preset.test.mjs` 与 `test/smoke.test.mjs` 都断言这个字符串在，防止以后被改回裸包名。

`next` 现在指向 `0.2.2-rc.1`，就是本插件钉的版本；`alpha`（`0.2.2-alpha.3`）是同一条线的早期预览。

## 与官方 standard 预设的差异

只有 persona 一处。其余 21 行逐字段照抄 `standard`。

| 项 | standard | lead-mode |
|---|---|---|
| persona prefix | `You are a coding agent powered by the {{model}} model.` | 中文 Lead 人设 + Agent Teams 前置检查 |
| 其余 21 行 | — | 与 standard 逐字段相同 |

classic subagent 三行（`tool-subagent-control`、`tool-subagent`、`tool-subagent-fork`）保持启用，没有禁用。`list_agents` 现在由 `tool-subagent-control` 自己注册，不再单列一行。Team 工具由 host 决定，不由预设决定。

## 为什么预设里不塞 Team 运行时

`@deepseek-ai/dsh-experimental-tool-agent-team` 的 `apply()` 监听全局 `agent/created`，给每一个 agent 装 Team 工具。它是 host 平面的插件，放进预设会漏到所有会话。

所以本插件的定位是：预设 + 两个 skill + 提醒。开不开 Team 运行时：老一代宿主由用户装官方 profile 包决定，新一代由会话开关决定。

## 目录

```
package.json          包元数据，dsh.bundle.patch 指向 cordis.patch.yml
cordis.patch.yml      两行 insert：本插件 + lead-mode 预设
lib/index.js          host 半边：扫 skills/ 逐个注册、注册命令、启动自检
skills/lead-mode/     Lead 工作法正文
skills/team-digest/   团队汇总正文
dsh-plugin.naming.json  命名清单
test/                 行为断言，零依赖
```

## 开发

```bash
node --check lib/index.js
node --test test/*.test.mjs
node scripts/check-patch.mjs
```

测试零依赖，不用 `npm install`。`test/` 目录形式只在 Node 22+ 被接受，Node 20 会用 glob 展开。

## 发新版本

推 tag 触发 `.github/workflows/release.yml`，发布走 npm 的 Trusted Publishing（OIDC）。不存 token，也不弹 2FA。

发之前先在 npmjs.com 配一次 Trusted Publisher：

| 字段 | 填什么 |
|---|---|
| Organization or user | `xiebaiyuan` |
| Repository | `dsh-lead-mode` |
| Workflow filename | `release.yml` |
| Allowed actions | 勾上 `npm publish` |

`npm stage publish` 是默认就允许的，只勾它的话 CI 只能暂存，还得人工 approve 才上线。

配好后：

```bash
npm version patch --no-git-tag-version
git commit -am "chore: bump to 0.1.3"
git tag v0.1.3
git push origin main --tags
```

tag 的版本必须和 `package.json` 一致，否则 workflow 直接退出，不发。同一个版本发第二次会被 npm 拒掉，所以每次发都要先提版本号。

## License

MIT