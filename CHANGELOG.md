# Changelog

## 0.2.17

这版精炼全部 7 份随包 skill 的用词、触发指针与完成标准（零约束丢失、56 条测试锁全绿），并把 `0.2.16` 之后的英文文档与 README 更新一并纳入发版。

- **7 份 skill 用词与指针精炼**。按 `writing-for-agents-cn` 与 `GLOSSARY.md` 重写 `lead-mode` 主文件（462 行 → 456 行）、5 份 `references/` 外挂与 `team-digest` 主文件：收紧两个 `description` 的触发分支，消除禁用别名（「名额」改为「成员上限」、「实现者自检」改为「仅实现者运行」、「报告」改为「团队汇总 / 答复 / 内置汇总工具」、「原料出处」改为「原料来源」）及口语填充，统一「老一代宿主 / 新一代宿主」称谓与 `references/*.md` 反引号路径。
- **完成标准改写与跨节去重**。`lead-mode` §1–§5 的「完成标准」改为 Lead 运行时可判定的执行动作；将跨节重复展开的 `subagent_fork` 互斥说明与收尾通知省略规则收束为指向 §6、§5.2 的短指针，非硬边界改用正面目标表述；所有工具签名、版本号、错误码原文与数值边界完整保留。
- **中英文文档与视觉同步**。包含 `0.2.16` 之后合入的 `docs/en/` 英文文档体系、指挥信标星阵图标重绘、中英文 README 友链及 `docs/usage.md` / `docs/en/usage.md` 行数标注更新。
- **版本**。`package.json` 升至 `0.2.17`，两份 README 的版本行同步。

## 0.2.16

这版补齐多轮长程任务防跑偏机制：常驻人设锚定主目标与长程止损，主文件收紧判级优先于并行与验收边界，拆出第五份按需外挂 `long-horizon.md` 管多轮进度账、分层验收与停滞升级。

- **常驻人设精简至 468 字**。`cordis.patch.yml` 两个预置的 persona 同步改写，补入「先保主目标，枝节记遗留」与「长程止损」两处锚点，仍在 480 字上限以内；两预置配置行与官方基线不变。
- **`lead-mode` 主文件收紧长程与验收护栏**。明确先按 §12 判级再按 §9.2 判并行（枝节即使写作用域不重叠也不进并行队列）；新增 §9.3「醒来动作：先核主目标，不被枝节带偏」；支撑活必须写明阻塞哪条主目标判据与停止线（解除阻塞即止）；降级验收的「后面怎么查」允许填写可复现走查步骤（对象 + 入口 + 判据）；写明「判据全过即停」与「独立验收不扩范围」（范围外发现记入遗留清单，不触发额外返工）。
- **新增第五份外挂 `skills/lead-mode/references/long-horizon.md`（121 行，6 节）**。预计 ≥2 轮派单/验收或跨模块推进时按需加载：主目标判据 `N/M` 进度账与 `todo_write` / `create_goal` 落盘边界、分层验收（全量默认最多 2 次）、连续 2 轮 `N` 无增长先查 `list_subagent_models` 切更强模型（如 Opus 等旗舰推理档）`fresh` 接手跑 1 轮再止损问用户、Lead 上下文压缩后三步重锚、3 轮跨模块样例。`references/member-models.md` 同步补入停滞升级联动。
- **团队汇总、术语表与历史样例对齐**。`team-digest` 第 1 块「结论」首行固定 `主目标：达成/部分达成/未达成（N/M）`（单独调用缺判据时降级写 `主目标：未验证（缺主目标判据）`），第 6 块同步接受走查步骤；`GLOSSARY.md` 增补「主目标」「支撑」「枝节」三词条并更新「状态摘要」「遗留问题清单」；`reports/2026-10-29-team-digest.md` 与 `reports/2026-11-11-readme-redesign.md` 两份早期样例加历史说明横幅。
- **测试锁与文档同步**。`test/preset.test.mjs` 与 `test/smoke.test.mjs` 补齐长程防跑偏测试锁；两份 README 与 `docs/` 同步 468 字、五份外挂与新能力说明。
- **版本**。`package.json` 到 `0.2.16`，两份 README 的版本行同步。

## 0.2.15

这版修一处 skill 外挂读不到的缺陷，再补两条 Lead 的干活规矩：拆活先分主目标与枝节，并行把账算清。

