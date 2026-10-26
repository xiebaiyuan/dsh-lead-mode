# dsh-lead-mode

DSH 的 Lead 模式。装好后多一个 `lead-mode` 预设、一个 `lead-mode` skill、一个 `/lead-mode` 命令。

它做三件事，都不碰 dsh 本体：

1. 预设：切过去，模型就按 Lead 的方式干活，拆活、派活、验收。
2. skill：Lead 工作法写在里面，模型可以自己加载，你也可以手动加载。
3. 提醒：本会话没有 Team 工具时，模型第一句就告诉你先去开官方 Agent Teams，不硬干。

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

从 GitHub（还没发 npm 时用这条）：

```bash
dsh plugin --profile <你的 profile 名> add https://github.com/xiebaiyuan/dsh-lead-mode
```

装完重启 dsh。在预设列表里选「Lead 模式」。

## 用法

三步。

**1. 切到 Lead 模式。** 新会话的预设列表里选「Lead 模式」。切过去之后，模型的 system prompt 第一段就换成 Lead 人设，开头那段提醒跟着进去。

**2. 敲 `/lead-mode` 查依赖。** 这条命令不派活，只报状态：

- Team 运行时挂没挂，挂了报 `maxMembers`
- `lead-mode` 预设注册没注册
- 缺东西时给带版本号的安装命令

依赖齐了返回 success，缺东西返回 error。

**3. 让模型干活。** 派活的工具齐了，模型会自己拆活、派给 teammate、等齐再收尾。工具不齐，它第一句就是让你去开 Team 运行时，不会自己硬干，也不会拿 `subagent` 顶替 teammate。

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

## `/lead-mode` 输出什么

三条信息：

- Team 运行时在不在，在的话报 `maxMembers`
- `lead-mode` 预设注册没有
- 缺东西时给带版本号的安装命令

依赖齐了返回 success，缺东西返回 error。缺东西不会静默。

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

## License

MIT
