# 安装与用法

[← 返回 README](../README.zh-CN.md) · [English](en/usage.md)

本篇覆盖从安装到日常使用的完整细节：两条安装路径、三步上手、五项能力细则、官方依赖包清单，以及老一代宿主安装命令必须钉死版本号的原因。如果想快速了解，看 README 里的「快速上手」即可；如果想了解设计取舍，见 [design.md](design.md)。

## 安装插件

任选一种安装方式：

从 npm 安装：

```bash
dsh plugin --profile <你的 profile 名> add dsh-lead-mode
```

从 GitHub 安装：

```bash
dsh plugin --profile <你的 profile 名> add https://github.com/xiebaiyuan/dsh-lead-mode
```

装完重启 DSH，在新会话的预置下拉列表里就能看到「Lead · PTC」与「Lead · 创造」。

## 三步上手

1. **切换 Lead 预置**：在新会话预置列表里选择「Lead · PTC」或「Lead · 创造」。切换后，system prompt 第 0 段即替换成 Lead 人设，并附上 `lead-mode` skill 指针。两个预置的 persona 逐字相同，只差工具集。
2. **输入 `/lead-mode` 检查依赖**：该命令不派活，只诊断当前会话的 Team 运行时与两个预置注册状态；若缺组件，按当前宿主代际给出会话开关提示或老宿主装包命令。
3. **开始派活**：依赖齐备后，模型会自动拆解任务、并行派给成员、等通知验收并收尾；若 Team 工具未挂载，模型第一句话就会停手并提示开启。

## 只用 skill，不切换预置

不换预置也能用这套方法。只要插件已安装，在 `standard`、`ptc` 或自定义预置的会话里输入 `/skill lead-mode` 即可加载工作法（模型认为需要时也会自己调用）。

区别在于系统不会在每轮开头附带 persona 短指针，因此首次使用建议先敲一次 `/lead-mode` 确认 Team 运行时状态。`team-digest` 同理，不绑定预置，任意会话收尾前均可按触发条件使用。

## 提供的五项能力

所有能力均为只增不改，不侵入 DSH 本体（详见 [design.md](design.md)）：

| 能力 | 入口 | 你需要做什么 |
|---|---|---|
| Lead 预置（两个） | 预置下拉「Lead · PTC」或「Lead · 创造」 | 选择一个切换 |
| Lead 工作法 skill | `/skill lead-mode`（模型可自动加载） | 不用管 |
| 团队汇总 skill | `/skill team-digest`（收尾前按条件加载） | 不用管 |
| 依赖自检命令 | `/lead-mode` | 怀疑缺依赖时运行 |
| 两层开场提示 | 写入 persona 与启动 warning | 自动生效 |

### 一、Lead 预置（两个）

Lead 只换协作方法，不改变工具能力，因此两个预置逐字段镜像对应的官方预置：

| 预置 | 插件行数 | 基线 | 差异 |
|---|---|---|---|
| `lead-ptc` | 24 | 官方 `ptc` 逐字段复制 | 只换 persona |
| `lead-cordis` | 23 | 官方 `cordis`（创造）逐字段复制 | 换 persona；`skill-filesystem` 不带 `customSkillDirs` |

- **`lead-ptc`**：PTC 形态。只有 `run_code` 能直接调用，bash、文件读写、搜索、web、todo、skill、goal、plan、compaction、subagent、office 与 `team_task_*` 都在 TypeScript 程序里通过 `tools.xxx()` 调用；`workflow` 两行沿用官方 `ptc` 的禁用配置。
- **`lead-cordis`**：native 创造形态。工具可直接调用，保留 `tool-cordis`、`planning` 分组与 `workflow` 行，适合修改 DSH 本体或编写插件；不包含 `ptc` 侧的 `tool-executor-ptc` 与 `tool-office`。

`lead-cordis` 唯独省略了 `skill-filesystem` 里的 `customSkillDirs`：官方表达式用 patch 文件自身的 `baseUrl` 去解析 `@deepseek-ai/dsh-agent-preset`，外部插件目录解析不到宿主包会加载抛错，因此去掉该配置（代价是 `dsh-doc` skill 不在此预置的文件系统目录中）。

#### 人设里的四条硬边界

