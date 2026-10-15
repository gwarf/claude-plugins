// Fence splitting adapted from AH-Merii/claude-plugins copy-code (MIT), trimmed to the code segments.
import type { Block } from '../types'

// A backtick fence's info string may hold no backtick (CommonMark); a tilde fence's may.
const OPEN = /^( {0,3})(`{3,}(?!.*`)|~{3,})\s*([^\s`]*)/

// The fenced code blocks of a markdown reply, in order, bodies without their fences.
export function blocks(text: string): Block[] {
  const lines = text.split(/\r?\n/)
  const found: Block[] = []
  let i = 0

  while (i < lines.length) {
    const open = OPEN.exec(lines[i] ?? '')
    const fence = open?.[2]
    if (!fence) {
      i++
      continue
    }

    const close = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`)
    let end = i + 1
    while (end < lines.length && !close.test(lines[end] ?? '')) end++

    // As CommonMark does: up to the fence's own indent comes off each code line.
    const indent = open?.[1]?.length ?? 0
    const body = lines.slice(i + 1, end).map(l => l.replace(new RegExp(`^ {0,${indent}}`), ''))
    const block: Block = { code: body.join('\n'), lines: body.length }
    if (open?.[3]) {
      block.language = open[3]
    }
    found.push(block)
    i = end + 1
  }

  return found
}

const NAMES: Record<string, string> = {
  py: 'python', python3: 'python',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', mts: 'typescript',
  md: 'markdown', sh: 'shell', shellscript: 'shell', console: 'shell session',
  yml: 'yaml', rb: 'ruby', rs: 'rust', kt: 'kotlin', cs: 'c#',
  cpp: 'c++', cc: 'c++', hs: 'haskell', ex: 'elixir', pl: 'perl',
  tf: 'terraform', hcl: 'terraform', txt: 'text', plaintext: 'text',
  patch: 'diff', dockerfile: 'docker',
}

// A Map, not NAMES itself: an object would also answer inherited keys such as `constructor`.
const ALIASES = new Map(Object.entries(NAMES))

// The full name of a fence's language; `text` for an untagged block.
export function languageName(language: string | undefined): string {
  if (language === undefined) return 'text'
  return ALIASES.get(language.toLowerCase()) ?? language
}
