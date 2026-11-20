# 开发与发布

[← 回到 README](../README.zh-CN.md)

## 目录

```
package.json          包元数据，dsh.bundle.patch 指向 cordis.patch.yml
cordis.patch.yml      三行 insert：本插件 + lead-ptc 预置 + lead-cordis 预置
lib/index.js          host 半边：扫 skills/ 逐个注册、注册命令、启动自检
skills/lead-mode/     Lead 工作法正文
skills/team-digest/   团队汇总正文
dsh-plugin.naming.json  命名清单
test/                 行为断言，零依赖（fixtures/ 是官方预置原样副本）
scripts/              发布与校验脚本（check-patch、changelog-section）
docs/                 使用、设计、why、两代对照、开发说明
reports/              按 effort 归档的核对报告与团队汇总
obsidian-docs/adr/    可回看的决策记录
```

## 开发

```bash
node --check lib/index.js
node --test test/*.test.mjs
node scripts/check-patch.mjs
```

测试零依赖，不用 `npm install`。`test/` 目录形式只在 Node 22+ 被接受，Node 20 会用 glob 展开。

## 发新版本

推 tag 触发 `.github/workflows/release.yml`，发布走 npm 的 Trusted Publishing（OIDC）。不存 token，也不弹 2FA。

发之前先在 npmjs.com 配一次 Trusted Publisher：

| 字段 | 填什么 |
|---|---|
| Organization or user | `xiebaiyuan` |
| Repository | `dsh-lead-mode` |
| Workflow filename | `release.yml` |
| Allowed actions | 勾上 `npm publish` |

`npm stage publish` 是默认就允许的，只勾它的话 CI 只能暂存，还得人工 approve 才上线。

配好后：

```bash
npm version patch --no-git-tag-version
git commit -am "chore: bump to 0.1.3"
git tag v0.1.3
git push origin main --tags
```

tag 的版本必须和 `package.json` 一致，否则 workflow 直接退出，不发。同一个版本发第二次会被 npm 拒掉，所以每次发都要先提版本号。
