import { describe, expect, it } from 'vitest'
import { docxToPdf, winAnsiSafe, wrapText } from './docxToPdf'
import { docxFromParagraphs } from './docxWriter'

/** Ten points per character, so a width in points is a character count. */
const measure = (value: string) => value.length * 10

describe('winAnsiSafe', () => {
  it('turns typographic punctuation into ASCII', () => {
    expect(winAnsiSafe('“quoted” – it’s…')).toBe('"quoted" - it\'s...')
  })

  it('keeps Latin-1 letters Helvetica can write', () => {
    expect(winAnsiSafe('café Müller')).toBe('café Müller')
  })

  it('replaces what cannot be written instead of failing', () => {
    expect(winAnsiSafe('日本語')).toBe('???')
  })

  it('keeps line breaks and turns tabs into spaces', () => {
    expect(winAnsiSafe('a\tb\nc')).toBe('a b\nc')
  })
})

describe('wrapText', () => {
  it('breaks at spaces to fit the width', () => {
    expect(wrapText('one two three four', measure, 90)).toEqual([
      'one two',
      'three',
      'four',
    ])
  })

  it('splits a single word longer than the page', () => {
    expect(wrapText('abcdefghij', measure, 40)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('honours a line break inside the paragraph', () => {
    expect(wrapText('top\nbottom', measure, 200)).toEqual(['top', 'bottom'])
  })

  it('returns one empty line for empty text', () => {
    expect(wrapText('', measure, 100)).toEqual([''])
  })
})

describe('docxToPdf', () => {
  it('writes a readable PDF from the words in a docx', async () => {
    const source = docxFromParagraphs([
      'Quarterly report',
      'The numbers went up. '.repeat(300),
    ])

    const pdf = await docxToPdf(new File([source], 'report.docx'))

    expect(pdf.type).toBe('application/pdf')

    const { PDFDocument } = await import('pdf-lib')
    const loaded = await PDFDocument.load(
      new Uint8Array(await pdf.arrayBuffer()) as Uint8Array<ArrayBuffer>,
    )

    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(2)
  })

  it('renders something rather than an empty page for an empty document', async () => {
    const pdf = await docxToPdf(new File([docxFromParagraphs([''])], 'blank.docx'))
    const { PDFDocument } = await import('pdf-lib')
    const loaded = await PDFDocument.load(
      new Uint8Array(await pdf.arrayBuffer()) as Uint8Array<ArrayBuffer>,
    )

    expect(loaded.getPageCount()).toBe(1)
  })
})
