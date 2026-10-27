# dsh-lead-mode

中文 | [English](README.md)

给 DSH 加一个 Lead 模式。一个预设、一个 skill、一个自检命令、两条前置提醒。

装好后模型能按 Lead 的方式干活：拆活、派活、验收。动手的活尽量派出去。

## 提供的能力

四样东西，都不碰 dsh 本体。

| 能力 | 入口 | 你要做什么 |
|---|---|---|
| Lead 模式预设 | 预设下拉里的「Lead 模式」 | 切过去 |
| Lead 工作法 skill | `/skill lead-mode`，模型也会自己加载 | 不用管 |
| 依赖自检 | `/lead-mode` | 依赖不对时敲一下 |
| 两层前置提醒 | 自动 | 不用管 |

### 一、Lead 模式预设

切过去，这个会话的模型就换成 Lead 人设。

预设内容等于官方 `standard` 预设的全部 22 行，只把 persona 换掉。工具一个不少：bash、文件读写、搜索、web、todo、skill、goal、plan、compaction、subagent、workflow 全在。

也就是说，切到 Lead 模式不会让你少任何能力，只是换了工作方式。

### 二、Lead 工作法 skill

一套拆活、派活、验收的方法，随包分发。

它不绑预设。任何会话都能加载，两条路：

- 模型判断需要时自己加载（skill 标记为模型可调用）
- 你直接敲 `/skill lead-mode`

覆盖这些内容：开工前对齐目标、派活必须自包含、写作用域不重叠、共享任务的 list/get/claim/complete 流程、怎么等 teammate、teammate 的模型从哪来、最终验证自己做。

其中两条是读源码才确认的，容易踩：

| 事实 | 为什么重要 |
|---|---|
| teammate 收工会自动通知你，通知里带它收尾那条消息 | 派完活结束回合就够，不用盯着等 |
| task 变更不会唤醒空闲的 Lead | 别指望「它把 task 标 complete 了我就知道了」，那条路只唤醒正在 `wait_agent` 的调用方 |

所以 skill 的默认建议是：派完活就结束回合等通知（用户立刻看到进展），只有本回合内就必须拿到结果时才用一次 `wait_agent`。不要 `wait_agent` 套循环，也不要反复 `list_agents` 轮询。

派活 prompt 里要要求 teammate **把交付物写进收尾那条消息**——那条消息会随通知回到你手上。

### 三、依赖自检命令

`/lead-mode` 报告当前依赖状态。

| 报什么 | 内容 |
|---|---|
| Team 运行时 | 挂没挂；挂了报 `maxMembers` |
| lead-mode 预设 | 注册没注册 |
| 缺东西时 | 给带版本号的安装命令 |

依赖齐全返回 success，缺东西返回 error。不会静默跳过。

### 四、两层前置提醒

这是本插件存在的主要理由：**本会话没有 Team 工具时，提醒你去开官方 Agent Teams，而不是让模型硬干。**

走两条路：

| 通道 | 谁看得见 | 什么时候出现 |
|---|---|---|
| persona 第一段 | 模型 | 一切到 Lead 模式就在。system prompt 的第 0 段 |
| 启动 warn 与 `/lead-mode` | 用户 | 检测到 Team 运行时缺失时 |

两条讲同一件事：没有 `spawn_teammate` 这套工具就先停下来，告诉你装什么、怎么装。

模型不会假装能派活，也不会拿 `subagent` 顶替 teammate。

## 装之前先开 Team 运行时

Lead 模式靠 `spawn_teammate`、`send_message`、`team_task_*` 这些工具派活。它们由 dsh 官方的 Team 运行时提供，本插件不带。

```bash
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.1-rc.3
```

**必须带版本号。** 不带会装到 `latest` 上的 0.1.5-alpha.2，那是给 0.1.x 宿主用的，在 0.2.1 宿主上挂不上。`next` 指向的 0.2.1-rc.3 才对。装完重启 dsh。

不确定装没装？进 dsh 敲 `/lead-mode`，它会报依赖状态。

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

**2. 敲 `/lead-mode` 查依赖。** 这条命令不派活，只报状态。缺东西时它给出带版本号的安装命令。

