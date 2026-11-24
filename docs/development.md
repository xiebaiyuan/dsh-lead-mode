# 开发与发布

[← 返回 README](../README.zh-CN.md) · [English](en/development.md)

## 仓库结构

```text
package.json                     包元数据，dsh.bundle.patch 指向 cordis.patch.yml
cordis.patch.yml                 三条 insert：插件本体 + lead-ptc 预置 + lead-cordis 预置
lib/index.js                     宿主入口：扫描并注册 skills/、注册 /lead-mode、启动自检
skills/lead-mode/SKILL.md        Lead 工作法主文档
skills/lead-mode/references/     五份按需参考：ptc-calls、old-gen、member-models、tool-signatures、long-horizon
skills/team-digest/SKILL.md      团队汇总 skill
dsh-plugin.naming.json           插件命名清单
test/                            零依赖行为测试（fixtures/ 为官方预置原样副本）
scripts/                         校验与发布脚本（check-patch、validate-names、changelog-section）
assets/                          图标、社交预览图、机制图与实机截图（不打进 npm 包）
docs/                            中文补充文档（docs/en/ 为对应英文版，均不打进 npm 包）
reports/                         按 effort 归档的核对报告与团队汇总
obsidian-docs/adr/               架构决策记录（ADR）
README.md / README.zh-CN.md      中英文主页说明（随 npm 包发布）
GLOSSARY.md / CHANGELOG.md       领域术语表与版本更新记录
```

## 本地开发与校验

仓库测试与检查脚本零外部依赖，不需要执行 `npm install`（否则会为 `peerDependencies` 拉取九百多个 `@deepseek-ai/*` 包）：

```bash
npm test
npm run check
npm run pack:dry
```

等价底层命令：

```bash
node --check lib/index.js
node --test test/*.test.mjs
node scripts/validate-names.mjs --manifest ./dsh-plugin.naming.json
node scripts/check-patch.mjs
```

注意：`node --test test` 目录形式仅支持 Node 22+；Node 20 需要用 `test/*.test.mjs` glob 展开。CI 在 Node 20 与 22 双版本上验证，并检查 `docs/`、`test/`、`.github/`、`scripts/`、`references/` 不会混入 npm 包。

## 发布新版本

向 GitHub 推送 `v*` tag 会自动触发 `.github/workflows/release.yml`，通过 npm 的 Trusted Publishing（OIDC）直接发包，无需保存静态 token，也不弹窗要求 2FA，并在发包后自动抽取 `CHANGELOG.md` 对应章节创建 GitHub Release。

首次发布前需在 npmjs.com 的包设置中配置一次 Trusted Publisher：

| 字段 | 填写值 |
|---|---|
| Organization or user | `xiebaiyuan` |
| Repository | `dsh-lead-mode` |
| Workflow filename | `release.yml` |
| Allowed actions | 勾选 `npm publish` |

注意不要只留默认的 `npm stage publish`，否则 CI 只会暂存而不会正式上线。

配置完成后按以下流程发版（确保 `CHANGELOG.md` 已包含对应版本章节）：

```bash
npm version patch --no-git-tag-version
git commit -am "chore: bump to 0.2.17"
git tag v0.2.17
git push origin main --tags
```

Git tag 去掉 `v` 后必须与 `package.json` 的 `version` 完全一致，且不能低于当前 npm `latest`，否则 workflow 会直接中止退出。
