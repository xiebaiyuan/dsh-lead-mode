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

不传 `provider`/`model` 时，成员继承 Lead 当前的 `provider`、`model` 与推理档；这是默认行为，不代表自动选用低价模型。

| 活的形状 | 怎么挑 |
|---|---|
| 改代码、改文档、判断力密集任务 | 清单里最强的模型，推理档给 `high` 或该模型最高档 |
| 机械活：跑测试、汇总结论、整理表格 | 便宜够用的模型，推理档低一档 |
| 只读核对、独立复核 | 与实现者**不同**的模型，交叉验证才有效 |

`provider` 与 `model` 成对传入；`reasoning_effort` 在二者均传的前提下使用。三项均逐字复制 `list_subagent_models` 返回原文，大小写与分隔符保持一致。

**停滞升级联动（见 `references/long-horizon.md`）**：长程任务连续 2 轮主目标判据无增长时，优先调 `list_subagent_models` 从清单中切比现用执行成员更强的模型（如 Opus 等旗舰推理模型或更高推理档）`fresh` 接手卡点跑 1 轮；清单仅一条、已是最高档，或切换后仍无增长，则停下请示用户。

先查清单再传参，避免触发预检拒绝导致该次派活浪费（工具启动前会向 LLM 运行时预检 `provider` 和 `model`）。清单无 `list_subagent_models` 工具时，不传任何模型参数。
