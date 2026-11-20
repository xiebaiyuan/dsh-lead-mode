# 团队汇总 · readme-redesign

## 结论

README 从 323 行手册改成定位页：中文 110 行、英文 114 行，八节对齐，手册内容拆进 `docs/` 五个文件。43 条测试全绿，patch 与命名校验通过。未发版，改动在工作树里。

## 谁干了什么

| 成员 | 交付物 | 状态 | 过程产物指针 |
|---|---|---|---|
| `readme-writer` | `README.zh-CN.md`、`README.md` 重写 | 完成 | `.scratch/readme-redesign/worklog-readme-writer.md` |
| `docs-mover` | `docs/usage.md`、`docs/agent-teams.md`、`docs/design.md`、`docs/development.md` 新建；`docs/why.md` 两处轻改 | 完成 | `.scratch/readme-redesign/worklog-docs-mover.md` |
| `lead` | 规格与派单、独立复核、6 处文字修订、团队汇总 | 完成 | `.scratch/readme-redesign/spec.md` |

## 验收证据

- `node --test test/*.test.mjs` → `tests 43 / pass 43 / fail 0`。Lead 复跑过。
- `node scripts/check-patch.mjs` → `patch OK: 2 行 insert，preset lead-mode 有 22 个子行`。Lead 复跑过。
- `node scripts/validate-names.mjs --manifest ./dsh-plugin.naming.json` → 3 条既有 recommended-prefix WARN，与本次改动无关。Lead 复跑过。
- `wc -l README.md README.zh-CN.md` → 114 / 110，差 4。Lead 复跑过。
- `grep -c '^## '` → 两份各 8，标题逐行对应。Lead 复跑过。
- 禁词 rg（`不是…而是`、赋能、闭环、核心洞察、关键设计、本质区别、值得注意的是、综上、总而言之、拉齐、抓手、颗粒度、击穿、打穿、扛住、接住、闸门、夹具）→ 零命中。Lead 复跑过。
- README 里 8 个 GitHub 链接目标逐个 `test -e`：`docs/why.md`、`docs/usage.md`、`docs/agent-teams.md`、`docs/design.md`、`docs/development.md`、`GLOSSARY.md`、`CHANGELOG.md`、`LICENSE` 全部存在。Lead 跑的。
- 两份 README 都含测试断言的友链要素：`## 友链：dsh-context` / `## Friendly link: dsh-context`、`https://github.com/bowenliang123/dsh-context`、`Apache-2.0`、含 `dsh plugin --profile` 的安装命令、`Fleet Members`、`Tasks`、`Agent Comms`。Lead 用 grep 逐项核过。

## 偏离与未验证

- `docs-mover` 发现规格自相矛盾：README 文档地图把「边界」挂在 design.md，但派单要求 `why.md` 保留该节。处理：边界留在 `why.md`，design.md 顶部加路标；Lead 把两份 README 的地图改成「why.md 含边界 / design.md 只写不干扰与预设差异」。
- `readme-writer` 把文档地图的「术语 / 版本记录 / 汇总样例」拆成三行（规格写的是一行），两份仍各 8 行对齐；Lead 保留拆法。
- `readme-writer` 的 `reports/` 用 `tree/main` 而不是 `blob/main`：目录没有 blob 视图，合理。
- Lead 在复核时改了 6 处：新一代工具清单补上 `send_message` 与 `team_task_*` 仍在、`wait_agent` 搬走（两份）；「缺 Team 就停手」那条把 persona 与启动 warn 拆成两个主语（两份）；文档地图的边界归属（两份）；`docs/` 不进包那句的因果（两份）；版本行「宿主要求」改「宿主」。
- 派单里写的「现行 286 / 324 行」与实际 323 / 323 不符，以实测为准。

### 未验证清单

- npm 页面渲染：没在 npmjs.com 上实际打开过，只按绝对链接推断能点。
- GitHub 上外链可达性：只做了本地文件存在性检查，没发网络请求。
- 桌面端插件页对 README 的展示：未在宿主里加载新包验证。

## 死路与决策

- **决策：README 只留定位页，手册搬 `docs/`。** 用户在三选一里选的。代价：`docs/` 不进 npm 包（`package.json` 的 `files` 不含它，CI 还断言它不能进包），npm 页面只能读 README 与绝对链接。推翻条件：如果用户要 npm 上也能读手册，得改 `files` 并同步删掉 CI 那条 `docs/` 禁入断言。
- **决策：愿景用用户原话，并注明「200% 是目标，不是实测数字」。** 依据：写作规则禁编造量化数据，口号与实测要分开。
- **死路：保留手册在 README、只在前面加三节。** 用户否掉了，理由是同一次选择里选了「README 只留定位 / 特点 / 愿景 / 上手」。

## 未决与下一步

- 发不发 `0.2.6`：`0.2.1` 有过纯文档发版的先例。要发就走 `npm version patch` → tag → CI，并同步 README 版本行与 CHANGELOG 条目。
- 是否提交：改动都在工作树（两份 README、`docs/why.md`、四个新 docs、本汇总），Lead 未 commit。
- 明确不做：不把 `docs/` 打进 npm 包，不改测试断言，不给 README 加路线图。
