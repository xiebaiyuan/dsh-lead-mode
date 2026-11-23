# 安装与用法

[← 回到 README](../README.zh-CN.md)

这一篇是从装包到日常使用的细节：两条安装路径、三步用法、五样能力分别怎么用、依赖哪些官方 bundle、老一代宿主（跑 dsh 的那个程序）的安装命令为什么必须带版本号。只想先跑起来，看 README 里的「30 秒上手」就够；想知道它为什么这么设计，看 [design.md](design.md)。

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

装完重启 dsh。在预置列表里选一个 Lead 预置：「Lead · PTC」或「Lead · 创造」。

## 用法

三步。

**1. 切到 Lead 预置。** 新会话的预置列表里选「Lead · PTC」或「Lead · 创造」。切过去之后，模型 system prompt 的第一段就换成 Lead 人设，里面那句指向 `lead-mode` skill 的短指针跟着进去。两个预置的人设逐字相同，只有工具集不同。

**2. 敲 `/lead-mode` 查依赖。** 这条命令不派活，只报状态。缺东西时它按你属于哪一代给下一步：新一代提示会话开关，老一代给出带版本号的安装命令。

**3. 让模型干活。** 派活工具齐了，模型会自己拆活、派给成员、等齐再收尾。工具不齐，它第一句就是让你去开 Team 运行时。

## 只用 skill，不换预置

预置不动也能用。插件装好，预置保持 `standard`、`ptc` 或你自己的，任何会话敲 `/skill lead-mode` 就加载那套方法；模型判断任务需要时也会自己加载。

少了一样东西：persona 里那句短指针只在 `lead-mode` 预置里，不切过去就看不到。所以第一次先敲 `/lead-mode` 看依赖：缺 Team 运行时它会给下一步，新一代是会话开关，老一代才是带版本号的安装命令。

`team-digest` 同理。它不绑预置，任何会话可用，收尾时模型自己判断要不要写汇总。

## 提供的能力

五样东西，都不碰 dsh 本体。

| 能力 | 入口 | 你要做什么 |
|---|---|---|
| Lead 预置（两个） | 预置下拉里的「Lead · PTC」或「Lead · 创造」 | 挑一个切过去 |
| Lead 工作法 skill | `/skill lead-mode`，模型也会自己加载 | 不用管 |
| 团队汇总 skill | `/skill team-digest`，模型收尾前自己判断写不写 | 不用管 |
| 依赖自检 | `/lead-mode` | 依赖不对时敲一下 |
| 两层开场提示 | 自动 | 不用管 |

下面逐样说。为什么能做到不碰宿主，看 [design.md](design.md)。

### 一、Lead 预置（两个）

切过去，这个会话的模型就换成 Lead 人设。

Lead 只换方法、不换能力，所以两个预置分别镜像官方两个预置：

| 预置 | 行数 | 基线 | 差异 |
|---|---|---|---|
| `lead-ptc` | 24 | 官方 `ptc` 逐字段 | 只换 persona |
| `lead-cordis` | 23 | 官方 `cordis`（创造）逐字段 | persona，外加 `skill-filesystem` 不带 `customSkillDirs` |

`lead-ptc` 的工具都在，是 PTC：只有 `run_code` 能直调，bash、文件读写、搜索、web、todo、skill、goal、plan、compaction、subagent、office、`team_task_*` 都在程序里用 `tools.xxx()` 调。`workflow` 两行被 `ptc` 禁用，这个预置里也没有。

`lead-cordis` 对应官方「创造」预置：工具能直调，带 `tool-cordis`，适合要改 DSH 自己的会话；它有 `planning` 分组，但没有 `ptc` 侧的 `tool-executor-ptc` 与 `tool-office`，这些差异全部照抄官方。

只有一处和官方不同：官方 `cordis` 的 `skill-filesystem` 行带 `customSkillDirs`。那条 `!!js` 按 patch 文件自己的位置解析 `@deepseek-ai/dsh-agent-preset`，本包从那里解析不到宿主包，照抄会在加载时抛错，所以去掉。代价是 `dsh-doc` skill 不在这个预置的文件系统 skill 目录里。

也就是说，切到 Lead 预置不会让你少任何能力，只是换了工作方式。

### 人设里写死的四条边界

| 规矩 | 怎么落地 |
|---|---|
| 只判断、派活、讲结论 | Lead 碰的是控制面：`list_subagent_models` 挑模型、`list_agents` 看名册、`team_task_*` 管任务板、`send_message` 催人，这些自己调。业务面不碰：代码、文件、日志、CI、包都派成员去看。派不下去就停下让用户开 Team，不自己干完，也不拿 `subagent` 顶替成员 |
| 验收派独立成员 | 跑测试、比 diff、看 CI、核包内容交给没参与实现的成员，把命令和输出带回来；本轮只有实现者本人时，另派一个只读成员复跑，不能退回自己跑。Lead 据此判断能不能收尾 |
| 标准定高，返工不自己补位 | 判据写成能粘贴的命令、能对照的数字、能指到的行号；「已通过」不算证据，核不到就退回。退回时说清缺哪一条。返工有上限：同一件事退回两次还不过，就换人、缩范围或停下来问用户，不硬耗，也不自己上手补。缩范围是砍掉做不到的部分、明说砍了什么，判据不降 |
| 派谁的模型从清单里挑 | 派活前先调 `list_subagent_models`，从返回的可选 provider/model 里成对挑（可带推理档），不许编造 id。清单只有一条 = 没有别的可选（没开开关，或只勾了父模型），别硬写 |

