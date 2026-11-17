import { describe, expect, it } from 'vitest'
import { conversionFor, isImageName, sameFormat } from './convert'

describe('conversionFor', () => {
  it('does nothing when the extension is unchanged', () => {
    expect(conversionFor('photo.png', 'png').kind).toBe('none')
    expect(conversionFor('photo.png', '').kind).toBe('none')
  })

  it('treats jpg and jpeg as the same format', () => {
    expect(sameFormat('jpg', 'jpeg')).toBe(true)
    expect(conversionFor('photo.jpeg', 'jpg').kind).toBe('none')
  })

  it('converts one image format into another', () => {
    expect(conversionFor('photo.png', 'webp')).toEqual({
      kind: 'image',
      target: 'webp',
      note: null,
    })
  })

  it('turns an image into a PDF', () => {
    expect(conversionFor('scan.JPG', '.pdf').kind).toBe('pdf')
  })

  it('refuses a PDF made from something that is not an image', () => {
    const plan = conversionFor('report.docx', 'pdf')

    expect(plan.kind).toBe('blocked')
    expect(plan.note).toContain('Only images become PDFs')
  })

  it('refuses a format the browser cannot write', () => {
    const plan = conversionFor('photo.png', 'docx')

    expect(plan.kind).toBe('blocked')
    expect(plan.note).toContain('PNG, JPG, WebP')
  })

  it('refuses to redraw a document as an image', () => {
    expect(conversionFor('report.pdf', 'png').kind).toBe('blocked')
  })
})

describe('isImageName', () => {
  it('knows image names and ignores documents', () => {
    expect(isImageName('holiday.JPEG')).toBe(true)
    expect(isImageName('holiday.svg')).toBe(true)
    expect(isImageName('report.pdf')).toBe(false)
  })
})
