# 为什么需要 dsh-lead-mode

## 问题：Agent Teams 默认不开

DSH 有两套派活的工具。

| | classic subagent | Agent Teams |
|---|---|---|
| 工具名 | `subagent`、`subagent_fork` | `spawn_teammate`、`send_message`、`team_task_*` |
| 子 agent 之间 | 互相看不见 | 共享任务板，能互相发消息 |
| 谁派活 | 父 agent 一次派一个，拿回结果就结束 | Lead 常驻，teammate 也常驻，可以多轮 |
| 能不能中途改主意 | 不能，子 agent 跑完才回来 | 能，`send_message` 在下一个 step 边界改方向 |
| 默认装不装 | 装，官方 `standard` 预设自带 | 不装，要单独加 profile 包 |

用 `standard` 预设开会话，模型手里只有 `subagent`。想干「三个人并行改三个模块、中途还能调整」这种活，模型只能拿 `subagent` 凑：派三个子 agent，等它们各自跑完，中间插不进话，也看不到彼此进度。

这不是模型能力问题。工具没挂上，它就派不了。

## 问题二：提醒没地方放

官方 Team 运行时由 profile 包提供：

```
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.1-rc.5
```

用户不知道这条命令。模型也不知道，因为它拿到的 system prompt 里没有任何一句说「本会话缺 Team 工具，你应该让用户去开」。

于是常见结果是：用户说「你找几个人并行干」，模型硬着头皮用 `subagent` 顶替，或者干脆自己串行做完。两种都不对。

## 这个插件做什么

三件事，都不改宿主行为。

### 1. 一个叫 `lead-mode` 的预设

`cordis.patch.yml` 里插一行 `@deepseek-ai/dsh-agent-preset`。它的 `config.plugins` 逐行照抄官方 `standard` 预设的 22 个插件行，只改一处：persona 的 prefix 换成 Lead 人设。

prefix 开头就是那段提醒：开工先查有没有 `spawn_teammate`、`send_message`、`team_task_create`、`team_task_update`。没有就停下，让用户去开官方 Team 模式，给出带版本号的安装命令。

这段 prefix 进 system prompt 的 `DEPLOYMENT_PERSONA_PREFIX` 段，模型一定看得见。

除 persona 之外每一行都与 `standard` 一致。这个约束由 `test/preset.test.mjs` 守着：行 id 集合必须完全相同，一个不多一个不少。以后谁往 preset 里塞东西，测试就红。

### 2. 一个 `lead-mode` skill

随包分发的 `skills/lead-mode/SKILL.md`，运行时注册进 skill 列表。内容是 Lead 工作法：派活自包含、写作用域不重叠、共享任务 list/get/claim/complete、等齐 teammate 再收尾、最终验证自己做。

模型调到它就能拿到这些规则，不用用户每次复述。

### 3. 一个 `/lead-mode` 斜杠命令

用户敲 `/lead-mode`，返回当前依赖状态：Team 运行时挂没挂、`lead-mode` 预设注册没注册、缺什么、怎么装。

装了就能用，没装就告诉你怎么装。不用翻文档。

## 为什么安装命令要带版本号

`@deepseek-ai/dsh-experimental-agent-team-profile` 在 npm 上有三个 dist-tag：

| dist-tag | 版本 | 说明 |
|---|---|---|
| `latest` | 0.1.5-alpha.2 | 旧版，配 0.1.x 宿主 |
| `alpha` | 0.2.2-alpha.2 | 0.2.2 线，别和 0.2.1 宿主混用 |
| `next` | 0.2.1-rc.5 | 配 0.2.1 宿主 |

裸写包名安装，npm 解析 `latest`，装到 0.1.5-alpha.2。这个版本和 0.2.1 宿主对不上，装完不挂。

所以插件里所有出现安装命令的地方都带 `@0.2.1-rc.5`，且 `test/preset.test.mjs` 与 `test/smoke.test.mjs` 都断言这个字符串在。防止以后有人图省事把版本号删掉。版本号还必须等于宿主版本（`dsh --version`）：团队包把 peer 钉死到具体版本，钉错 peer 对不上。

下面两处实测数据（manifest 对照、tarball 对比）是在 rc.3 上做的，保留原值作为证据。现在钉的 rc.5 结构相同：同样没写 `engines.dsh`，peer 里同样只有 `cordis`，同样把 `dsh-*` peer 钉到具体版本。

### 兼容性预检为什么拦不住装错

dsh 在装插件前会做一次兼容性预检。看上去这该拦住装错版本，实际拦不住。