| 边界 | 落地方式 |
|---|---|
| 只判断、派活、讲结论 | 控制面（`list_subagent_models`、`list_agents`、`team_task_*`、`send_message`）由 Lead 自调；代码、文件、日志、CI、包检查等业务面一律派给成员。缺 Team 即停手，不用 `subagent` 冒充团队成员 |
| 验收派独立成员 | 测试、diff 核对、CI 与包内容检查交给未参与实现的独立成员带回命令与输出；若本轮只有实现者本人，则另派一个只读成员复跑，不退回 Lead 自己跑 |
| 标准定高，返工不自己补位 | 判据写成可执行命令、精确数字或 `路径:行号`；只说「已通过」不算证据。同一件事退回两次仍不通过，就换人、砍掉做不到的部分（判据不降）或停下来问用户 |
| 从可选清单挑成员模型 | 派活前先调 `list_subagent_models`，从返回清单成对挑选 `provider/model`（可带推理档），禁止编造 id；清单只有一条说明未授权其他模型，别强行指定 |

**关于按成员挑模型的前提**：宿主「设置 → 子智能体 → 模型选择」默认关闭。关闭状态下，显式传别的 `provider/model` 会直接报错，所有成员继承 Lead 当前的模型与推理档，不会自动挑更便宜的模型。如需分模型派活，请先打开「允许 Agent 为子智能体选择模型」并勾选允许列表，再**新开会话**生效（老会话会在创建时锁定模型授权清单，继续用老会话可能报 `child LLM route "…" is not allowed for this Session`）。

### 二、Lead 工作法 skill（`lead-mode`）

`skills/lead-mode/SKILL.md`（456 行）随包扫描注册，不绑定预置，覆盖整套 Lead 运转流程：

- **开工判型与目标对齐**：先区分 PTC 还是 native、判断老一代还是新一代 Team、没开就停手；开工前定清主目标 `#1..#M` 判据。
- **分级拆活与并行派单（§12 & §9.2）**：先按主目标、支撑（必须写明阻塞判据与停止线）、枝节分级，再按文件写作用域判并行；枝节和降级耗时验收不进并行队列，直接记入 `.scratch/<effort>/leftovers.md`（降级查法需为可粘贴命令、路径或「对象 + 入口 + 判据」走查步骤）。
- **消息驱动与任务板**：熟练运用 `team_task_*` `list/get/claim/complete`，醒来先核主目标进度（§9.3），不因枝节回报新派单。
- **独立验收与止损**：判据全过即停，独立验收只核既有判据与直接回归、不扩范围；极端场景可按严格三条件与五限制触发一次同模型方案专家。
- **上下文交接与多轮控制**：涵盖压缩检测、交接四步、`worklog` / `handoff` 规范，以及多轮长程控制。

主文件之外配备五份按需参考（位于 `skills/lead-mode/references/`，通过注册时传入的 `resourceBase: { kind: 'directory', path }` 基准目录解析，不占常驻上下文）：

| 参考文件 | 何时按需读取 | 核心内容 |
|---|---|---|
| `ptc-calls.md` | 处于 `lead-ptc` 会话 | PTC 下 `run_code` 调用形状与安全并发读 |
| `old-gen.md` | 宿主仍有 `spawn_teammate` | 老一代建成员参数、状态值与上限说明 |
| `member-models.md` | 需按任务挑成员模型 | 路由选型指南与长程停滞模型升级联动 |
| `tool-signatures.md` | 编写派活调用前 | 两代工具名与参数对照表 |
| `long-horizon.md` | 预计 ≥2 轮派单或跨模块长程任务 | `N/M` 进度账与 `todo_write`/`create_goal` 边界、分层验收（全量默认最多 2 次）、连续 2 轮无增长切更强模型（如 Opus）`fresh` 跑 1 轮再止损、Lead 压缩后三步重锚 |

**读宿主源码确认的两条关键行为**：

| 宿主事实 | 操作含义 |
|---|---|
| 成员收工会自动触发结算通知，内含收尾消息（`Its closing message:`） | 派完活结束回合即可，不必挂着等待 |
| `team_task_*` 状态变更不会唤醒空闲的 Lead | 老一代只唤醒正在等 `wait_agent` 的调用方；新一代只看自己收件箱。不能指望靠任务标 complete 触发通知 |

因此 Lead **不调用 `wait_agent`**（它只等自己收件箱，还会空耗 `run_code` 的 120 秒默认预算），也不用 `list_agents` 轮询；需要催办直接发 `send_message`，并在派活 prompt 中要求成员把交付物写进收尾消息。

### 三、团队汇总 skill（`team-digest`）

多成员协作收尾时，产出容易分散在多条收尾消息和多份工作日志里。`team-digest` 将它们收拢为一份持久化的团队汇总：

| 项 | 规则 |
|---|---|
| 触发条件 | 给最终答复前，本轮有 2 个以上成员或跨 2 轮以上 |
| 输出路径 | `reports/<YYYY-MM-DD>-<effort>.md`，收尾一次成型 |
| 六块固定骨架 | 结论 / 谁干了什么 / 验收证据 / 偏离与未验证 / 死路与决策 / 未决与下一步 |
| 取材顺序 | 先读收尾消息搭骨架，工作日志补细节，会话日志兜底 |

