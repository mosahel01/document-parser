import { describe, expect, it } from 'vitest'
import {
  commonTargets,
  conversionFor,
  convertsBytes,
  isImageName,
  sameFormat,
  targetsFor,
  textBlocks,
} from './convert'

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

  it('turns a PDF into a Word file or text', () => {
    expect(conversionFor('report.pdf', 'docx')).toEqual({
      kind: 'document',
      target: 'docx',
      note: null,
    })
    expect(conversionFor('report.pdf', 'html').kind).toBe('document')
    expect(conversionFor('report.pdf', 'txt').kind).toBe('document')
  })

  it('turns a Word file into a PDF or text', () => {
    expect(conversionFor('report.docx', 'pdf')).toEqual({
      kind: 'pdf',
      target: 'pdf',
      note: null,
    })
    expect(conversionFor('report.docx', 'md').kind).toBe('document')
  })

  it('turns plain text into a PDF or a Word file', () => {
    expect(conversionFor('notes.txt', 'pdf').kind).toBe('pdf')
    expect(conversionFor('notes.txt', 'docx').kind).toBe('document')
  })

  it('refuses a Word file made from an image', () => {
    const plan = conversionFor('photo.png', 'docx')

    expect(plan.kind).toBe('blocked')
    expect(plan.note).toContain('PNG, JPG, WebP, and PDF')
  })

  it('refuses to redraw a document as an image', () => {
    expect(conversionFor('report.pdf', 'png').kind).toBe('blocked')
  })

  it('refuses to relabel plain text as HTML', () => {
    const plan = conversionFor('notes.txt', 'html')

    expect(plan.kind).toBe('blocked')
    expect(plan.note).toContain('PDF and Word')
  })

  it('names a source it cannot read at all', () => {
    const plan = conversionFor('program.exe', 'txt')

    expect(plan.kind).toBe('blocked')
    expect(plan.note).toContain('cannot read a .exe file')
  })
})

describe('targetsFor', () => {
  it('leaves out the format the file is already in', () => {
    expect(targetsFor('photo.png')).toEqual(['jpg', 'webp', 'pdf'])
    expect(targetsFor('photo.jpg')).toEqual(['png', 'webp', 'pdf'])
  })

  it('offers document formats only where they can be written honestly', () => {
    expect(targetsFor('report.pdf')).toEqual(['docx', 'html', 'md', 'txt'])
    expect(targetsFor('report.docx')).toEqual(['pdf', 'html', 'md', 'txt'])
    expect(targetsFor('notes.txt')).toEqual(['pdf', 'docx'])
  })

  it('offers nothing for a type the browser cannot read', () => {
    expect(targetsFor('program.exe')).toEqual([])
  })
})

describe('commonTargets', () => {
  const named = (...names: string[]) =>
    names.map((name) => new File([new Uint8Array([1])], name))

  it('offers what every file in the drop can become', () => {
    expect(commonTargets(named('photo.png', 'scan.pdf'))).toEqual(['pdf'])
    expect(commonTargets(named('photo.png', 'report.docx'))).toEqual(['pdf'])
    expect(commonTargets(named('scan.pdf', 'report.docx'))).toEqual([
      'pdf',
      'docx',
      'html',
      'md',
      'txt',
    ])
    expect(commonTargets(named('photo.png', 'notes.txt'))).toEqual(['pdf'])
  })

  it('leaves out a button that would change nothing for every file', () => {
    expect(commonTargets(named('one.png', 'two.png'))).toEqual([
      'jpg',
      'webp',
      'pdf',
    ])
  })

  it('offers nothing when one file cannot be read at all', () => {
    expect(commonTargets(named('photo.png', 'program.exe'))).toEqual([])
    expect(commonTargets([])).toEqual([])
  })
})

describe('convertsBytes', () => {
  it('only counts plans that replace the bytes', () => {
    expect(convertsBytes('none')).toBe(false)
    expect(convertsBytes('blocked')).toBe(false)
    expect(convertsBytes('image')).toBe(true)
    expect(convertsBytes('pdf')).toBe(true)
    expect(convertsBytes('document')).toBe(true)
  })
})

describe('textBlocks', () => {
  it('starts a new paragraph at a blank line', () => {
    expect(textBlocks('one line\ntwo lines\n\nsecond part\n')).toEqual([
      { text: 'one line\ntwo lines', level: 0, list: false },
      { text: 'second part', level: 0, list: false },
    ])
  })

  it('keeps a single block of text whole', () => {
    expect(textBlocks('just one paragraph')).toHaveLength(1)
    expect(textBlocks('   \n\n  ')).toEqual([])
  })
})

describe('isImageName', () => {
  it('knows image names and ignores documents', () => {
    expect(isImageName('holiday.JPEG')).toBe(true)
    expect(isImageName('holiday.svg')).toBe(true)
    expect(isImageName('report.pdf')).toBe(false)
  })
})
