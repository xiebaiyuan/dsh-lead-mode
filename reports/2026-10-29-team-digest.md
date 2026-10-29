# 团队汇总 · team-digest

## 结论

Lead 收尾时不再临场拼装：插件新增 `team-digest` runtime skill，收尾一次成型写一份 `reports/<日期>-<effort>.md`；`lib/index.js` 从硬编码单 skill 改成扫目录注册多个。四条 CI 命令我全部复跑通过，34 个测试全绿，两个 skill 随包分发。

## 谁干了什么

| 成员 | 交付物 | 状态 | 过程产物指针 |
|---|---|---|---|
| skill-author | `skills/team-digest/SKILL.md`（200 行，八节）、`skills/lead-mode/SKILL.md` 两处最小改 | 完成 | `.scratch/team-digest/worklog-skill-author.md` |
| plugin-core | `lib/index.js`（256 行，改 139 行）、`test/smoke.test.mjs`（+208 行）、`dsh-plugin.naming.json` | 完成 | `.scratch/team-digest/worklog-plugin-core.md` |
| docs-adr | `GLOSSARY.md` 加四词（+17 行）、`obsidian-docs/adr/0001-team-digest.md`（62 行）、`CHANGELOG.md` 未发布条目（+21 行） | 完成 | `.scratch/team-digest/worklog-docs-adr.md` |
| lead | 冻结规格 `spec.md`、决策台账 `aggregation-design/decisions.md`、`.scratch` 软链、`.gitignore`、修正 skill 模板里「未验证清单」挂错块 | 完成 | `.scratch/team-digest/spec.md`、`.scratch/aggregation-design/decisions.md` |

## 验收证据

| 命令 | 输出摘要 | 谁跑的 |
|---|---|---|
| `node --check lib/index.js` | 无输出，exit 0 | Lead 复跑 |
| `node --test test/*.test.mjs` | 34 passed / 0 failed（改前 31 条） | Lead 复跑，改完标题归属后又跑一次 |
| `node scripts/validate-names.mjs --manifest ./dsh-plugin.naming.json` | compatible，4 条 `recommended-prefix` warn，exit 0（与改前同类） | Lead 复跑 |
| `node scripts/check-patch.mjs` | `patch OK: 2 行 insert，preset lead-mode 有 22 个子行` | Lead 复跑 |
| `npm pack --dry-run` | 8 个文件，含 `skills/team-digest/SKILL.md` 7.9kB；`test/` `scripts/` `docs/` `reports/` `.scratch` 均未进包 | Lead 复跑 |
| 真目录注册 | `syncBundledSkills()` 返回 `['lead-mode','team-digest']`，warnings 为空 | plugin-core 跑过，Lead 未单独复跑（见未验证） |

## 偏离与未验证

偏离规格的地方（都不影响验收，逐条给理由）：

1. **多导出 `syncBundledSkills(skillsRoot, registry, warn)`**。规格没要求导出，但要求「测试里用假目录」。不导出就只能改 `apply` 入参或塞环境变量，更差。现在 `apply` 调的就是被测的那个函数。
2. **改了 4 处既有断言**（原 `length === 1` / `skills[0]`）。规格只说「加断言」，但 `skills/team-digest/` 一落地这些必红。改成按磁盘真值循环断言，`source`/`content` 非空和 `validateDefinition` 那条注释都保留，没有减弱。
3. **warn 文案单数改复数**（「lead-mode skill 没注册」→「本插件的 skill 都没注册」）。单数已不成立。
4. **skill 模板增补一段 fenced 填空骨架**。规格没要求，理由是六块标题只写在表格里时按 `\n## ` 切片取不到。
5. **ADR 落在 `obsidian-docs/adr/` 而不是 `docs/adr/`**。仓库 `AGENTS.md` 指定的就是这个位置。
6. **ADR 用了 Status / Considered Options / Consequences 三个可选节**。任务要求每条写备选与推翻条件，正是这几个节的用途。
7. **`GLOSSARY.md` 原有 10 个词，不是 11 个**。我派活时数错了，docs-adr 按实际追加，现在 14 个。
8. **CHANGELOG 不写测试条数**。`test/` 同期在被改写，写死会立刻过期，改成写覆盖面。

### 未验证清单

- **Node 20 / 22 未跑**。本机只有 `node v26.12.0`，CI 矩阵是 20/22。代码只用 Node 20 就有的 API，未经实跑确认。
- **真机加载未验**。只在假 ctx 和直接调用 `syncBundledSkills()` 两层验过，没有把插件装进 profile 后确认 `skill` 工具里能列出两个 skill。
- **会话日志下钻（原料第 3 层）本 effort 没触发过**。三个成员都交了收尾消息并写了 worklog，第 1、2 层就够用，第 3 层只有代码事实支撑，没有实际使用记录。

## 死路与决策

死路，一行一条：

- **测试里写死 `['lead-mode','team-digest']`**：`skills/team-digest/` 由另一成员并发写，读到半写状态就红，且加第三个 skill 还要改测试。改按契约在测试侧独立筛。
- **测试直接跑 `apply` 去断言两个 skill**：同上，被并发写污染。改成注入 `mkdtempSync` 临时目录。
- **`description` 用「团队汇总：…」冒号句式**：YAML plain scalar 会把 `: ` 当映射，别的解析器会炸。改成句号断句。
- **`description` 用 `>-` 折叠块**：lib 和宿主都用 `/^description:\s*(.+)$/m` 抓单行，折叠块抓不到。
- **六块标题只写进 markdown 表格**：按 `\n## ` 切片取不到标题。额外给一段填空骨架。
- **把「节点文档」「收口」写进 skill 的「术语不要用」清单**：任务验收要求这两个词零命中，写进去自撞。
- **过程产物定义写成「收尾时只留一行指针」**：与「证据指针」共用「指针」二字，读者当同一类。改成「只写它在哪、有什么用」，并在证据指针里加排除句。
- **引 0.1.3 的错判当「长文档中段易漏读」的证据**：翻 `0.1.3→0.1.4` 发现那条错是没读宿主源码，不是漏读长文档。整句删掉，换成纯代价论证（256 行 → 350+ 行）。

不可逆决策共四条，每条五字段（背景 / 备选 / 选的 / 依据 / 什么情况下推翻），见 `obsidian-docs/adr/0001-team-digest.md`：不复用任务板承载结果、不做增量汇总、独立成 skill 不并入 lead-mode、不加 `/digest` 命令。

## 未决与下一步

未决：

- `package.json` 还是 `0.1.7`，CHANGELOG 写的是「未发布」。版本号改成什么没定。
- `reports/` 进 git 已定（ADR 后果第三条），但 `reports/` 现在只有一个空目录，第一次真实回看发生在下一份汇总。

下一步：

1. 跑一次真机：装进 profile，确认 `skill` 工具列出 `lead-mode` 与 `team-digest` 两个。
2. 定版本号、改 `package.json`、发版。
3. 下一轮真实 multi-member 活里跑一次第 3 层下钻，验证 `session_event_search(session_id=<成员>)` 在真实成员 id 上确实读得到。

明确不做：不加 `/digest` 命令；不做增量汇总；不把汇总内容塞进任务板 description。