- **修掉一个会让 skill 外挂读不到的问题**。插件注册 skill 时没有传 `resourceBase`，宿主就拿不到基准目录，`skills/lead-mode/SKILL.md` 里 10 处 `references/*.md` 相对路径因此解析不了（表现为静默读不到，或者在项目里撞上同名 `references/` 目录读错文件）。现在注册时传 `{ kind: 'directory', path: <包内该 skill 目录> }`，宿主会渲染 `Base directory for this skill: …`；`test/smoke.test.mjs` 锁住该字段。0.2.14 带这个缺陷，装 0.2.14 的人升上来就好。
- **新增「主目标优先，枝节进遗留清单」**。拆活分主目标、支撑、枝节，枝节不进本轮并行队列。验收分两档：核心判据必跑，耗时的全量验收可以降优先级，但降了必须落进 `.scratch/<effort>/leftovers.md`（五列：编号、问题、为什么现在不做、后面怎么查、什么时候回看）；「后面怎么查」必须能粘贴，写不出来不许降级；收尾必须报数，一条也没有就写「遗留：无」。`team-digest` 第 6 块只写编号、一句话、清单路径，不把整张表贴进汇总。
- **并行补强**。写明并行只省墙钟时间，没有依赖还排队是纯亏；只读验收不占写作用域，可以和实现同时开。
- **文档与预置注释**。`GLOSSARY.md` 新增「遗留问题清单」；`docs/usage.md` 补拆活分三级、遗留清单与 `resourceBase` 机制；`docs/agent-teams.md` 补只读验收并行；两份 README 各加一句；`cordis.patch.yml` 一处注释改成说清 persona 不判代际、只指向 skill 与查 `team_task_*`（persona 未动，两预置配置行未动）。
- **版本**。`package.json` 到 `0.2.15`，两份 README 的版本行同步。

## 0.2.14

两个随包 skill 按「写给 agent 读」那套写法重写：压掉自造词，按会话类型重排读法，只在特定会话用得上的细节挂到外挂文件。代码、预置、命令、测试行为不变。

- **`lead-mode` 20 节压到 14 节，拆出四个 `references/` 外挂**：`ptc-calls.md`（PTC 下的调用形状）、`old-gen.md`（老一代 `spawn_teammate` 的细节）、`member-models.md`（按活挑成员模型）、`tool-signatures.md`（两代工具名与参数差异）。主文件只留挂点，按路由表读到哪类会话再打开对应那份。
- **结构按分支重排**：开工先判 PTC 还是 native、再判哪一代，然后照「路由表：按你的组合读」按组合读。老一代与 PTC 的细节移进外挂，混着读会照抄另一代的工具名。
- **术语统一**：清掉「代际」「形态」「账本」「隔离区」「一发子弹」五个自造词；`teammate` 改用「成员」、`验收标准` 改用「判据」，其余旧称呼按上下文改为成员、收尾、判据，测试逐字断言的那句保留原字面。
- **修掉三处会让 agent 干错的地方**：路由表给「PTC + 老一代」「native + 老一代」两行补上「名册与状态」那一节（老一代的成员状态取值与完成通知只在那里讲，原来跳过去会漏读）；一处交叉引用原指向并不存在的小节，改成按小节名指；`team_task_create` 与 `team_task_update` 的必填参数、`action` 的八个取值补回正文。
- **`description` 改成触发词优先**，并补上「老一代宿主上工具清单里连这些名字都看不到」这个原本不触发的场景。
- **`team-digest` 补上「单独调用时怎么降级」一节**：没有 lead-mode 的团队上下文时只写手上有的材料，不为凑六块去猜；同时把「原料怎么取」按三层写清、给「宿主事实」标明是当前行为、`/team-digest` 改成 `/skill team-digest`。
- **文档同步**：`docs/` 与两份 README 换词，`docs/usage.md` 补上四份外挂的说明；`cordis.patch.yml` 两处预置卡片描述里的「形态」改成「PTC 会话」「native 会话」，persona 未动。
- **版本**。`package.json` 到 `0.2.14`，两份 README 的版本行同步。

## 0.2.13

派活多一维「并行度」。互不依赖、写作用域不重叠的块，一次全派完；有产出依赖才排顺序。

- `skills/lead-mode/SKILL.md` 新增「能并行的就一起派」一节：两条判据（后一块不读前一块的产出、写作用域不重叠）、四类天然可并行（只读查证、盘点扫描、独立验收、互不重叠的实现）、三类不能并行（有产出依赖、同文件、抢可变状态）。六维表加「并行度」一维。
- 澄清升级通道里那句「只派一个、只派一次」只管同模型专家，不管并行派普通成员。
- 人设里加两个提示词（`并行`、`一次派完`），raw 470 / trim 469，仍六段；字数上限 480 未动。
- `docs/agent-teams.md` 新增「哪些活能并行派」一节，两份 README、`docs/usage.md`、`docs/design.md`、`docs/why.md` 同步。

## 0.2.12

这版只修一处词义碰撞。「一轮」在同一节里既指整件活、又指成员自己那一遍，读到要停下来猜。

- **「难度升级：一次同模型专家」一节里，指代整件活的「一轮」换成「一件活」**。第一条硬限制三处同词：「一件活里最多一次」「从派单到收尾算一件活」「也算同一件活」；第五条「报成本」的「这轮」改成「这件活」。第四条「一轮到底」原样保留，那句说的是成员自己那一遍。改完这一节里「轮」只出现在第四条那一句（「一轮到底，不给多轮迭代的预算」），两处都说成员自己那一遍。
- **同一用法统一到「共享任务流程」开头与 `GLOSSARY.md`**。「共享任务流程」开头的「一轮活要不要建共享任务板」、「同模型专家」词条里的「一轮活最多派一次」和「这轮有一次同模型派单」，都改成「一件活」「这件活」；词条里的「一轮到底」不动。
- **版本与其余**。`package.json` 到 `0.2.12`，两份 README 的版本号同步。persona 未动（raw 449 / trim 448，六段），代码、预置、命令、测试行为不变。

