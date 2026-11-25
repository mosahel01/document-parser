import { describe, expect, it } from 'vitest'
import { PDFDocument, degrees } from 'pdf-lib'
import {
  MAX_PDF_BYTES,
  countPages,
  extractPages,
  mergePdfs,
  pageImageName,
  pagesToPdf,
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

describe('opening a PDF', () => {
  it('names the file that could not be parsed', async () => {
    const broken = new File(
      [new TextEncoder().encode('%PDF-1.7\nthis is not the rest of one')],
      'broken.pdf',
      { type: 'application/pdf' },
    )

    await expect(mergePdfs([broken, await sample(1)])).rejects.toThrow(
      'broken.pdf could not be opened as a PDF.',
    )
  })

  it('says so when the file only has a PDF name', async () => {
    const text = new File(['just notes'], 'notes.pdf', { type: 'text/plain' })

    await expect(countPages(text)).rejects.toThrow(
      'notes.pdf does not start like a PDF.',
    )
  })

  it('refuses a file over the size cap without reading it', async () => {
    const huge = {
      name: 'huge.pdf',
      size: MAX_PDF_BYTES + 1,
      arrayBuffer: () => Promise.reject(new Error('should not be read')),
    } as unknown as File

    await expect(countPages(huge)).rejects.toThrow('over 100.0 MB')
  })
})

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

describe('pagesToPdf', () => {
  async function sized(widths: number[], name = 'sized.pdf'): Promise<File> {
    const document = await PDFDocument.create()
    for (const width of widths) document.addPage([width, 100])
    const bytes = await document.save()
    return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' })
  }

  async function widthsOf(blob: Blob): Promise<number[]> {
    const document = await PDFDocument.load(await blob.arrayBuffer())
    return document.getPages().map((page) => page.getWidth())
  }

  it('keeps the order and copies a page that is used twice', async () => {
    const blob = await pagesToPdf([await sized([200, 300, 400])], [
      { source: 0, page: 2, turn: 0 },
      { source: 0, page: 0, turn: 0 },
      { source: 0, page: 2, turn: 0 },
    ])

    expect(await widthsOf(blob)).toEqual([400, 200, 400])
  })

  it('takes pages from several files in one order', async () => {
    const blob = await pagesToPdf(
      [await sized([200], 'a.pdf'), await sized([300], 'b.pdf')],
      [
        { source: 1, page: 0, turn: 0 },
        { source: 0, page: 0, turn: 0 },
      ],
    )

    expect(await widthsOf(blob)).toEqual([300, 200])
  })

  it('adds the turn to the rotation the page already had', async () => {
    const document = await PDFDocument.create()
    document.addPage([200, 100]).setRotation(degrees(90))
    const source = new File([new Uint8Array(await document.save())], 'sideways.pdf', {
      type: 'application/pdf',
    })

    const blob = await pagesToPdf([source], [{ source: 0, page: 0, turn: 90 }])
    const result = await PDFDocument.load(await blob.arrayBuffer())

    expect(result.getPage(0).getRotation().angle).toBe(180)
  })

  it('crops only the pages that ask for it', async () => {
    const blob = await pagesToPdf([await sized([200, 300])], [
      { source: 0, page: 0, turn: 0 },
      {
        source: 0,
        page: 1,
        turn: 0,
        crop: { top: 10, right: 10, bottom: 10, left: 10 },
      },
    ])
    const result = await PDFDocument.load(await blob.arrayBuffer())

    expect(result.getPage(0).getCropBox().width).toBe(200)
    expect(result.getPage(1).getCropBox().width).toBeCloseTo(240)
    expect(result.getPage(1).getCropBox().height).toBeCloseTo(80)
  })

  it('refuses to save a document with no pages', async () => {
    await expect(pagesToPdf([await sized([200])], [])).rejects.toThrow(
      'no pages left to save',
    )
  })
})

describe('pageImageName', () => {
  it('pads the page number to the document width', () => {
    expect(pageImageName('report', 3, 12, 'jpg')).toBe('report-page-03.jpg')
    expect(pageImageName('report', 3, 9, 'png')).toBe('report-page-3.png')
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
