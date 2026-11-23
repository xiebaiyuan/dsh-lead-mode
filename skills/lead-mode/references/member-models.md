# 按活挑成员模型（新一代）

只在要按活挑模型时读。默认继承就不用打开。

## 两层开关

**能指定，但由两层开关决定。缺一层就只能跟随父模型。**

| 层 | 谁控制 | 默认 | 关着时传 `provider` 会怎样 |
|---|---|---|---|
| 工具实例 `modelSelection: true` | 插件预置，已开 | 开 | 报 `MODEL_SELECTION_DISABLED` |
| 宿主设置「子智能体 → 模型选择」 | 用户 | **关** | 只认父路由；别的路由报 `MODEL_ROUTE_NOT_ALLOWED` |

宿主设置的路径：设置 → 子智能体 → 模型选择 → 打开「允许 Agent 为子智能体选择模型」，再到「Agent 可选择的模型」里勾上允许的组合。保存后写进 profile 的 patch 文件，但**只有新会话读新清单**，老会话钉着开局那份。

## 判能不能挑

调 `list_subagent_models()`：

- 返回多条 = 有别的可选，按清单挑。
- 只返回一条 = 没有别的可选。可能是开关没开，也可能是开了但「Agent 可选择的模型」里只勾了父模型那一条。两种情况都别硬写别的 id，当继承处理。

要当场看授权了哪几条：派一个只读成员去读 `~/.dsh/profiles/<profile>/cordis.patch.yml` 里 `subagent-model-selection-settings` 那块，`enabled` 与 `allowedModels` 就是设置页存下来的结果（在设置页点保存会重写这个文件），让它把这两项原文带回来。

## 会话钉住

0.2.2-rc.5 装的那版宿主在会话开始时把当时的授权清单写进会话事件（`subagent/model-selection-policy`），之后整个会话都用这份。中途在设置页加勾，老会话不生效，报错原文是 `child LLM route "…" is not allowed for this Session`（没记录策略时尾部还会多一句 `without a recorded model-selection policy, explicit selection is limited to the parent route`）。要换清单就新开会话。

checkout 里已经改成每次派活现读设置（commit `7622766814` `feat(subagent): read model-selection setting at each call`）。装的那版还没带这个改动，所以别照源码文档答用户。

## 怎么挑

不传 `provider`/`model` 时，成员继承 Lead 当前的 provider、model 和推理档。这是默认，不是「自动挑便宜模型」。

| 活的形状 | 怎么挑 |
|---|---|
| 改代码、改文档、要判断力 | 清单里最强的模型，推理档给 `high` 或该模型最高档 |
| 机械活：跑测试、抄结论、整理表格 | 便宜够用的模型，推理档低一档 |
| 只读核对、独立复核 | 与实现者**不同**的模型，交叉验证才有意义 |

`provider` 与 `model` 要成对给；`reasoning_effort` 要在两者都给了的前提下用。三级都从 `list_subagent_models` 返回原文里抄，大小写和分隔符一个字符都别改。

路由不合法会在启动前被拒：工具先向 LLM 运行时预检 provider 和 model，出错就到不了启动那一步。但那一次派活已经白跑，所以还是先看清单。清单里没有这个工具，就一个参数都别传。
