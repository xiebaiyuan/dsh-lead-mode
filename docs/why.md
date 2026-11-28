# 为什么需要 dsh-lead-mode

[← 返回 README](../README.zh-CN.md) · [English](en/why.md)

## 问题一：Agent Teams 默认不开启

DSH 有两套派活工具，能力边界不同：

| 对比维度 | classic subagent | Agent Teams |
|---|---|---|
| 工具名 | `subagent`、`subagent_fork` | 老一代：`spawn_teammate`、`send_message`、`team_task_*`；新一代：`subagent`、`send_message`、`team_task_*` |
| 子 agent 之间 | 互相不可见 | 共享任务板，可互相发消息 |
| 协作方式 | 父 agent 派一次，拿回结果即结束 | Lead 常驻，成员常驻，支持多轮协作 |
| 中途改方向 | 不行，必须等子 agent 跑完返回 | 可以，通过 `send_message` 在下一个 step 边界调整 |
| 默认是否开启 | 否。Team 由会话开关控制，与预置无关 | 否。老一代需加 profile 包；新一代随 base 与 web 组合下发，按会话打开开关 |

用官方预置（`standard`、`ptc` 或 `cordis`）开会话时，模型手里默认只有 `subagent`。一旦遇到「三个人并行改三个模块、途中还要互相配合」的活，模型只能拿 `subagent` 凑数：同时派三个子 agent，等它们各自跑完返回，中途既插不进话，彼此也看不到进度。

这说明问题不在模型能力，而在工具没挂载。

## 问题二：缺工具时缺乏明确提示

两代宿主（跑 DSH 的程序）提供官方 Team 运行时的方式不同：

- **老一代宿主（`<= 0.2.2-rc.1`）**：由官方 profile 包提供，需要用户显式安装：

```bash
dsh plugin --profile <你的 profile 名> add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1
```

其中 `0.2.2-rc.1` 是老一代最后发布的宿主线，实际安装请按 `dsh --version` 的输出替换版本号。

- **新一代宿主（`>= 0.2.2-rc.3`）**：不再使用上述 profile 包。Team 插件随 base 与 web 组合下发，会话里默认关闭，开关在「模型与推理等级」菜单里，叫**「开启智能体团队协作」**（较早预览版叫「使用智能体团队」）。`@deepseek-ai/dsh-experimental-agent-team-profile` 已进入官方的 `RETIRED_BUNDLES`，新宿主上不要安装。

由于官方预置的 system prompt 里没有任何提示告诉模型「当前会话缺 Team 工具，应当请用户先去打开」，结果往往变成两种误操作：模型硬着头皮用 `subagent` 顶替团队成员，或者自己在单个上下文里串行干完。两种都没用上团队协作，用户也不知道问题出在哪一步。

## 本插件做什么

三件事，且均不修改宿主既有行为：

### 1. 两个预置：`lead-ptc` 与 `lead-cordis`

`cordis.patch.yml` 插入两行 `@deepseek-ai/dsh-agent-preset`：一行按字段照抄官方 `ptc`（24 行），另一行照抄官方 `cordis`（创造，23 行）。两者都只替换 `persona.config.prefix`（`lead-cordis` 另有 `customSkillDirs` 的省略，原因见 [design.md](design.md)）。

拆成两个预置是因为 Lead 只改变工作方法，不增减能力面：PTC 会话与创造会话的工具集本来就不同，强行合二为一等于替用户做能力取舍。

共用一段 475 字的 persona prefix，分成六小段常驻在 `DEPLOYMENT_PERSONA_PREFIX`（每轮模型一定可见）：

1. **角色与判级边界**：只做决策、拆活与派活，调查和验收全派成员，结论自己判断并汇报；先保主目标、枝节记遗留，判据具体且返工不自己补位。
2. **加载工作法 skill**：派活前先读 `lead-mode` skill，获取两代差异、上下文策略、挑模型、任务板、写作用域、并行、验收、自规划与闭环、长程止损与难度升级细则。
3. **模型清单约束**：派活前先调 `list_subagent_models`，从清单成对挑选 `provider/model`，不编造 id；只有一条时成员跟随父模型。
4. **消息驱动与并行**：派完活立刻结束回合等通知，不调 `wait_agent`、不轮询，催人用 `send_message`；互不依赖的活一次全派完。
5. **开局核对 Team 状态**：PTC 查 SDK 块、native 查工具清单是否有 `team_task_*`；缺失立即停手并请用户敲 `/lead-mode`，不单干也不拿 `subagent` 顶替成员。
6. **工作日志约定**：要求成员第一步先建 `.scratch/<effort>/worklog-<mate>.md`，收尾前补完最后一轮。

字数上限放宽到 479 字（达到 480 报错），用于给规则留出清晰边界，而把工具参数、安装命令与长程细节全部留在按需加载的 skill 和参考文档中，避免常驻上下文膨胀。

`test/preset.test.mjs` 会对照官方预置 fixture 逐字段校验：除豁免行外，行 id 集合与字段必须完全一致。

### 2. 两个运行时 skill：`lead-mode` 与 `team-digest`

- **`lead-mode`**（[SKILL.md](../skills/lead-mode/SKILL.md)，外挂 5 份按需参考）：覆盖分级拆活、写作用域隔离、共享任务板 `list/get/claim/complete`、消息驱动等待、独立成员验收与长程控制。模型可自行加载，不用用户每次重述规则。
- **`team-digest`**（[SKILL.md](../skills/team-digest/SKILL.md)）：不绑定特定预置。当本轮工作涉及 2 个以上成员或跨 2 轮以上时，将全队散落的收尾消息与工作日志汇总到 `reports/<YYYY-MM-DD>-<effort>.md`，首行固定输出 `主目标：达成/部分达成/未达成（N/M）`。