## 0.2.11

这版加一条兜底通道：活反复做不对、又属于判断力密集的活时，可以升一次级。默认手段没变，变的只是多了一个受控的例外。

- **persona 的 skill 指针补上「难度升级」**。P2 的清单从「两代差异、从零还是继承、挑模型、要不要任务板、写作用域、验收」变成末尾多一项「难度升级」，persona 448 字、仍是六段。
- **`skills/lead-mode` 新增「难度升级：一次同模型专家」一节**。三个条件同时成立才派（同一件事退回两次还不过、活属于设计/审美这类判断力密集的事、`list_subagent_models` 里能选到你当前这一对 `provider`/`model`）；五条硬限制按 skill 的顺序是——只派一个、只派一次；只要方案，不要它动手；范围钉死；一轮到底；报成本。要换更强的模型不在这条通道里，先问用户。预置里 `subagent_fork` 没有 `provider`/`model` 参数，不传就继承 Lead 那一对，所以同模型不必显式指定；真正互斥的是「显式换模型」与「继承上下文」。
- **`GLOSSARY.md` 新增「同模型专家」词条**。和 Lead 用同一个模型的独立成员，只出方案不动手，一轮一次；别叫成升级模型、大模型兜底。
- **文档同步**。`docs/{why,design,usage}.md` 与两份 README 的 skill 覆盖面补上难度升级，persona 字数 443 → 448；`package.json` 到 `0.2.11`。

## 0.2.10

这版改两件事：persona 第一段有一句话会被反向理解，堵掉；再给 Lead 加一条「标准要严、返工不自己补位」的口径，写进 persona 和 skill。代码、预置结构、命令都没变，测试只多了两条锁新口径的断言。

- **删掉「回话自己做」「查证」两个词**。P1 从「查证与验收都派成员做，回话自己做」改成「了解现状与验收都派成员做，结论由你判断、由你讲给用户」。原措辞紧跟在「查证与验收都派成员做」后面、用分号连着，读起来像「除了查证和验收，其余由 Lead 自己做」，等于给自己留了一条「先自己复核一遍再回话」的口子，正是这版要消灭的行为。改后的说法与 `lead-mode` skill 开头那句同源，插件里不再用两个词讲同一件事。
- **「查证」换成「了解现状」**。「查证」容易被读成「核实成员的回报」，而 skill 里那件事是让成员去核证据，不是 Lead 自己核。两份 README 的开头一句同步换词。
- **persona 尾部加一句「标准要严、判据要具体、不将就，退回返工不自己补位」**。persona 变成 443 字、仍是六段。用户的诉求是「严谨、细致、极致，但不要亲力亲为」，这几个词没当口号堆进去，而是翻成可核对的动作写进 skill。
- **`skills/lead-mode` 新增「标准定高，返工不自己补位」一节**。判据写成能粘贴的命令、能对照的数字、能指到的行号；「已通过」不算证据，核不到就退回；退回时说清缺哪一条。返工上限写死：同一件事退回两次还不过，就换人、缩范围或停下来问用户——「缩范围」是砍掉做不到的部分并明说砍了什么，判据不降。不写上这个，「极致」会变成无限返工。
- **`docs/usage.md` 边界表加一行**「标准定高，返工不自己补位」，表格从三条变四条，标题跟着改；原来按序号指代的「第三条的前提是……」，改成按内容指代。
- **`test/preset.test.mjs` 加两条 needle 断言**，锁住新口径，防止以后被静默改掉。
- **字数与版本**。`docs/{why,design}.md` 与两份 README 里 persona 的字数、分段描述跟着改；`package.json` 到 0.2.10。

## 0.2.9

这版改的是 Lead 的职责边界：Lead 只做判断、派活、把结论讲给用户。它碰的是控制面（`list_subagent_models`、`list_agents`、`team_task_*`、`send_message`，调这些本身就是派活），业务面（代码、文件、日志、CI、包）的调查与验收都归成员，验收另派一个没参与实现的成员。怎么派活（从零还是继承、挑哪个模型、建不建任务板、写作用域怎么切）写进 persona 与 skill，由 Lead 自己判断。

