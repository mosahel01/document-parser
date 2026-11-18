import { readDocx, type DocxBlock } from './docx'
import { formatSize } from '../lib/format'

/** A4 in points, and the margin PDF viewers expect from a letter-sized print. */
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 56

const BODY_SIZE = 11
const HEADING_SIZE = 16
const LINE_HEIGHT = 1.45

/** Characters with a typographic form that Helvetica can write more plainly. */
const PLAIN: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201a': ',',
  '\u201c': '"',
  '\u201d': '"',
  '\u201e': '"',
  '\u2013': '-',
  '\u2014': '-',
  '\u2026': '...',
  '\u2022': '-',
  '\u00a0': ' ',
  '\u00ad': '',
  '\u20ac': 'EUR ',
  '\u2122': '(TM)',
}

/**
 * pdf-lib's built-in Helvetica can only write WinAnsi, and throws on anything
 * else. Replace the obvious look-alikes and put "?" where there is no honest
 * Latin equivalent, so one stray character cannot fail the whole document.
 */
export function winAnsiSafe(text: string): string {
  let out = ''

  for (const character of text) {
    const ready = PLAIN[character]
    if (ready !== undefined) {
      out += ready
      continue
    }

    const code = character.codePointAt(0) ?? 0
    if (code === 0x0a || code === 0x0d) {
      out += '\n'
      continue
    }
    if (code === 0x09) {
      out += ' '
      continue
    }
    // Printable ASCII plus the Latin-1 range, which WinAnsi shares.
    if ((code >= 32 && code <= 126) || (code >= 0xa0 && code <= 0xff)) {
      out += character
      continue
    }

    out += '?'
  }

  return out
}

/**
 * Break text into lines that fit the width. The measuring function is passed in
 * so the wrapping can be tested without a font.
 */
export function wrapText(
  text: string,
  measure: (value: string) => number,
  maxWidth: number,
): string[] {
  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    let line = ''

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line === '' ? word : `${line} ${word}`

      if (measure(candidate) <= maxWidth) {
        line = candidate
        continue
      }

      if (line !== '') {
        lines.push(line)
        line = ''
      }

      // A single word longer than the page still has to be broken somewhere.
      let rest = word
      while (measure(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1
        while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut -= 1
        lines.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }

      line = rest
    }

    lines.push(line)
  }

  return lines.length > 0 ? lines : ['']
}

/**
 * Render paragraphs as plain text on A4 pages. This is a readable copy of the
 * words, not a faithful copy of the layout: columns, images, tables, and exact
 * fonts need a real layout engine, which stays server work.
 */
export async function blocksToPdf(blocks: DocxBlock[]): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

  const document = await PDFDocument.create()
  document.setProducer('Document Toolkit')

  const body = await document.embedFont(StandardFonts.Helvetica)
  const heading = await document.embedFont(StandardFonts.HelveticaBold)

  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let top = PAGE_HEIGHT - MARGIN

  const paragraphs =
    blocks.length > 0
      ? blocks
      : [{ text: 'This document has no text to render.', level: 0, list: false }]

  for (const block of paragraphs) {
    const size = block.level > 0 ? HEADING_SIZE : BODY_SIZE
    const font = block.level > 0 ? heading : body
    const prefix = block.list ? '- ' : ''

    const lines = wrapText(
      winAnsiSafe(`${prefix}${block.text}`),
      (value) => font.widthOfTextAtSize(value, size),
      PAGE_WIDTH - MARGIN * 2,
    )

    for (const line of lines) {
      if (top - size < MARGIN) {
        page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        top = PAGE_HEIGHT - MARGIN
      }

      page.drawText(line, {
        x: MARGIN,
        y: top - size,
        size,
        font,
        color: rgb(0, 0, 0),
      })

      top -= size * LINE_HEIGHT
    }

    top -= size * 0.5
  }

  const bytes = await document.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}

/** Read a .docx and render its paragraphs as pages. */
export async function docxToPdf(file: File): Promise<Blob> {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error(
      `"${file.name}" is over ${formatSize(50 * 1024 * 1024)}. Open a smaller document.`,
    )
  }

  return blocksToPdf(await readDocx(file))
}
