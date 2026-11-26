# 按活挑成员模型（新一代）

按活挑模型时读；默认继承跳过。

## 两层开关

**按成员指定模型由两层开关共同决定，缺一层即只能跟随父模型。**

| 层 | 谁控制 | 默认 | 关着时传 `provider` 会怎样 |
|---|---|---|---|
| 工具实例 `modelSelection: true` | 插件预置，已开 | 开 | 报 `MODEL_SELECTION_DISABLED` |
| 宿主设置「子智能体 → 模型选择」 | 用户 | **关** | 只认父路由；其他路由报 `MODEL_ROUTE_NOT_ALLOWED` |

宿主设置路径：设置 → 子智能体 → 模型选择 → 打开「允许 Agent 为子智能体选择模型」，再到「Agent 可选择的模型」中勾选允许组合。保存后写入 profile 的 patch 文件，**仅新会话读取新清单**，既有会话沿用开局那份。

## 判能不能挑

调 `list_subagent_models()`：

- 返回多条 = 有其他可选项，按清单挑选。
- 只返回一条 = 无其他可选项（可能开关未开，或仅勾选父模型一条）。两种情况均作继承处理，不编造其他 id。

当场核查已授权组合：派一名只读成员读取 `~/.dsh/profiles/<profile>/cordis.patch.yml` 中 `subagent-model-selection-settings` 一节，将 `enabled` 与 `allowedModels` 原文带回（设置页点保存会重写该文件）。

## 会话钉住

`0.2.2-rc.5` 装的那版宿主在会话开始时将当时授权清单写入会话事件（`subagent/model-selection-policy`），之后整个会话沿用该清单。中途在设置页加勾，老会话不生效，报错原文是 `child LLM route "…" is not allowed for this Session`（未记录策略时尾部另附 `without a recorded model-selection policy, explicit selection is limited to the parent route`）。需换清单时新开会话。

仓库 checkout 已改成每次派活现读设置（commit `7622766814` `feat(subagent): read model-selection setting at each call`）；已装版本尚未包含该改动，答复用户以已安装版本行为为准，不照仓库最新源码文档回答。

## 怎么挑

不传 `provider`/`model` 时，成员继承 Lead 当前的 `provider`、`model` 与推理档；这是默认行为，不代表自动选用低价模型。清单只有 1 条时全员继承 Lead 同款，绝不编造 id（若同模型支持多档 `reasoning_effort`，则靠推理档拉开规划与查证深度）。

不同渠道的模型命名各异，可先调 `list_subagent_models()` 拿到实返清单，再对照独立可维护配置 `references/model-roster.json` 做**模糊匹配**（大小写不敏感、忽略渠道前缀与分隔符；同族多版本取数字最大者）：

- **规划/审美旗舰（Tier 1）**：`opus`（如 Opus 5.5）、Gemini `carbon`/`neon`、GPT 仅限 `sol` 或 `astra` 系列且取数字最大版本号。
- **主力执行（Tier 2）**：DeepSeek 当前暂定 `4.1flash`（如 `deepseek-4.1-flash` / `deepseek/4.1flash`）、Gemini 速执行档（`flash` 或以 `h` 开头的型号词段如 `hxxx`，排除 `thinking`/`high`/`carbon`/`neon`/`pro`/`lite`）、`sonnet`。
- **只读轻量（Tier 3）**：`flash-lite`、`lite`、`haiku`、`mini`、`nano`、`fast`。

后续模型换代或主力版本调整时，直接更新 `references/model-roster.json` 即可。

| 成员角色 | 怎么挑 | 缺档回退 |
|---|---|---|
| 规划者 / 架构师（拆主目标、定契约、根因诊断） | Tier 1 旗舰，推理档给 `high` 或 `max` | 继承 Lead 同款 + 拉高推理档 |
| 审美 / UI 设计者（视觉层级、版式、交互走查） | Tier 1 审美旗舰（优先 Claude Opus / Gemini Carbon·Neon），推理档 `high` | 继承 Lead 同款 |
| 执行者 / 实现者（按契约改代码、带绿自验） | Tier 2 主力执行档（DeepSeek `4.1flash` / Gemini `h*` 或 `flash` / Sonnet），推理档 `medium` 或 `high` | 继承 Lead 同款，或 Tier 1 降一档推理档提速 |
| 独立验收者（一次扫全、核 diff、交叉核对） | 优先选与实现者**不同家族的异构** Tier 2（审美/架构终审可用 Tier 1） | 不同独立成员且不低于实现者档位 |
| 探路 / 查证 / 汇总（只读检索、读日志、写 `team-digest`） | Tier 3 极速便宜档，推理档给 `low` | 回退 Tier 2 或 Lead 降推理档 |

`provider` 与 `model` 成对传入；`reasoning_effort` 在二者均传的前提下使用。三项均逐字复制 `list_subagent_models` 返回原文，大小写与分隔符保持一致。遇到清单里未命中任何已知关键词的自定义渠道名时不瞎猜，先核对描述与推理档支持，仍难判定则保守按 Lead 同级处理或仅派只读查证。

**停滞升级联动与破局回落（见 `references/long-horizon.md`）**：长程任务连续 2 轮主目标判据无增长时，优先调 `list_subagent_models` 从清单中切比现用执行成员更强的模型（如 Opus 等旗舰推理模型或更高推理档）`fresh` 接手卡点跑 1 轮；卡点打通（`N` 增长）后，后续常规实现回落至 Tier 2 执行档；清单仅一条、已是最高档，或切换后仍无增长，则停下请示用户。

先查清单再传参，避免触发预检拒绝导致该次派活浪费（工具启动前会向 LLM 运行时预检 `provider` 和 `model`）。清单无 `list_subagent_models` 工具时，不传任何模型参数。
