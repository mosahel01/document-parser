import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  extractPages,
  mergePdfs,
  parsePageSelection,
  splitIntoPages,
} from './pdf'

async function sample(totalPages: number, name = 'sample.pdf'): Promise<File> {
  const document = await PDFDocument.create()
  for (let page = 0; page < totalPages; page += 1) {
    document.addPage([100, 100])
  }
  const bytes = await document.save()
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' })
}

async function pageCountOf(blob: Blob): Promise<number> {
  const document = await PDFDocument.load(await blob.arrayBuffer())
  return document.getPageCount()
}

describe('mergePdfs', () => {
  it('adds up the pages of every file in the order given', async () => {
    const merged = await mergePdfs([await sample(2), await sample(3)])

    expect(await pageCountOf(merged)).toBe(5)
  })
})

describe('splitIntoPages', () => {
  it('makes one numbered PDF per page', async () => {
    const pages = await splitIntoPages(await sample(3), 'report')

    expect(pages.map((page) => page.name)).toEqual([
      'report-1.pdf',
      'report-2.pdf',
      'report-3.pdf',
    ])
    expect(await Promise.all(pages.map((page) => pageCountOf(page.blob)))).toEqual(
      [1, 1, 1],
    )
  })

  it('pads the numbers when there are ten or more pages', async () => {
    const pages = await splitIntoPages(await sample(12), 'report')

    expect(pages[0].name).toBe('report-01.pdf')
    expect(pages[11].name).toBe('report-12.pdf')
  })
})

describe('extractPages', () => {
  it('keeps the requested order and can repeat a page', async () => {
    const blob = await extractPages(await sample(4), [2, 0, 2])

    expect(await pageCountOf(blob)).toBe(3)
  })
})

describe('parsePageSelection', () => {
  it('reads ranges and single pages as zero-based indices', () => {
    expect(parsePageSelection('1-3, 7', 10)).toEqual({
      pages: [0, 1, 2, 6],
      error: null,
    })
  })

  it('keeps the typed order', () => {
    expect(parsePageSelection('3, 1', 10).pages).toEqual([2, 0])
  })

  it('rejects a page outside the document', () => {
    expect(parsePageSelection('9', 5).error).toBe(
      'Page 9 is not in this document.',
    )
  })

  it('rejects a backwards range', () => {
    expect(parsePageSelection('4-2', 5).error).toBe('"4-2" runs backwards.')
  })

  it('rejects something that is not a page', () => {
    expect(parsePageSelection('appendix', 5).error).toBe(
      '"appendix" is not a page or a range.',
    )
  })
})