- **persona 两段重写**。P1 改成「只做决策、拆活、派活，不自己写代码、不改文件；查证与验收都派成员做，回话自己做」；P2 改成「两代差异、从零还是继承、挑模型、要不要任务板、写作用域、验收，都在里面」。两预置逐字相同，408 字、六段。
- **字数上限放宽到 479**。`scripts/check-patch.mjs` 与 `test/preset.test.mjs` 这条线从 400 提到 480（写满 479 通过，到 480 报错），给后面加规则留余量。
- **`skills/lead-mode` 新增「派活方式由你判断」一节**。五维表：上下文、模型与推理档、形态、任务板、写作用域，每维给备选与判据；末尾写明硬约束——本插件预置里 `subagent_fork` 没有 `provider`/`model`/`reasoning_effort`，继承上下文与按活挑模型互斥。
- **skill 里 Lead 的动手项改成派成员**。开头主句改成控制面自己调、业务面派成员；查压缩状态、读 profile 里的模型授权、过最终 diff、最终验证、核验收证据，都改成派只读成员或独立验收成员做。验收兜底也写进去：本轮只有实现者本人时另派一个只读成员复跑，不退回自己跑。
- **`skills/team-digest` 的证据等级跟着改**。验收证据一栏记「是谁复跑的」，独立验收成员跑过的最高级，只有实现者跑过的不算。
- **文档口径同步**。`GLOSSARY.md` 的 Lead 词条改成判断、派活、讲结论并写明控制面与业务面，新增「验收」词条；`docs/{usage,why,design}.md` 与两份 README 的人设字数、段数、职责描述、验收归属、任务板建不建一起改；历史条目里的「398 字」保持原样。
- **版本**。`package.json` 到 `0.2.9`；`engines.dsh` 与 `dshTarget` 不动。

## 0.2.8

这版只动文档，代码、预置、命令、测试行为跟 0.2.7 一样。改的是话怎么说：术语表不再拿英文当词头，正文里那些只有熟这套工具的人才懂的词，换成日常说法。

- **GLOSSARY 重写**。词头换中文、英文放括号里；`_Avoid_` 改成「别叫成」；每条第一句先讲清这东西是什么，再讲细节。
- **术语改名**。成员名额→成员上限、交接阶梯→交接四步、过程产物→产物、证据指针→来源标记。
- **正文换词**。effort→这轮活、mate/teammate→成员、worklog→工作日志、handoff→交接文档、digest→团队汇总、前置提醒→开场提示、能力面/工具面→工具集。
- **同步范围**。两份 README 与 `docs/{usage,design,why,agent-teams,development}.md` 五篇一起改；工具名、命令、路径、版本号、链接、代码块一字未动。
- **随包分发的两个 skill 同步换词**。`skills/lead-mode` 与 `skills/team-digest` 里的交接阶梯→交接四步、过程产物→产物、证据指针→来源标记、成员名额→成员上限；`test/smoke.test.mjs` 的标题定位与报错文案跟着改，断言一条没放松。
- **修一处原文笔误**。`docs/agent-teams.md` 写「下面两条限制」，实际列了 4 条，改成四条。
- **`package.json` 的 description 跟着改**。「两条前置提醒」改成「两条开场提示」，英文那半句同步。
- **版本**。`package.json` 到 `0.2.8`；`engines.dsh` 与 `dshTarget` 不动。

## 0.2.7

原来一个 `lead-mode` 预置拆成两个：`lead-ptc`（照抄官方 `ptc`，24 行）与 `lead-cordis`（照抄官方 `cordis` 创造模式，23 行）。Lead 只换方法不换能力，PTC 会话与创造会话的工具面本来就不同，合成一个等于替用户做能力取舍。

