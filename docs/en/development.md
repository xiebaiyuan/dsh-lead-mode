# Development & Release

[← Back to README](../../README.md) · [中文](../development.md)

## Repository layout

```text
package.json                     Package metadata; dsh.bundle.patch → cordis.patch.yml
cordis.patch.yml                 Three inserts: host plugin + lead-ptc + lead-cordis
lib/index.js                     Host entry: auto-discover skills/, register /lead-mode, startup checks
skills/lead-mode/SKILL.md        Core Lead method skill
skills/lead-mode/references/     Five on-demand guides: ptc-calls, old-gen, member-models, tool-signatures, long-horizon
skills/team-digest/SKILL.md      Team wrap-up digest skill
dsh-plugin.naming.json           DSH plugin naming manifest
test/                            Zero-dependency test suite (fixtures/ mirrors official presets)
scripts/                         CI & release helpers (check-patch, validate-names, changelog-section)
assets/                          Icons, social preview, diagrams, and UI screenshots (excluded from npm)
docs/                            Chinese supplemental docs (docs/en/ holds English counterparts; excluded from npm)
reports/                         Archived digests and compatibility audit reports
obsidian-docs/adr/               Architecture Decision Records
README.md / README.zh-CN.md      English & Chinese homepages (shipped in npm tarball)
GLOSSARY.md / CHANGELOG.md       Canonical vocabulary and release notes
```

## Local development & checks

The test suite and checks rely solely on built-in Node.js modules. Avoid running `npm install`, which would pull 900+ `@deepseek-ai/*` transitive packages from `peerDependencies`:

```bash
npm test
npm run check
npm run pack:dry
```

Equivalent direct commands:

```bash
node --check lib/index.js
node --test test/*.test.mjs
node scripts/validate-names.mjs --manifest ./dsh-plugin.naming.json
node scripts/check-patch.mjs
```

Note: `node --test test` works only on Node 22+; keep `test/*.test.mjs` glob expansion for Node 20 compatibility. CI runs both Node 20 and Node 22 and asserts that `docs/`, `test/`, `.github/`, `scripts/`, and `references/` are excluded from `npm pack`.

## Releasing a new version

Pushing a `v*` tag triggers `.github/workflows/release.yml`, publishing via npm Trusted Publishing (OIDC) without stored tokens or 2FA prompts, and automatically creating a GitHub Release using the matching section from `CHANGELOG.md`.

Configure the Trusted Publisher once in npmjs.com package settings:

| Field | Value |
|---|---|
| Organization or user | `xiebaiyuan` |
| Repository | `dsh-lead-mode` |
| Workflow filename | `release.yml` |
| Allowed actions | Check `npm publish` |

Do not leave only `npm stage publish` selected, or CI will stall waiting for manual promotion.

Release steps (after adding the release section to `CHANGELOG.md`):

```bash
npm version patch --no-git-tag-version
git commit -am "chore: bump to 0.2.17"
git tag v0.2.17
git push origin main --tags
```

The tag version (without the `v` prefix) must match `package.json` `version` and exceed the published `latest` version on npm, or the release workflow aborts before publishing.
