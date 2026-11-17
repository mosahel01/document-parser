import { unzipSync } from 'fflate'
import { formatSize } from '../lib/format'

/** A .docx is a zip that is unpacked in one blocking step, so cap the input. */
export const MAX_DOCX_BYTES = 50 * 1024 * 1024

const DOCUMENT_PATH = 'word/document.xml'

export type DocxBlock = {
  text: string
  /** 0 for body text, 1 to 6 for a heading of that level. */
  level: number
  /** True when the paragraph was a numbered or bulleted list item. */
  list: boolean
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

/** Turn the escapes Word writes into the characters they stand for. */
export function decodeXml(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[body] ?? whole
  })
}

// A paragraph is a flat list of runs, so its text is the <w:t> contents in
// order, with tabs and line breaks where Word put them. Runs inside a field or
// a deleted revision carry text that is not part of the document.
const PIECES = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(br|tab)(?:\s[^>]*)?\/>/g

function textOf(paragraph: string): string {
  let text = ''

  for (const piece of paragraph.matchAll(PIECES)) {
    if (piece[1] !== undefined) text += decodeXml(piece[1])
    else text += piece[2] === 'tab' ? ' ' : '\n'
  }

  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Word names the style "Heading1" or "heading 1" depending on how the file was
 * written, so compare with the punctuation removed.
 */
function headingLevel(paragraph: string): number {
  const style = /<w:pStyle\s+w:val="([^"]*)"/.exec(paragraph)?.[1] ?? ''
  const name = style.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (name === 'title') return 1
  if (name === 'subtitle') return 2

  const heading = /^heading([1-6])$/.exec(name)
  return heading ? Number(heading[1]) : 0
}

/**
 * Read the blocks out of the main document part. Pure string work, so the same
 * code runs in a test without a browser.
 */
export function parseDocument(xml: string): DocxBlock[] {
  const blocks: DocxBlock[] = []
  const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? []

  for (const paragraph of paragraphs) {
    const text = textOf(paragraph)
    if (text === '') continue

    blocks.push({
      text,
      level: headingLevel(paragraph),
      list: /<w:numPr[\s/>]/.test(paragraph),
    })
  }

  return blocks
}

/** Open a .docx and hand back its paragraphs, headings included. */
export async function readDocx(file: File): Promise<DocxBlock[]> {
  if (file.size > MAX_DOCX_BYTES) {
    throw new Error(
      `"${file.name}" is over ${formatSize(MAX_DOCX_BYTES)}. Open a smaller document.`,
    )
  }

  let tooLarge = false
  let parts: Record<string, Uint8Array>

  try {
    parts = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      // Only the body is needed; images and styles would be wasted memory.
      filter: (entry) => {
        if (entry.name !== DOCUMENT_PATH) return false
        if (entry.originalSize > MAX_DOCX_BYTES) {
          tooLarge = true
          return false
        }
        return true
      },
    })
  } catch {
    throw new Error(
      `"${file.name}" could not be opened as a Word document. A .doc saved by an older Word is a different format and needs to be saved as .docx.`,
    )
  }

  if (tooLarge) {
    throw new Error(
      `The text in "${file.name}" expands past ${formatSize(MAX_DOCX_BYTES)}, which is more than the tab should hold.`,
    )
  }

  const xml = parts[DOCUMENT_PATH]
  if (!xml) {
    throw new Error(`"${file.name}" has no document body. It may be damaged.`)
  }

  return parseDocument(new TextDecoder().decode(xml))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function docxToText(blocks: DocxBlock[]): string {
  return blocks
    .map((block) => (block.list ? `- ${block.text}` : block.text))
    .join('\n\n')
}

export function docxToMarkdown(blocks: DocxBlock[]): string {
  return blocks
    .map((block) => {
      if (block.level > 0) return `${'#'.repeat(block.level)} ${block.text}`
      return block.list ? `- ${block.text}` : block.text
    })
    .join('\n\n')
}

/**
 * A complete HTML file, not a fragment: opening it should show the document
 * rather than a browser error about stray tags.
 */
export function docxToHtml(blocks: DocxBlock[], title: string): string {
  const body: string[] = []
  let inList = false

  for (const block of blocks) {
    if (block.list && !inList) {
      body.push('<ul>')
      inList = true
    } else if (!block.list && inList) {
      body.push('</ul>')
      inList = false
    }

    if (block.list) body.push(`<li>${escapeHtml(block.text)}</li>`)
    else if (block.level > 0)
      body.push(`<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`)
    else body.push(`<p>${escapeHtml(block.text)}</p>`)
  }

  if (inList) body.push('</ul>')

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body>',
    ...body,
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