- **两个预置**。`cordis.patch.yml` 的三行 insert：本插件、`preset-lead-ptc`（id `lead-ptc`、order 5、24 行）、`preset-lead-cordis`（id `lead-cordis`、order 6、23 行）。两行官方预置一个字没动。
- **persona 改写，398 字，两个预置逐字相同**。六段：只做决策/拆活/派活/验收、不自己写代码不改文件；加载 `lead-mode` skill；派活前 `list_subagent_models` 从可选清单挑 provider/model 成对给（可带推理档，别编造 id）；开局先判 Team 开没开、没开就停手让用户敲 `/lead-mode`；派完活结束回合、不调 `wait_agent`、不轮询；要求成员第一步建 `.scratch/<effort>/worklog-<mate>.md`。
- **`lead-cordis` 的 `skill-filesystem` 不带 `customSkillDirs`**。官方 `cordis` 那条值是一段 `!!js`，按 patch 文件自己的 `baseUrl` 解析 `@deepseek-ai/dsh-agent-preset/package.json`；本插件的 `baseUrl` 在 profile 的 `node_modules/dsh-lead-mode/`，解析不到那个包，照抄加载即抛错。代价：`dsh-doc` skill 不在该预置里。
- **`lib/index.js` 报两个预置**。`PRESET_IDS` 是 id 数组（`['lead-ptc','lead-cordis']`），`presetState()` 返回逐预置状态，`/lead-mode` 每行报「已注册」/「未注册」/「查不到」，两者都齐才算依赖齐；成功文案由同一份清单拼出来，不再硬编码两个 id。
- **测试**。`test/preset.test.mjs` 改表驱动：`lead-ptc` 对 `test/fixtures/ptc-preset.yml`、`lead-cordis` 对新增的 `test/fixtures/cordis-preset.yml`（官方 `cordis.patch.yml` 原样副本），各比一遍行 id 集合与逐字段；断言两个 persona 逐字相同。`smoke.test.mjs` 的 `agentPresets.list` mock 全改成两个 id，新增「只注册了一个时点名缺的那个」用例。`scripts/check-patch.mjs` 改成逐个预置核对。
- **`test/support/yaml-lite.mjs` 修 bug**。预处理会把 `- !!js expr` 拆成缩进 +2 的一行，`parseSeq` 当 mapping 解析而抛错；新增 `isMappingHead()`，非 seq 非 mapping 头就当行内标量解析。
- **文档**。两份 README、`docs/{usage,design,why,agent-teams,development}.md`、`GLOSSARY.md` 全部改成两个预置；`design.md` 的「与官方 ptc 的差异」一节改成「与官方预置的差异」，带 24/23 对照与 `customSkillDirs` 的解析细节。
- **禁止 Lead 等待**。Team 本来就是消息驱动：成员收工、发消息都会起 Lead 的新一轮，`wait_agent` 只等自己收件箱，挡不住成员干活，还白耗 `run_code` 的 120 秒预算。persona、`skills/lead-mode/SKILL.md`、`docs/usage.md`、`docs/agent-teams.md`、两份 README 统一成「派完活结束回合，不 `wait_agent`、不轮询，催人用 `send_message`」，测试加了禁等待断言。
- **术语与开关名对齐宿主**。全仓「预设」统一成 GLOSSARY 定的「预置」；会话开关按 rc.5 的实际标签改为「开启智能体团队协作」（旧宿主是「使用智能体团队」）。
- **迁移提示**。0.2.7 删掉了旧的 `lead-mode` 预置：已切到它的会话会回落到默认预置，重开一次预置下拉选 `lead-ptc` 或 `lead-cordis` 即可。
- **文档对齐代码**。两份 README 的版本行、`docs/usage.md` 依赖表与 `dshTarget`、`docs/why.md` 的 `engines` 全部改到 `0.2.2-rc.3`；`lead-cordis` 有 `planning` 分组（此前写成没有）、`tool-office` 只加在 `lead-ptc`，两处纠正；persona 字数统一 398。
- **兼容性核对报告**。新增 `reports/2026-11-20-compat-rc5.md`，逐项记录 0.2.2-rc.5 的工具名、必填参数、模型选择两层开关与 `session` 钉死清单。
- **版本**。`package.json` 到 `0.2.7`；`engines.dsh` 与 `dshTarget` 先留 `>=0.2.2-rc.3`。

## 0.2.6

预置基线从官方 `standard` 换成官方 `ptc`，lead-mode 会话默认走 PTC（模型写 TypeScript 程序调工具）。同时跟上宿主 0.2.2-rc.3，会话开关的文案改到新版叫法。

- **预置对齐 ptc**。照抄 `ptc` 相对 `standard` 的四处差异：新增 `tool-executor-ptc`，`workflow-ptc` 与 `tool-workflow` 各加 `disabled: true`，`tool-plugin-manager` 的 `disabled` 从条件表达式改成 `true`。与官方 `ptc` 逐字段一致，差异仍只有 persona。
- **跟上 0.2.2-rc.3**。rc.3 的 `ptc` 又变了两处，一起照抄：`tool-subagent-control` 加 `config.interrupt: false`，`present` 之后加 `tool-office`。顶层 plugins 从 23 行变成 24 行。`standard` 新加的 `skill-filesystem.customSkillDirs` 只出现在 standard，`ptc` 没有，这里不补。
- **`interrupt_agent` 默认关闭**。rc.3 起 `tool-subagent-control` 的 `interrupt` 默认 false，内置配置显式关掉。skill 里所有打断写法都加了条件：工具清单里没有它时改用 `send_message` 要求成员停在安全点；要硬打断，得让用户把 `interrupt` 开成 `true`。
- **PTC 读工具可以并发**。rc.3 把 `team_task_list`、`team_task_get`、`list_agents` 标成并发安全（`isConcurrencySafe`），skill 的 PTC 一节补了 `Promise.all` 的用法。
- **测试基线重切**。`test/fixtures/ptc-preset.yml` 取自 0.2.2-rc.3 的官方 `ptc.patch.yml`（块 md5 `508b07f82e449bf5998d019267f693e3`）；`test/preset.test.mjs` 的「与 standard 相同」断言全部改成与 ptc 相同，比较逻辑没放宽。
- **skill 增一节「PTC 模式下怎么调工具」**。写清只有 `run_code` 能直调、`team_task_*` 与 `subagent` 走 SDK 里的 `tools.xxx()`、直调会被拒、派活可以一次程序里连派、不要在程序里用 `wait_agent` 等全部成员（一次程序默认 120 秒、上限 600 秒）。判据表补了执行形态判定：工具清单里只有 `run_code` 可直调就是 PTC，`team_task_*` 要出现在 SDK 块里才算 Team 已开。
- **开关改名**。新版宿主菜单叫「开启智能体团队协作」，`lib/index.js` 的会话开关提示与两个 skill 桩位改成新名，并注明旧宿主叫「使用智能体团队」。`/lead-mode` 的分支结构没动。
- **文档**。两份 README、`docs/why.md`、`docs/design.md`、`docs/usage.md`、`docs/agent-teams.md` 里「照抄 standard」的说法全部改成 `ptc`；`agent-teams.md` 新增 PTC 调用形态一节与「打断默认关」的说明；`GLOSSARY.md` 加 PTC 词条。
- **版本**。`package.json` 到 `0.2.6`；`engines.dsh` 与 `dshTarget` 抬到 `>=0.2.2-rc.3` 与 `0.2.2-rc.3`，peer 同步。原因：`tool-office` 行与 `interrupt` 配置键都是 rc.3 才有，旧宿主装上会加载失败。