预检读插件 manifest 的方式是 `pnpm view <spec> name version engines peerDependencies --json`（`dsh-plugin-manager/lib/index.js` 的 `namedSpecManifest`）。它只读，不改选版本。读到什么就装什么，不兼容就整体拒绝（`nothing was installed`），兼容就原样交给 `pnpm add`。

判定规则在 `dsh-app-boot/lib/index.js` 的 `unmetRequirements`：

1. manifest 有 `engines.dsh` → 只用它判，peer 全部忽略
2. 没有 → 只看 `peerDependencies` 里名字是 `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-` 开头的项

实测两个版本的 manifest：

| 版本 | `engines` | `peerDependencies` |
|---|---|---|
| 0.1.5-alpha.2 | 无 | `@deepseek-ai/cordis: ^4.0.2` |
| 0.2.1-rc.3 | 无 | `@deepseek-ai/cordis: ~4.0.5` |

两个版本都没写 `engines.dsh`，peer 里只有 `@deepseek-ai/cordis`。这个名字不匹配 `@deepseek-ai/dsh`，也不以 `@deepseek-ai/dsh-` 开头，判定循环里直接跳过。

结果：`unmetRequirements` 返回空，预检判为完全兼容，0.1.5-alpha.2 被静默装进去。

插件作者不写 `engines.dsh` 就绕过了这套机制。这是上游包的问题，不是本插件能修的。本插件能做的只有两件事：安装命令带版本号，以及测试断言版本号在。

### 装错版本会怎样

拆开两个 tarball 对比 `cordis.patch.yml`，三处实质差异：

| | 0.1.5-alpha.2 | 0.2.1-rc.3 |
|---|---|---|
| `tool-subagent` | 改配置，加 `backgroundMode: one-shot` | 整行 `disabled: true` |
| `tool-subagent-fork` | 改配置，加 `backgroundMode: one-shot` | 整行 `disabled: true` |
| `agent-team` 的 `maxPendingMessagesPerMember` | 有，值 64 | 没有这个字段 |
| `ui-agent-team` | 没有这一行 | 有 |

装错版本的后果：classic subagent 没被禁用，它和 Team 工具抢同名工具 `list_agents`、`send_message`、`interrupt_agent`；Web 界面那一半不出现。

0.2.1-rc.3 的 patch 注释写明这些禁用行是为了「keep direct delegation and coordination on the Team tools」。装成 0.1.5 版本，这个前提不成立。

### 本插件自己写了 engines.dsh

本插件的 `package.json` 有 `engines.dsh: ">=0.2.1-rc.2"`。所以 dsh-lead-mode 会被预检正确判定，装到不兼容的宿主上会被拒绝，不会静默装错。

官方 team profile 包没写这个字段。差别就在这里。

## 为什么插件不捆绑 Team 运行时

早期想法是在 `cordis.patch.yml` 里顺手把 `@deepseek-ai/dsh-experimental-agent-team` 也插进去，用户装一个包就全齐。

这个想法行不通。`@deepseek-ai/dsh-experimental-tool-agent-team` 的 `apply()` 监听全局 `agent/created` 事件，给每个 agent 装 Team 工具。它是宿主平面的插件，不是预设里的一行。

塞进预设的结果是双挂：宿主已经有一份，预设再挂一份，工具注册冲突。用 `!!js` 守卫判断「已存在就禁用」能绕开，但这是在跟宿主的装配方式较劲，不是解决问题。

所以定位收窄：本插件只负责预设、skill、提醒三件事。Team 运行时由官方 profile 包提供，用户显式装。插件负责让用户和模型都知道该装、怎么装。

## 和手写 patch 比

不做这个插件也能达到同样效果：自己在 profile 的 `cordis.patch.yml` 里写一行 `@deepseek-ai/dsh-agent-preset`，把 `standard` 的 22 行抄过去，改 persona，再手写一个 SKILL.md。

代价是：

| | 手写 patch | 本插件 |
|---|---|---|
| 抄 22 行插件配置 | 自己抄，抄错不报错 | 已抄好，测试守着与官方一致 |
| 官方 `standard` 升级后 | 自己比对追平 | 升级本插件版本 |
| SKILL.md 分发 | 自己放，自己注册 | 随包走 |
| 依赖状态自查 | 无 | `/lead-mode` 一条命令 |
| 卸载 | 手动删行 | 卸载包 |

如果你只想要一次性的东西，手写更快。如果你会在多个 profile、多台机器上用，插件省事。

## 边界

- 不改宿主行为。只插入预设行、注册 skill 和命令。
- 不代开 Team 模式。安装官方 profile 包是用户显式动作。
- 缺服务只警告，不阻断。`skills` / `commands` / `agentTeams` 任一缺失时插件照常挂载，只丢掉对应的面。
