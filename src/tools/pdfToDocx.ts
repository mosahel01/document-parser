import type { PDFDocumentProxy } from 'pdfjs-dist'
import { docxFromParagraphs } from './docxWriter'
import { formatSize } from '../lib/format'

/** Text extraction reads the whole file, so cap what the tab is asked to hold. */
export const MAX_PDF_BYTES = 100 * 1024 * 1024

/** One run of text from pdf.js: a word or a phrase, with its baseline. */
export type PdfTextItem = {
  str: string
  /** [scaleX, skewX, skewY, scaleY, x, y] */
  transform: number[]
}

/** Two items this close in y are on the same line, even if the PDF is sloppy. */
const LINE_TOLERANCE = 2

/** A gap this much larger than the line itself starts a new paragraph. */
const PARAGRAPH_GAP = 1.6

type Line = { y: number; height: number; parts: { x: number; text: string }[] }

/**
 * Rebuild paragraphs out of positioned text. A PDF has no paragraphs, only
 * glyphs at coordinates, so lines are grouped by baseline and a paragraph ends
 * where the vertical gap grows. Pure, so the heuristic is tested without a PDF.
 */
export function groupLines(items: PdfTextItem[]): string[] {
  const lines: Line[] = []

  for (const item of items) {
    if (item.str.trim() === '') continue

    const x = item.transform[4]
    const y = item.transform[5]
    const height = Math.abs(item.transform[3]) || 10

    // A find with a tolerance can pick the previous line when two baselines are
    // within a couple of points, which is still the same visual line.
    const line = lines.find((candidate) => Math.abs(candidate.y - y) <= LINE_TOLERANCE)

    if (line) {
      line.parts.push({ x, text: item.str })
      line.height = Math.max(line.height, height)
    } else {
      lines.push({ y, height, parts: [{ x, text: item.str }] })
    }
  }

  lines.sort((a, b) => b.y - a.y)

  const paragraphs: string[] = []
  let current: string[] = []
  let previous: Line | null = null

  for (const line of lines) {
    const text = line.parts
      .toSorted((a, b) => a.x - b.x)
      .map((part) => part.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text === '') continue

    if (previous && previous.y - line.y > previous.height * PARAGRAPH_GAP) {
      paragraphs.push(current.join(' '))
      current = []
    }

    current.push(text)
    previous = line
  }

  if (current.length > 0) paragraphs.push(current.join(' '))

  return paragraphs.filter((paragraph) => paragraph.trim() !== '')
}

/**
 * Read a PDF and write its text into a .docx. Layout, images, and fonts are not
 * carried over: this is the words in reading order, not a facsimile.
 */
export async function pdfToDocx(
  file: File,
): Promise<{ blob: Blob; paragraphs: string[] }> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(
      `"${file.name}" is over ${formatSize(MAX_PDF_BYTES)}. Open a smaller PDF.`,
    )
  }

  // Imported here so pdf.js stays out of the main bundle.
  const { pdfjs } = await import('../lib/pdfjs')
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })

  let pdf: PDFDocumentProxy
  try {
    pdf = await task.promise
  } catch {
    void task.destroy()
    throw new Error(
      `"${file.name}" could not be read as a PDF. If it is password protected, remove the password first.`,
    )
  }

  const paragraphs: string[] = []

  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      const items: PdfTextItem[] = []

      for (const item of content.items) {
        if ('str' in item) items.push({ str: item.str, transform: item.transform })
      }

      paragraphs.push(...groupLines(items))
    }
  } finally {
    void task.destroy()
  }

  if (paragraphs.length === 0) {
    throw new Error(
      `"${file.name}" has no text layer, so there is nothing to put in a Word file. A scanned PDF needs OCR, which runs on a server.`,
    )
  }

  return { blob: docxFromParagraphs(paragraphs), paragraphs }
}