**「派活时从模型清单里挑」那条的前提，是宿主开关打开且清单里勾了别的模型。** 「子智能体 → 模型选择」这一项宿主默认是关的，关着时任何显式选择都只认父路由，传别的 provider/model 直接被拒。要真正按成员挑模型，先去 设置 → 子智能体 → 模型选择，打开「允许 Agent 为子智能体选择模型」，再到「Agent 可选择的模型」里勾上允许的组合。打开之前，成员一律继承 Lead 当前的 provider、model 和推理档——不是自动挑便宜的。

改完设置只有新会话生效。0.2.2-rc.5 装的这版宿主在会话开始时把授权清单钉进会话事件，老会话里派活报 `child LLM route "…" is not allowed for this Session` 就是撞上这条；新开会话读新清单。

### 二、Lead 工作法 skill

一套拆活、派活、验收的方法，随包分发。

它不绑预置。任何会话都能加载，两条路：

- 模型判断需要时自己加载（skill 标记为模型可调用）
- 你直接敲 `/skill lead-mode`

覆盖这些内容：你的角色（控制面自己调、业务面派成员）、开工先判断 PTC 还是 native、哪一代、Team 开没开（没开就停手）、开工前先定三件事、派活的 prompt 与收尾消息（为什么不等成员、派完就结束回合，见 [agent-teams.md](agent-teams.md)）、六维过一遍（派活方式由你判断）、老一代 `spawn_teammate` 与新一代 `subagent` 各走哪条路、写作用域与并行（先按 §12 判级再按 §9.2 判并行、醒来先核主目标见 §9.3，细节在 [agent-teams.md](agent-teams.md) 的「哪些活能并行派」一节）、共享任务板（list/get/claim/complete 流程）、上下文变长怎么办（压缩、复用、交接四步、换人）、验收与收尾（拆活先分主目标、支撑、枝节，支撑须写明阻塞判据与停止线，枝节与降了优先级的耗时验收进 `.scratch/<effort>/leftovers.md`，降级查法支持可粘贴命令、文件路径或「对象 + 入口 + 判据」走查步骤，见 [skills/lead-mode/SKILL.md](../skills/lead-mode/SKILL.md) 的 §12「主目标优先：枝节进遗留清单」一节；标准定高、判据全过即停、独立验收只核既有判据不扩范围、退回返工不自己补位，同一件事退回两次还不过就换人、缩范围或停下来问；难度升级——一次同模型专家的三条件与五条硬限制见 [skills/lead-mode/SKILL.md](../skills/lead-mode/SKILL.md) 的「难度升级：一次同模型专家」一节，不是默认手段）、dsh-context 编队页（可选）、回报怎么写。

正文（462 行）之外还有五份外挂，放在 `skills/lead-mode/references/`，要哪份读哪份，不占常驻上下文：`ptc-calls.md`（PTC 下的调用形状，PTC 会话才读）、`old-gen.md`（老一代：`spawn_teammate` 的细节，只有这个工具的会话才读）、`member-models.md`（按活挑成员模型，要按活挑才读；并联动长程停滞升级）、`tool-signatures.md`（两代工具名与参数差异，写调用前对一眼）、`long-horizon.md`（多轮长程控制回路，121 行，预计 ≥2 轮派单/验收或跨模块推进时才读：覆盖 N/M 进度账与 `todo_write`/`create_goal` 边界、分层验收默认全量最多 2 次、连续 2 轮无增长先查 `list_subagent_models` 切更强模型如 Opus `fresh` 接手跑 1 轮再止损问用户、Lead 压缩后三步重锚）。

正文里能用 `references/*.md` 这样的相对路径指到它们，靠的是注册 skill 时传的 `resourceBase: { kind: 'directory', path }`：宿主只在 `kind` 是 `directory` 时渲染一行 `Base directory for this skill: <路径>`，并不代理解析路径，模型是拿这行当基准目录自己去拼（`lib/index.js`）。

其中两条是读源码才确认的，容易踩：

| 事实 | 为什么重要 |
|---|---|
| 成员收尾会自动通知你，通知里带它收尾那条消息 | 派完活结束回合就够，不用盯着等 |
| task 变更不会唤醒空闲的 Lead | 别指望「它把 task 标 complete 了我就知道了」。老一代只唤醒正在 `wait_agent` 的调用方；新一代谁都不唤醒，`wait_agent` 只等自己的收件箱 |

