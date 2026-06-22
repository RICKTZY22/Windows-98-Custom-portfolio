#!/usr/bin/env node
/**
 * Origin / authorship verifier for "Windows 98 Portfolio Edition".
 *
 * Usage:
 *   node scripts/verify-origin.mjs            Check THIS repo's watermarks are intact (CI guard).
 *   node scripts/verify-origin.mjs <path>     Scan ANOTHER folder for this project's watermarks
 *                                             (run on a suspected copy to gather proof of authorship).
 *
 * Exit code is non-zero in self-check mode if expected markers are missing.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FINGERPRINT = 'JEM-W98P-ORIGIN-7f3a9c1e2b5d'
const AUTHOR = 'John Erick Mendoza'
const PROJECT = 'Windows 98 Portfolio Edition'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const target = process.argv[2] || repoRoot
const scanningCopy = Boolean(process.argv[2])

const SKIP = new Set(['node_modules', 'dist', 'dist-ssr', 'build', '.git', 'coverage', '.vite', '.cache', '.vercel'])
const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|css|html|json|md|txt)$/i

function walk(dir, acc = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return acc
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue
    const full = join(dir, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(full, acc)
    else if (TEXT_EXT.test(name)) acc.push(full)
  }
  return acc
}

const files = walk(target)
const fingerprintHits = []
const authorHits = []
for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (text.includes(FINGERPRINT)) fingerprintHits.push(relative(target, file))
  if (text.includes(AUTHOR)) authorHits.push(relative(target, file))
}

console.log('')
console.log(`Origin verifier - ${PROJECT}`)
console.log(`Author:      ${AUTHOR}`)
console.log(`Fingerprint: ${FINGERPRINT}`)
console.log(`Target:      ${target}${scanningCopy ? '  (external copy)' : '  (this repo)'}`)
console.log('')
console.log(`Fingerprint found in ${fingerprintHits.length} file(s):`)
for (const file of fingerprintHits) console.log(`  - ${file}`)
console.log(`Author name found in ${authorHits.length} file(s).`)

if (scanningCopy) {
  console.log('')
  if (fingerprintHits.length > 0 || authorHits.length > 0) {
    console.log('RESULT: This folder contains authorship markers from the original project.')
    console.log('Any retained marker is evidence the work was derived from the original.')
  } else {
    console.log('RESULT: No original authorship markers found in this folder.')
  }
  process.exit(0)
}

// Self-check mode: required watermark locations must be present and intact.
const requiredFiles = ['src/origin.ts', 'index.html', 'LICENSE']
const missingFiles = requiredFiles.filter((p) => !existsSync(join(repoRoot, p)))

const expectFingerprintIn = ['src/origin.ts', 'index.html', 'src/main.tsx']
const missingFingerprint = expectFingerprintIn.filter((p) => {
  try {
    return !readFileSync(join(repoRoot, p), 'utf8').includes(FINGERPRINT)
  } catch {
    return true
  }
})

console.log('')
let ok = true
if (missingFiles.length) {
  ok = false
  console.log(`MISSING required files: ${missingFiles.join(', ')}`)
}
if (missingFingerprint.length) {
  ok = false
  console.log(`MISSING fingerprint in: ${missingFingerprint.join(', ')}`)
}
if (fingerprintHits.length < 3) {
  ok = false
  console.log(`WARNING: fingerprint present in only ${fingerprintHits.length} file(s); expected at least 3.`)
}

console.log('')
if (ok) {
  console.log('ORIGIN INTACT: all expected authorship markers are present.')
  process.exit(0)
}
console.log('ORIGIN TAMPERED: some authorship markers are missing (see above).')
process.exit(1)
