import { describe, expect, it } from 'vitest'
import { PDFDocument, degrees } from 'pdf-lib'
import {
  addPageNumbers,
  addWatermark,
  cropBoxFor,
  cropPdf,
  pageNumberText,
} from './pdfEnhance'

const base = { x: 0, y: 0, width: 200, height: 400 }
const margins = { top: 5, right: 10, bottom: 15, left: 20 }

async function sample(rotation = 0): Promise<File> {
  const document = await PDFDocument.create()
  document.addPage([200, 400]).setRotation(degrees(rotation))
  const bytes = await document.save()
  return new File([new Uint8Array(bytes)], 'sample.pdf', {
    type: 'application/pdf',
  })
}

describe('cropBoxFor', () => {
  it('takes margins straight off an upright page', () => {
    expect(cropBoxFor(base, margins, 0)).toEqual({
      x: 40,
      y: 60,
      width: 140,
      height: 320,
    })
  })

  it('maps a sideways page’s visible edges back onto the page', () => {
    expect(cropBoxFor(base, margins, 90)).toEqual({
      x: 10,
      y: 80,
      width: 160,
      height: 280,
    })
  })

  it('turns the mapping around for an upside-down page', () => {
    expect(cropBoxFor(base, margins, 180)).toEqual({
      x: 20,
      y: 20,
      width: 140,
      height: 320,
    })
  })

  it('maps a page turned the other way', () => {
    expect(cropBoxFor(base, margins, 270)).toEqual({
      x: 30,
      y: 40,
      width: 160,
      height: 280,
    })
  })
})

describe('pageNumberText', () => {
  it('writes the three formats the tool offers', () => {
    expect(pageNumberText(3, 12, 'number')).toBe('3')
    expect(pageNumberText(3, 12, 'page-number')).toBe('Page 3')
    expect(pageNumberText(3, 12, 'number-of-total')).toBe('3 of 12')
  })
})

describe('cropPdf', () => {
  it('sets a crop box rather than rebuilding the page', async () => {
    const blob = await cropPdf(await sample(), {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    })
    const result = await PDFDocument.load(await blob.arrayBuffer())
    const box = result.getPage(0).getCropBox()

    expect(box.x).toBeCloseTo(20)
    expect(box.y).toBeCloseTo(40)
    expect(box.width).toBeCloseTo(160)
    expect(box.height).toBeCloseTo(320)
  })

  it('refuses margins that would erase the page', async () => {
    await expect(
      cropPdf(await sample(), { top: 0, right: 60, bottom: 0, left: 50 }),
    ).rejects.toThrow('would remove the page')
  })
})

describe('addPageNumbers', () => {
  it('numbers every page and keeps the file readable', async () => {
    const blob = await addPageNumbers(await sample(), {
      position: 'bottom-center',
      format: 'number-of-total',
      fontSize: 11,
      margin: 24,
      start: 1,
      skipFirst: false,
    })
    const result = await PDFDocument.load(await blob.arrayBuffer())

    expect(result.getPageCount()).toBe(1)
  })
})

describe('addWatermark', () => {
  it('draws on every page', async () => {
    const blob = await addWatermark(await sample(90), {
      text: 'DRAFT',
      fontSize: 48,
      opacity: 0.3,
      angle: 45,
    })
    const result = await PDFDocument.load(await blob.arrayBuffer())

    expect(result.getPageCount()).toBe(1)
  })

  it('refuses empty text', async () => {
    await expect(
      addWatermark(await sample(), {
        text: '   ',
        fontSize: 48,
        opacity: 0.3,
        angle: 45,
      }),
    ).rejects.toThrow('Type the watermark text')
  })
})
