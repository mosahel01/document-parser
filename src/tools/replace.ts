import { formatSize } from '../lib/format'

/** Whole-file rewriting in one blocking pass, so there is a ceiling. */
export const MAX_TEXT_BYTES = 20 * 1024 * 1024

/**
 * The formats this tool will open. Restricted on purpose: a file picker with no
 * filter invites PDFs and photos, which cannot be rewritten as text and would
 * only produce an error after the fact.
 */
export const TEXT_EXTENSIONS = [
  'txt',
  'text',
  'md',
  'markdown',
  'csv',
  'tsv',
  'json',
  'jsonl',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'yml',
  'yaml',
  'ini',
  'conf',
  'cfg',
  'log',
  'srt',
  'vtt',
  'svg',
  'sql',
  'sh',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'php',
] as const

/** For the file picker's accept attribute, so the dialog is filtered too. */
export const TEXT_ACCEPT = TEXT_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(',')

export function isTextExtension(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return false

  const extension = name.slice(dot + 1).toLowerCase()
  return (TEXT_EXTENSIONS as readonly string[]).includes(extension)
}


export type ReplaceOptions = {
  find: string
  replace: string
  /** Treat the search as a JavaScript pattern, so $1 works in the replacement. */
  regex: boolean
  matchCase: boolean
}

export type ReplaceResult = { text: string; count: number }

function escapeLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Build the search pattern, or throw a message worth showing. */
export function buildPattern(options: ReplaceOptions): RegExp {
  if (options.find === '') throw new Error('Type something to find.')

  const flags = options.matchCase ? 'g' : 'gi'
  if (!options.regex) return new RegExp(escapeLiteral(options.find), flags)

  try {
    return new RegExp(options.find, flags)
  } catch {
    throw new Error(`"${options.find}" is not a valid pattern.`)
  }
}

export function replaceText(
  text: string,
  options: ReplaceOptions,
): ReplaceResult {
  const pattern = buildPattern(options)
  const count = text.match(pattern)?.length ?? 0
  if (count === 0) return { text, count: 0 }

  // In literal mode "$&" in the replacement must stay "$&", so pass a function.
  const next = options.regex
    ? text.replace(pattern, options.replace)
    : text.replace(pattern, () => options.replace)

  return { text: next, count }
}

/** A little text around the first match, for the preview column. */
export function snippetAround(
  text: string,
  options: ReplaceOptions,
  radius = 40,
): string | null {
  const pattern = buildPattern(options)
  const match = pattern.exec(text)
  if (!match) return null

  const start = Math.max(0, match.index - radius)
  const end = Math.min(text.length, match.index + match[0].length + radius)

  return `${start > 0 ? '…' : ''}${text
    .slice(start, end)
    .replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`
}

export type ChangePreview = { before: string; after: string }

/**
 * The same window of text before and after the replacement, so the change is
 * visible in context instead of only counted. The window always contains the
 * whole first match, so the search pattern finds it again inside the slice.
 */
export function previewChange(
  text: string,
  options: ReplaceOptions,
  radius = 60,
): ChangePreview | null {
  const pattern = buildPattern(options)
  const match = pattern.exec(text)
  if (!match) return null

  const start = Math.max(0, match.index - radius)
  const end = Math.min(text.length, match.index + match[0].length + radius)

  // Replace only the first match, not every later one in the window: the
  // point is to show this change, with its neighbours left as they are.
  const once = new RegExp(pattern.source, pattern.flags.replace('g', ''))
  const changed = options.regex
    ? match[0].replace(once, options.replace)
    : match[0].replace(once, () => options.replace)

  const window = text.slice(start, end)
  const after = `${text.slice(start, match.index)}${changed}${text.slice(
    match.index + match[0].length,
    end,
  )}`

  const tidy = (value: string) =>
    `${start > 0 ? '…' : ''}${value.replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`

  return { before: tidy(window), after: tidy(after) }
}

const UTF8 = new TextDecoder('utf-8', { fatal: true })

/** Windows tools need the byte order mark to notice UTF-8, so keep it if it was there. */
export async function hasUtf8Bom(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer())
  return head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf
}

/**
 * Read a file as UTF-8, refusing anything that is not: rewriting a binary or a
 * Windows-1252 file would silently corrupt it.
 */
export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_TEXT_BYTES) {
    throw new Error(
      `"${file.name}" is over ${formatSize(MAX_TEXT_BYTES)}. Open a smaller file.`,
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.subarray(0, 8192).includes(0)) {
    throw new Error(`"${file.name}" looks like a binary file, not text.`)
  }

  try {
    return UTF8.decode(bytes)
  } catch {
    throw new Error(
      `"${file.name}" is not UTF-8 text, so rewriting it could garble it.`,
    )
  }
}
