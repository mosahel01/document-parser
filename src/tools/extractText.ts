import { readDocx, docxToText } from './docx'
import { readPdfParagraphs } from './pdfToDocx'
import { readTextFile, isTextExtension } from './replace'

export type ExtractedText = {
  text: string
  wordCount: number
  characterCount: number
  lineCount: number
}

export function countStats(text: string): { wordCount: number; characterCount: number; lineCount: number } {
  const characterCount = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const lineCount = text ? text.split('\n').length : 0
  return { wordCount: words, characterCount, lineCount }
}

export async function extractTextFromFile(file: File): Promise<ExtractedText> {
  const lower = file.name.toLowerCase()

  if (lower.endsWith('.pdf')) {
    const paragraphs = await readPdfParagraphs(file)
    const text = paragraphs.join('\n\n')
    const stats = countStats(text)
    return { text, ...stats }
  }

  if (lower.endsWith('.docx')) {
    const blocks = await readDocx(file)
    const text = docxToText(blocks)
    const stats = countStats(text)
    return { text, ...stats }
  }

  if (isTextExtension(file.name)) {
    const text = await readTextFile(file)
    const stats = countStats(text)
    return { text, ...stats }
  }

  // Fallback: attempt reading as plain text
  const text = await file.text()
  const stats = countStats(text)
  return { text, ...stats }
}

