#!/usr/bin/env node
// CI 用：把 plugin-write skill 里的 naming 校验脚本装进仓库，避免 CI 依赖
// 开发者本机 ~/.dsh/skills 下的那份。
//
// 本脚本只做搬运与校验，不改写校验逻辑。上游改动时重跑一次即可。

import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillRoot = join(homedir(), '.dsh', 'skills', 'plugin-write')
const sources = [
  ['scripts/validate-names.mjs', 'scripts/validate-names.mjs'],
  ['references/naming-policy.v1.json', 'references/naming-policy.v1.json'],
]

for (const [from, to] of sources) {
  const source = join(skillRoot, from)
  const target = join(repoRoot, to)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
  const bytes = (await readFile(target)).length
  console.log(`copied ${to} (${bytes} bytes)`)
}