## 0.2.5

persona prefix 从 2002 字压到 314 字（issue #1）。两代工具的逐个参数、装包命令、等通知与验收细则本来就在 `lead-mode` skill 里，prefix 只留判据、停手规则和一句指路。另把 GitHub Release 接进发布流水线。

- **prefix 瘦身**。原前缀每轮都进 system prompt，约占 300 汉字以上，还要模型每轮做一次工具自检。现在只留三句：查 `team_task_*`、缺了就停手、让用户敲 `/lead-mode`。「派活要求成员先建工作日志」这条硬要求保留在 prefix 里，因为它是派单时的即时约束。
- **完整命令下放**。装包命令、版本号说明、两代工具逐个参数、「没开 Team 怎么办」的顺序，全部只出现在 `/lead-mode` 输出与 `lead-mode` skill 正文，按需加载。
- **测试转向**。`test/preset.test.mjs` 从「prefix 必须带版本号」改成「prefix 不该带完整命令、不该带 `spawn_teammate` 参数、总长 < 400 字」，并新增一条断言 skill 里仍然保有可粘贴的安装命令与 `RETIRED_BUNDLES` 说明。
- **GitHub Release 自动化**。`v*` tag 触发：npm 发布成功后在 Actions 里用 `CHANGELOG` 对应小节建 Release 并标记 Latest；新增 `scripts/changelog-section.mjs`（缺版本就非零退出）；支持手动触发 `<tag>` 给已有 tag 补建，已存在则只更新说明。`--generate-notes` 不用，本仓库直接推 main，自动 notes 只有 commit 标题。
- **版本**。`package.json` 到 `0.2.5`；`engines.dsh` 与 `dshTarget` 不动。

## 0.2.4

兼容新一代 Agent Teams 定义（尚未发版的 subagent 式 teammate）：teammate 从 `spawn_teammate` 换成 `subagent`。老一代宿主（≤ 0.2.2-rc.1，工具里还有 `spawn_teammate`）的行为不变：装包命令、`/lead-mode` 老分支输出、skill 老分支步骤语义都不动，只修了一处版本说明的笔误。

- **两代定义分开写**。老一代的 teammate 由 `spawn_teammate` 建，是持久命名的成员，`send_message` 用 `target`，`wait_agent` 属 team 工具、等成员状态与任务变更、没人能产出变更时立刻回 `noProgress`。新一代的 teammate 由 `subagent` 建（要继承历史用 `subagent_fork`），成员身份是 Session id 加一个从根算起的 agent 名（根固定叫 `lead`），`send_message` 与 `interrupt_agent` 改用 `agent` 参数，`wait_agent` 搬进 subagent 控制工具，只等调用者自己的收件箱，只回 `{ timedOut }`。
- **任务变更不再指望唤醒**。新一代里 task 变更不唤醒任何等待、也不启动空闲成员；要成员处理任务就得 `send_message` 叫它。老一代仍是「task 变更只唤醒正在 `wait_agent` 的调用方」。
- **成员可以单独挑模型**。新一代的 `subagent` 接受 `provider`、`model`、`reasoning_effort`（`standard` 预置已开 `modelSelection`），`agent_preset` 可指定预置。老的「teammate 继承 Lead、不能单独指定模型」只对老一代成立。
- **任务板字段**。四个 `team_task_*` 工具名字不变，`claim` 照旧要带当前 `revision`；新一代 owner 可以填成员名或 Session id，判据字段是 `ownerId` 而不是 `ownerName`。
- **新宿主不要再装 profile 包**。`@deepseek-ai/dsh-experimental-agent-team-profile` 已进 `RETIRED_BUNDLES`，app-boot 会把它从 profile 里删掉，装了也白装。新一代的 Team 插件随 base 与 web 组合下发，按会话在「模型与推理等级」菜单里打开「使用智能体团队」。装包命令只留给老一代宿主，版本号要跟 `dsh --version` 的输出一致。
- **判定按工具清单，不按版本号**。新一代只在 master 上，没有版本号可指，`@deepseek-ai/dsh-tool-agent-team` 在 npm 上也不存在，所以别用版本边界去判代际。有 `spawn_teammate` 是老一代；没有它但有 `subagent` 和 `team_task_*` 是新一代；`team_task_*` 一个都没有是 Team 没开，先提示会话开关，确认是老宿主才给装包命令。
- **修一处版本说明的笔误**。`VERSION_NOTE` 里写的是「不带版本号会装到 0.1.5-alpha.2，和 0.2.1 宿主对不上」，这条线是 0.2.2，改成「和 0.2.2 宿主对不上」。
- **文档**。两份 README 各增一节「两代 Agent Teams 定义 / Two generations of Agent Teams」，十一行对照：定义位置、建成员、成员身份、发消息、打断、名册、等待语义、任务板 owner、开启方式、成员模型、成员上限；另加一张「怎么知道自己属于哪一代」的判定表，以及老一代装包、新一代开会话开关两段分开的开启步骤。`docs/why.md` 只修正依赖老 API 的断言，不扩写。
- **版本**。`package.json` 到 `0.2.4`；`engines.dsh` 与 `dshTarget` 不动，仍是 `>=0.2.2-rc.1` 与 `0.2.2-rc.1`。