所以 skill 的规矩是：派完活就结束回合等通知（用户立刻看到进展）。**Lead 不调 `wait_agent`**——它只等自己收件箱，挡不住成员干活，还白耗 `run_code` 的 120 秒预算；要催成员就 `send_message`，也别反复 `list_agents` 轮询。

派活 prompt 里要要求成员 **把交付物写进收尾那条消息**——那条消息会随通知回到你手上。

### 三、团队汇总 skill

收尾时全队产出散在 N 条收尾消息和 N 份工作日志里，没人合并，过一周想回看就得重新查一遍。这个 skill 把它们合成一份 `reports/<YYYY-MM-DD>-<effort>.md`（`<effort>` 是这轮活的名字）。

| 项 | 规则 |
|---|---|
| 什么时候写 | 给最终答复前，这轮活有 2 个以上成员，或跨 2 轮以上 |
| 写到哪 | `reports/<YYYY-MM-DD>-<effort>.md`，单一路径，收尾一次成型 |
| 六块骨架 | 结论 / 谁干了什么 / 验收证据 / 偏离与未验证 / 死路与决策 / 未决与下一步 |
| 原料分层 | 收尾消息做骨架，工作日志补过程细节，会话日志兜底 |

六块标题写死，第 1 块「结论」首行固定报 `主目标：达成/部分达成/未达成（N/M）`（单独调用缺主目标判据时降级写 `主目标：未验证（缺主目标判据）`），某块没内容就写「无」。原料按顺序取，上层够用就不下钻。`reports/` 下两份早期历史样例（`2026-10-29-team-digest.md`、`2026-11-11-readme-redesign.md`）已加历史说明横幅，不作当前范例效仿。细节看 `team-digest` skill（九节，按写汇总的顺序排）。

### 四、依赖自检命令

`/lead-mode` 报告当前依赖状态。

| 报什么 | 内容 |
|---|---|
| Team 运行时 | 挂没挂；老一代挂了再报 `maxMembers` |
| 两个预置 | `lead-ptc`、`lead-cordis` 各自注册没注册；只生效一个会点名缺的那个 |
| 缺东西时 | 按你属于哪一代给下一步：新一代先提示会话开关，老一代给带版本号的安装命令 |

依赖齐全返回 success，缺东西返回 error。不会静默跳过。

### 五、两层开场提示

**本会话没有 Team 工具时，提醒你去开官方 Agent Teams，而不是让模型硬干。**

走两条路：

| 通道 | 谁看得见 | 什么时候出现 |
|---|---|---|
| persona 第一段 | 模型 | 一切到 Lead 预置就在。system prompt 的第 0 段 |
| 启动 warn 与 `/lead-mode` | 用户 | 检测到 Team 运行时缺失时 |

两条都让你在 Team 工具不齐时先停下。persona 只带判据和停手规则；下一步怎么做（新宿主开会话开关、老宿主装 profile 包）在 `/lead-mode` 输出和 skill 里，好让每轮上下文保持短。

老一代宿主上，模型不会假装能派活，也不会拿 `subagent` 顶替成员；新一代的成员本来就是 `subagent` 建的，这条不适用。

## 依赖的官方 bundle 与版本

本插件不捆绑下面这些包。它们由宿主或官方 bundle 提供；带版本约束的那些写在 `peerDependencies` 里，profile 包不在其中，要用户自己装。

| 包 | 版本要求 | 谁提供 | 缺了会怎样 |
|---|---|---|---|
| `@deepseek-ai/dsh-experimental-agent-team-profile` | `0.2.2-rc.1` | 用户显式安装，只给老一代宿主 | 只在老一代宿主上：派不了活，`/lead-mode` 报 error，启动 warn |
| `@deepseek-ai/dsh` | `>=0.2.2-rc.3` | 宿主 | 装不上 |
| `@deepseek-ai/cordis` | `^4.0.5` | 宿主 | 装不上 |
| `@deepseek-ai/schemastery` | `^3.18.5` | 宿主 | 装不上 |
| `@deepseek-ai/dsh-agent-preset-registry` | `>=0.2.2-rc.3` | 宿主 | 预置行不生效，`/lead-mode` 报「查不到」 |
| `@deepseek-ai/dsh-skill` | `>=0.2.2-rc.3` | 宿主 | skill 不注册，启动 warn |
| `@deepseek-ai/dsh-commands` | `>=0.2.2-rc.3` | 宿主 | `/lead-mode` 不注册，启动 warn |

目标宿主版本写在 `package.json` 的 `dshTarget` 字段：`0.2.2-rc.3`。

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

所以本插件文案里所有出现安装命令的地方都带 `@0.2.2-rc.1`：`/lead-mode` 输出、启动 warn、SKILL.md，也就是当前的 `dshTarget`。persona prefix 故意不带命令，`test/preset.test.mjs` 反过来断言它不该出现，好让每轮上下文保持短。

`next` 现在指向 `0.2.2-rc.1`，就是本插件钉的版本；`alpha`（`0.2.2-alpha.3`）是同一条线的早期预览。

两代各自怎么开启、怎么判哪一代，见 [agent-teams.md](agent-teams.md)。
