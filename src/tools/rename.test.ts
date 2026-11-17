import { describe, expect, it } from 'vitest'
import {
  buildNames,
  joinedBaseName,
  replaceExtension,
  splitExtension,
} from './rename'

const file = (name: string) => new File(['x'], name)

describe('buildNames', () => {
  it('renames one file exactly and keeps its extension', () => {
    const [row] = buildNames([file('Draft Report.docx')], 'final report', '')

    expect(row.next).toBe('final report.docx')
  })

  it('numbers a batch and keeps each extension', () => {
    const rows = buildNames(
      [file('a.pdf'), file('b.png'), file('c.pdf')],
      'holiday',
      '',
    )

    expect(rows.map((row) => row.next)).toEqual([
      'holiday-1.pdf',
      'holiday-2.png',
      'holiday-3.pdf',
    ])
  })

  it('leaves names alone when both boxes are empty', () => {
    const rows = buildNames([file('a.pdf'), file('b.pdf')], '   ', '')

    expect(rows.map((row) => row.next)).toEqual(['a.pdf', 'b.pdf'])
  })

  it('uses the typed extension for every file', () => {
    const rows = buildNames([file('a.png'), file('b.jpeg')], 'photo', 'webp')

    expect(rows.map((row) => row.next)).toEqual([
      'photo-1.webp',
      'photo-2.webp',
    ])
  })

  it('changes only the extension when the name is empty', () => {
    const rows = buildNames([file('a.pdf'), file('b.pdf')], '', '.txt')

    expect(rows.map((row) => row.next)).toEqual(['a.txt', 'b.txt'])
  })

  it('accepts an extension with a dot or spaces around it', () => {
    const [row] = buildNames([file('a.png')], 'photo', ' .JPEG. ')

    expect(row.next).toBe('photo.jpeg')
  })

  it('strips characters that are illegal in a filename', () => {
    const [row] = buildNames([file('a.pdf')], 'a/b:c', '')

    expect(row.next).toBe('a-b-c.pdf')
  })
})

describe('splitExtension', () => {
  it('treats a dotfile as a name without an extension', () => {
    expect(splitExtension('.gitignore')).toEqual({
      base: '.gitignore',
      ext: '',
    })
  })
})

describe('joinedBaseName', () => {
  it('keeps the name of a single file', () => {
    expect(joinedBaseName(['report.pdf'])).toBe('report')
  })

  it('joins two names so both are recognisable', () => {
    expect(joinedBaseName(['january.pdf', 'february.pdf'])).toBe(
      'january-and-february',
    )
  })

  it('counts the rest instead of listing ten names', () => {
    expect(joinedBaseName(['a.pdf', 'b.pdf', 'c.pdf'])).toBe('a-and-2-more')
  })

  it('falls back when there is nothing to take a name from', () => {
    expect(joinedBaseName([])).toBe('file')
  })
})

describe('replaceExtension', () => {
  it('swaps only the last extension', () => {
    expect(replaceExtension('report.final.pdf', 'docx')).toBe('report.final.docx')
  })

  it('accepts a leading dot', () => {
    expect(replaceExtension('a.png', '.jpg')).toBe('a.jpg')
  })
})