## 0.2.3

适配宿主 0.2.2-rc.1。修的是升级后 Lead 模式面板显示「加载失败」。

- **根因**：0.2.2 删掉了 `@deepseek-ai/dsh-tool-subagent-control` 的 `/list-agents` 子路径导出，`list_agents` 并进主入口的 `apply()`。预置还照抄着 0.2.1 的 `tool-subagent-list-agents` 行，import 解析不到，那行 fiber 停在 `never started`，整个 `preset-lead-mode` 跟着加载失败。上游 `v0.2.1-rc.1/subagent-control-tools` 升级指南写明这三件事。
- **删掉 `tool-subagent-list-agents` 行**。`list_agents` 现在由 `tool-subagent-control` 自己注册，delegation 组内子行从 6 行降到 5 行。
- **`modelSelectionSettings: true` 换成 `modelSelection: true` + `modelDiscovery: true`**。上游把路由选择与发现拆成两个开关，旧键名不再读。工具参数名没变，仍是 `provider`、`model`、`reasoning_effort`、`agent_preset`。
- **`tool-fs` 补 `applyPatch: false`，`tool-plugin-manager` 的 `disabled` 改成 `!!js "!ctx.get('profileContext')"`**。这两处是 standard 预置本次的改动，逐字段对齐的测试要求跟着改。
- **基线重切**：`test/fixtures/standard-preset.yml` 换成 0.2.2-rc.1 的 app.asar 切块。块 md5 `34ddbab4cf5f76afbf055b61c8501659`，130 行，22 个顶层行。
- **版本跟着走**：`dshTarget` 与 `engines.dsh` 改 `0.2.2-rc.1`，团队运行时钉 `@deepseek-ai/dsh-experimental-agent-team-profile@0.2.2-rc.1`（正好是 npm 的 `next`）。persona prefix、`/lead-mode` 输出、启动 warn、`SKILL.md`、两份 README、`docs/why.md` 一起改。`0.2.1` 宿主请继续用 0.2.2 那版。
- **验证**：`npm test` 34 条全绿，`npm run check` 通过。

## 0.2.2

修的是版本钉过期，不是功能。

- **团队运行时从 `0.2.1-rc.3` 改钉 `0.2.1-rc.5`**。团队包把 `dsh-*` 的 peer 钉到具体版本，rc.3 的包在 rc.5 宿主上 peer 对不上。宿主升到 rc.5 后，照旧提示装 rc.3 会把 Team 运行时装成对不上的版本。改动覆盖 persona prefix、`/lead-mode` 输出、启动 warn、`SKILL.md`、两份 README、`docs/why.md`、两条测试常量。
- **`dshTarget` 跟着改成 `0.2.1-rc.5`**，提示文案补一句「版本号要跟 `dsh --version` 的输出一致」，下次宿主升版至少知道该改哪。
- **两份 README 的 dist-tag 数字更新**：`next` 现在指 `0.2.1-rc.5`；`alpha` 已经跳到 `0.2.2-alpha.2`，属于 0.2.2 线，不能和 0.2.1 宿主混用。
- **`standard` 预置基线在 rc.5 上复核**：从 rc.5 的 app.asar 按同一字节串切出的块与 `test/fixtures/standard-preset.yml` 逐字节相同，预置没有漂移。
- **补 `npm test` / `npm run check`**：以前只有 CI 直接调 node，仓库里没有 scripts 字段，`npm test` 会报缺脚本。
- **release workflow 补门禁**：发布前跑命名清单校验与 patch 解析；加一步拒绝低于已发布 `latest` 的版本。

## 0.2.1

README 补上定位与 `team-digest` 的说明。代码与 0.2.0 相同，只改文档。

- **开头写明与官方 Team 模式的关系**：官方 Team 运行时只给 `spawn_teammate`、`send_message`、`team_task_*` 这些工具，不管什么时候派活、怎么等结果、收尾怎么写、多成员产出怎么合并。本插件补这一层，不替代官方 Team 模式。
- **能力表四样改五样**，新增「团队汇总 skill」一节：什么时候写、写到哪、六块骨架、原料分层，细节指回 skill。0.2.0 发版时 README 漏了这一项，还写着「一个 skill」。
- **新增「不干扰官方」三段**：`cordis.patch.yml` 只有两行 `insert`，官方 `standard` 预置一个字没动；不注册工具、不监听 agent 生命周期、不拦截请求；只往 `skills` 与 `commands` 两个注册表写。唯一可能撞的是同名 skill 或命令，宿主按先到先得，撞了只是本插件让位。
- **新增「只用 skill，不换预置」一节**：预置保持 `standard` 也能用，代价是没有 persona 里那段前置提醒，第一次先敲 `/lead-mode` 看依赖。