第 1 块「结论」首行固定报 `主目标：达成/部分达成/未达成（N/M）`（单独调用缺主目标判据时降级写 `主目标：未验证（缺主目标判据）`），某块无内容写「无」。`reports/` 下两份早期样例（`2026-10-29-team-digest.md`、`2026-11-11-readme-redesign.md`）已标注历史说明横幅，不作为当前范例效仿。细节见 [skills/team-digest/SKILL.md](../skills/team-digest/SKILL.md)（共九节）。

### 四、依赖自检命令（`/lead-mode`）

| 检查项 | 报告内容 |
|---|---|
| Team 运行时 | 是否挂载；老一代已挂载时顺带报 `maxMembers` |
| 两个预置 | `lead-ptc` 与 `lead-cordis` 各自注册状态；只生效一半会点名缺的那个 |
| 缺失指引 | 新一代提示会话开关；老一代提供带版本号的安装命令 |

依赖齐全返回 success，缺失任一项返回 error，不静默跳过。

### 五、两层开场提示

当会话缺 Team 工具时，插件通过两条通道让模型停手并给出提示：

| 通道 | 读者 | 触发时机 |
|---|---|---|
| persona 第 0 段 | 模型 | 切到 `lead-ptc` 或 `lead-cordis` 时自动进入 system prompt |
| 启动 warning 与 `/lead-mode` | 用户 | 检测到 `agentTeams` 缺失或手动执行自检命令时 |

在老一代宿主上，模型遇到缺 Team 工具会立即停下，不拿 `subagent` 顶替团队成员；新一代宿主的成员本来就是通过 `subagent` 建立的，但仍以 `team_task_*` 是否存在判断是否已开启团队协作开关。

## 依赖的官方 bundle 与版本

本插件不捆绑以下包，它们由 DSH 宿主提供（或老宿主由用户显式安装）：

| 包名 | 版本要求 | 提供方 | 缺失影响 |
|---|---|---|---|
| `@deepseek-ai/dsh-experimental-agent-team-profile` | `0.2.2-rc.1` | 仅老一代宿主需用户安装 | 老宿主无法派活，`/lead-mode` 报 error 并启动 warning |
| `@deepseek-ai/dsh` | `>=0.2.2-rc.3` | 宿主 | 无法安装插件 |
| `@deepseek-ai/cordis` | `^4.0.5` | 宿主 | 无法安装插件 |
| `@deepseek-ai/schemastery` | `^3.18.5` | 宿主 | 无法安装插件 |
| `@deepseek-ai/dsh-agent-preset-registry` | `>=0.2.2-rc.3` | 宿主 | 预置不生效，`/lead-mode` 报「查不到」 |
| `@deepseek-ai/dsh-skill` | `>=0.2.2-rc.3` | 宿主 | skill 无法注册，启动 warning |
| `@deepseek-ai/dsh-commands` | `>=0.2.2-rc.3` | 宿主 | `/lead-mode` 无法注册，启动 warning |

`package.json` 中的 `dshTarget` 为 `0.2.2-rc.3`（对应新一代宿主基线）。第一行的 `@deepseek-ai/dsh-experimental-agent-team-profile` 在新一代宿主已移入 `RETIRED_BUNDLES`，切勿在新宿主安装。

## 为什么老一代安装命令要带 `@0.2.2-rc.1`

`@deepseek-ai/dsh-experimental-agent-team-profile` 在 npm 上有三个 dist-tag：

| dist-tag | 版本 | 适配宿主 |
|---|---|---|
| `latest` | `0.1.5-alpha.2` | 0.1.x |
| `alpha` | `0.2.2-alpha.3` | 0.2.2 线早期预览 |
| `next` | `0.2.2-rc.1` | 0.2.2 老一代 |

不带版本号安装会解析 `latest`（`0.1.5-alpha.2`），与 0.2.2 宿主完全不匹配，装完也无法挂载 Team 工具（2026-10-26 实测 `npm view @deepseek-ai/dsh-experimental-agent-team-profile version` 仍返回 `0.1.5-alpha.2`）。

因此本插件的所有老宿主指引（`/lead-mode` 输出、启动 warning、`SKILL.md`）都显式钉死 `@0.2.2-rc.1`，对应老一代最后发布线的 `next` 标签（而 `package.json` 的 `dshTarget: 0.2.2-rc.3` 则用于约束新一代宿主最低兼容版本）；persona prefix 故意不塞长命令，以节省每轮常驻上下文。

两代具体参数与并行规则见 [agent-teams.md](agent-teams.md)。