**3. 让模型干活。** 派活工具齐了，模型会自己拆活、派给 teammate、等齐再收尾。工具不齐，它第一句就是让你去开 Team 运行时。

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

本插件不捆绑下面这些包。它们由宿主或官方 bundle 提供，本插件只在 `peerDependencies` 里声明版本要求。

| 包 | 版本要求 | 谁提供 | 缺了会怎样 |
|---|---|---|---|
| `@deepseek-ai/dsh-experimental-agent-team-profile` | `0.2.1-rc.3` | 用户显式安装 | 派不了活，`/lead-mode` 报 error，启动 warn |
| `@deepseek-ai/dsh` | `>=0.2.1-rc.2` | 宿主 | 装不上 |
| `@deepseek-ai/cordis` | `^4.0.5` | 宿主 | 装不上 |
| `@deepseek-ai/schemastery` | `^3.18.5` | 宿主 | 装不上 |
| `@deepseek-ai/dsh-agent-preset-registry` | `>=0.2.1-rc.2` | 宿主 | 预设行不生效，`/lead-mode` 报「查不到」 |
| `@deepseek-ai/dsh-skill` | `>=0.2.1-rc.2` | 宿主 | skill 不注册，启动 warn |
| `@deepseek-ai/dsh-commands` | `>=0.2.1-rc.2` | 宿主 | `/lead-mode` 不注册，启动 warn |

目标宿主版本写在 `package.json` 的 `dshTarget` 字段：`0.2.1-rc.3`。

## 为什么安装命令要带版本号

`@deepseek-ai/dsh-experimental-agent-team-profile` 在 npm 上有三个 dist-tag：

| dist-tag | 版本 | 配哪个宿主 |
|---|---|---|
| `latest` | 0.1.5-alpha.2 | 0.1.x |
| `alpha` | 0.2.1-alpha.5 | 0.2.1 预发布线 |
| `next` | 0.2.1-rc.3 | 0.2.1 |

裸写包名，npm 解析 `latest`，装到 0.1.5-alpha.2。这个版本是给 0.1.x 宿主用的，在 0.2.1 宿主上挂不上。装完 dsh 里看不到 Team 工具，`/lead-mode` 还是报「未挂载」。

实测（2026-10-26，npm 11.20.0）：

```
$ npm view @deepseek-ai/dsh-experimental-agent-team-profile version
0.1.5-alpha.2
```

所以本插件里所有出现安装命令的地方都带 `@0.2.1-rc.3`：persona prefix、`/lead-mode` 输出、启动 warn、SKILL.md。`test/preset.test.mjs` 与 `test/smoke.test.mjs` 都断言这个字符串在，防止以后被改回裸包名。

要装 `alpha` 线的话自己换成 `@0.2.1-alpha.5`，别用裸名。

## 与官方 standard 预设的差异

只有 persona 一处。其余 21 行逐字段照抄 `standard`。

| 项 | standard | lead-mode |
|---|---|---|
| persona prefix | `You are a coding agent powered by the {{model}} model.` | 中文 Lead 人设 + Agent Teams 前置检查 |
| 其余 21 行 | — | 与 standard 逐字段相同 |

classic subagent 四行（`tool-subagent-control`、`tool-subagent-list-agents`、`tool-subagent`、`tool-subagent-fork`）保持启用，没有禁用。Team 工具由 host 决定，不由预设决定。

## 为什么预设里不塞 Team 运行时

`@deepseek-ai/dsh-experimental-tool-agent-team` 的 `apply()` 监听全局 `agent/created`，给每一个 agent 装 Team 工具。它是 host 平面的插件，放进预设会漏到所有会话。

所以本插件的定位是：预设 + skill + 提醒。开不开 Team 运行时，用户用官方 profile 包决定。

## 目录

```
package.json          包元数据，dsh.bundle.patch 指向 cordis.patch.yml
cordis.patch.yml      两行 insert：本插件 + lead-mode 预设
lib/index.js          host 半边：注册 skill、注册命令、启动自检
skills/lead-mode/     Lead 工作法正文
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