### 3. `/lead-mode` 自检命令

输入 `/lead-mode` 立即检查两项状态：Team 运行时是否挂载、以及 `lead-ptc` 与 `lead-cordis` 预置是否各自注册。依赖齐就返回 success，缺哪项就按当前宿主代际直接给出可执行的下一步操作，不用临时翻文档。

## 为什么老一代的安装命令必须带版本号

`@deepseek-ai/dsh-experimental-agent-team-profile` 在 npm 上有三个 dist-tag：

| dist-tag | 版本 | 说明 |
|---|---|---|
| `latest` | `0.1.5-alpha.2` | 旧版，匹配 0.1.x 宿主 |
| `alpha` | `0.2.2-alpha.3` | 0.2.2 线早期预览 |
| `next` | `0.2.2-rc.1` | 匹配 0.2.2 老一代宿主 |

如果不写版本号，npm 默认拉取 `latest`（`0.1.5-alpha.2`），装到 0.2.2 宿主上挂不起来。因此本插件所有面向老宿主的安装命令都锁定了 `@0.2.2-rc.1`，并由 `test/preset.test.mjs` 与 `test/smoke.test.mjs` 守住这串版本号不被误删。同时实际安装版本必须与 `dsh --version` 一致。新一代宿主已不再使用这个包，本节仅适用于老一代宿主。

以下对照数据是在 `0.2.1-rc.3` 宿主线上实测保留的证据，当前 `0.2.2-rc.1` 包结构与它相同（同样未写 `engines.dsh`，peer 里同样只列 `cordis`，且精确锁定 `dsh-*` peer）。

### 为什么宿主兼容性预检拦不住错装

DSH 在装插件前会读 manifest 做预检（`dsh-plugin-manager/lib/index.js` 中的 `namedSpecManifest`），再交由 `dsh-app-boot/lib/index.js` 的 `unmetRequirements` 判定：

1. 若 manifest 有 `engines.dsh`：只按它判定，忽略 peer。
2. 若没有：只检查 `peerDependencies` 中名称等于 `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-` 开头的条目。

实测上游两个版本的 manifest：

| 版本 | `engines` | `peerDependencies` |
|---|---|---|
| `0.1.5-alpha.2` | 无 | `@deepseek-ai/cordis: ^4.0.2` |
| `0.2.1-rc.3` | 无 | `@deepseek-ai/cordis: ~4.0.5` |

两者既没声明 `engines.dsh`，peer 里也只有 `@deepseek-ai/cordis`，预检循环直接跳过，最终判为兼容并静默装进 `0.1.5-alpha.2`。

### 装错版本的后果

对比两个版本的 `cordis.patch.yml` 可以看到四处实质差异：

| 条目 | `0.1.5-alpha.2` | `0.2.1-rc.3` |
|---|---|---|
| `tool-subagent` | 改配置，加 `backgroundMode: one-shot` | 整行 `disabled: true` |
| `tool-subagent-fork` | 改配置，加 `backgroundMode: one-shot` | 整行 `disabled: true` |
| `agent-team` 的 `maxPendingMessagesPerMember` | 有，值 64 | 无此字段 |
| `ui-agent-team` | 无此行 | 有 |

装成 `0.1.5-alpha.2` 后，classic subagent 不会被禁用，会和 Team 工具争抢 `list_agents`、`send_message`、`interrupt_agent` 同名工具，同时 Web 端 Team 界面也会缺失。

### 本插件如何避免错装

本插件在 `package.json` 中显式声明了 `engines.dsh: ">=0.2.2-rc.3"`，宿主预检会严格校验目标宿主版本，不兼容时会直接拒绝安装，不会静默装错。

## 为什么插件不捆绑 Team 运行时

早期曾考虑直接在 `cordis.patch.yml` 里顺便插入 `@deepseek-ai/dsh-experimental-agent-team`，做到一包全齐，但实测行不通。`@deepseek-ai/dsh-experimental-tool-agent-team` 的 `apply()` 监听全局 `agent/created` 事件，属于宿主层全局插件；塞进预置会导致宿主和预置双挂冲突。

因此本插件刻意将职责收敛为预置、skill 与自检提醒三件事，把 Team 运行时的开启权保留给宿主和用户显式操作。

## 和手写 patch 相比

即使不用本插件，也可以直接在 profile 的 `cordis.patch.yml` 里手动复制 `ptc`（24 行）和 `cordis`（23 行）、重写 persona 并自建 `SKILL.md`。两者的维护成本差异如下：

| 对比项 | 手写 patch | 本插件 |
|---|---|---|
| 维护 47 行配置（24 + 23） | 自己复制，错漏不提示 | 由测试守住与官方基线逐字段一致 |
| 官方预置升级追平 | 手动 diff 补行 | 升级插件版本即可 |
| SKILL.md 与参考文件分发 | 手工放置与注册 | 随包自动扫描注册 |
| 依赖就绪自检 | 无 | `/lead-mode` 一键检查 |
| 卸载清理 | 逐行手工删除 | 卸载包即完整回收 |

一次性实验手写很快；长期跨机器、跨 profile 复用，安装插件省事得多。

## 边界

- **不改宿主行为**：只插入两个预置、注册两个 skill 与一条命令。
- **不代开 Team 模式**：无论是新会话开关还是老版本装包，均由用户显式执行。
- **缺服务只警告不阻断**：`skills`、`commands`、`agentTeams` 任一缺失时插件仍可挂载，只打 warning 并禁用对应能力。

安装与日常用法见 [usage.md](usage.md)；不干扰官方与预置差异细节见 [design.md](design.md)。
