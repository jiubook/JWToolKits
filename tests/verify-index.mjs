#!/usr/bin/env node
/**
 * verify-index.mjs —— 校验「index.html 的 window.TOOLS 清单」与「webs/ 目录实际文件」一致。
 *
 * 为什么需要它：网页工具靠 index.html 集中展示，而清单是手写的，
 * 时间一长必然出现「加了页面没登记」或「删了页面留死链」。本脚本把这件事变成可检查的。
 *
 * 用法：node tests/verify-index.mjs
 * 退出码：0 = 一致，1 = 不一致（并打印差异）
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX = join(ROOT, 'index.html')
const WEBS = join(ROOT, 'webs')

/** 从 index.html 中抽出 window.TOOLS = [ ... ] 这一段并求值（只取字面量，不执行页面脚本） */
function readManifest (html) {
  const match = html.match(/window\.TOOLS\s*=\s*(\[[\s\S]*?\n\s*\])/)
  if (!match) throw new Error('index.html 里找不到 window.TOOLS = [...] 清单，解析中止')
  return new Function(`"use strict"; return (${match[1]});`)()
}

function main () {
  const tools = readManifest(readFileSync(INDEX, 'utf8'))
  const onDisk = readdirSync(WEBS).filter((f) => f.toLowerCase().endsWith('.html'))

  const registered = new Set(tools.map((t) => t.href))
  const present = new Set(onDisk)

  const missing = tools.filter((t) => !present.has(t.href))   // 登记了但文件不在
  const orphan = onDisk.filter((f) => !registered.has(f))     // 文件在但没登记
  const badField = tools.filter((t) => !t.name || !t.desc || !t.href)

  console.log(`index.html 登记 ${tools.length} 个工具，webs/ 实际有 ${onDisk.length} 个页面`)

  let failed = false
  if (badField.length) {
    failed = true
    console.error(`\n✗ 有 ${badField.length} 条清单缺字段（name/desc/href 均为必填）：`)
    badField.forEach((t) => console.error(`    ${JSON.stringify(t)}`))
  }
  if (missing.length) {
    failed = true
    console.error(`\n✗ 登记了但 webs/ 下不存在（死链）：`)
    missing.forEach((t) => console.error(`    ${t.href}`))
  }
  if (orphan.length) {
    failed = true
    console.error(`\n✗ webs/ 下存在但没登记到 index.html：`)
    orphan.forEach((f) => console.error(`    ${f}`))
  }

  if (failed) {
    console.error('\n请在 index.html 的 window.TOOLS 中修正后重跑。')
    process.exit(1)
  }
  console.log('\n✓ 清单与 webs/ 目录一致')
}

main()