## 0.2.0

收尾时全队的产出散在 N 条收尾消息和 N 份工作日志里，没人合并，过一周想回看就得重新调查一遍。新增 `team-digest` skill 做这份合并物。插件也从只注册一个 skill 变成能装多个。

**新增 `team-digest` skill。** 收尾时把全队产出写成一份 `reports/<YYYY-MM-DD>-<effort>.md`，六块骨架：结论 / 谁干了什么 / 验收证据 / 偏离与未验证 / 死路与决策 / 未决与下一步。标题写死，某块没内容写「无」。

- **什么时候写**：给最终答复前，本 effort 有 2 个以上成员，或跨 2 轮以上。单成员一轮的小活不产文件。
- **原料按层取，别跳级**：收尾消息做骨架 → 工作日志做过程细节 → 会话日志下钻兜底。一个成员最多下钻一次。
- **异常成员**：第 2 块给状态列（完成、未验证、卡住、被打断、上下文已降级），末尾单列「未验证」清单。状态列会被扫读跳过，单独清单才拦得住半成品当结论。
- **偏离规格的单列一节**：只口头声称、没挂证据指针的一律放这里，不许混进结论和验收证据。

**多 skill 加载。** `lib/index.js` 原来硬编码 `skills/lead-mode/SKILL.md` 一条路径，现在扫 `skills/` 下每个子目录，目录名就是 skill 名，frontmatter 的 `name` 必须与目录名一致。某个 skill 读不到、缺 frontmatter、名字对不上或正文为空，只警告并跳过它，不拖垮另一个。注册顺序按目录名排序，跨宿主稳定。

扫描逻辑导出成 `syncBundledSkills(skillsRoot, registry, warn)`，测试能喂假目录。新加的测试覆盖三种退化：目录里混着坏 skill、`skills/` 整个不存在、单个 skill 注册时抛错。

`dsh-plugin.naming.json` 的 `skills` 加 `team-digest`。不加 `/digest` 命令：触发条件写在 skill 里，模型自己判得出来，不用用户记得敲。

仓库根 `GLOSSARY.md` 加四个词：过程产物、证据指针、死路、团队汇总。`obsidian-docs/adr/` 起第一条 `0001-team-digest.md`，把四条选择各写清备选、依据和推翻条件：不复用任务板、不做增量、独立成 skill、不加命令。

预置与官方 `standard` 的差异仍只有 persona 一处。

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

预置与官方 `standard` 的差异仍只有 persona 一处。

## 0.1.6

把 dsh-context 写成正式友链，中英都标清它是另一个项目。

- 两份 README 的「看工作和通信状态」改名为「友链：dsh-context」/「Friendly link: dsh-context」，并加一张信息表：仓库地址、作者 bowenliang123、Apache-2.0、安装命令。
- skill 同一节补上仓库地址与许可，并写明「不随本插件安装，也不是本插件的依赖」。
- skill 补一句提醒：只有用户装了它，编队页才存在，别让用户去找一个没有的页面。
- 新增一条测试逐项核对两份 README 的友链节（标题、仓库地址、许可、安装命令、三个区块名），并把仓库地址与许可也纳入 skill 的断言。三个变异各删一处都变红。
- 预置与官方 `standard` 的差异仍只有 persona 一处。

## 0.1.5

看整队状态与通信时，指向 dsh-context 的编队页。

- skill 的「状态怎么看」新增「想看全局，用 dsh-context 的编队页」，列出编队页的五个区块（概要 / Agent Network / Fleet Members / Tasks / Agent Comms），并写明入口是「编队 / Fleet」标签页、右栏 Context 面板有同一张卡。
- 两份 README 新增「看工作和通信状态：配 dsh-context」一节，含安装命令与区块表。
- 新增一条测试守住友链、标签页名与三个区块名；删 dsh-context 或删 Agent Comms 都会红（已做变异验证）。
- dsh-context 是另一个插件，不随本插件安装。
- 预置与官方 `standard` 的差异仍只有 persona 一处。

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
- 预置与官方 `standard` 的差异仍只有 persona 一处。

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

- 新增 `lead-mode` 预置：镜像官方 `standard` 预置的全部 22 个插件行，只把 persona 换成 Lead 人设。
- persona prefix 里写明 Agent Teams 前置条件：本会话没有 `spawn_teammate` / `send_message` / `team_task_*` 时，先让用户开官方 Team 模式，不要自己硬干。
- 新增 `lead-mode` 运行时 skill，内容随包分发。
- 新增 `/lead-mode` 斜杠命令，报告 Team 运行时与预置的挂载状态。
- 启动自检：`agentTeams` 服务缺失时输出中文警告。
- 不捆绑 Team 运行时。`@deepseek-ai/dsh-experimental-tool-agent-team` 监听全局 `agent/created`，属宿主平面，由官方 profile 包提供。
