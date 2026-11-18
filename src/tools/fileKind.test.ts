import { describe, expect, it } from 'vitest'
import {
  batchOperationsFor,
  groupFiles,
  groupLabel,
  kindOf,
  missingActionNote,
  operationsFor,
} from './fileKind'

function named(...names: string[]): File[] {
  return names.map((name) => new File(['x'], name))
}

describe('kindOf', () => {
  it('reads the extension rather than the declared type', () => {
    expect(kindOf('photo.PNG')).toBe('image')
    expect(kindOf('diagram.jpeg')).toBe('image')
    expect(kindOf('report.pdf')).toBe('pdf')
    expect(kindOf('letter.docx')).toBe('docx')
    expect(kindOf('notes.md')).toBe('text')
    expect(kindOf('backup.zip')).toBe('zip')
    expect(kindOf('log.gz')).toBe('gzip')
  })

  it('puts anything it cannot read in the other bucket', () => {
    expect(kindOf('scan.tiff')).toBe('other')
    expect(kindOf('legacy.doc')).toBe('other')
    expect(kindOf('no-extension')).toBe('other')
    expect(kindOf('.env')).toBe('other')
  })
})

describe('groupFiles', () => {
  it('keeps first-seen order and counts each kind', () => {
    const groups = groupFiles(
      named('b.pdf', 'a.png', 'c.pdf', 'notes.txt', 'd.png'),
    )

    expect(groups.map((group) => [group.kind, group.label])).toEqual([
      ['pdf', '2 PDFs'],
      ['image', '2 images'],
      ['text', '1 text file'],
    ])
    expect(groups[0].files.map((file) => file.name)).toEqual(['b.pdf', 'c.pdf'])
  })

  it('returns nothing for an empty drop', () => {
    expect(groupFiles([])).toEqual([])
  })
})

describe('operationsFor', () => {
  it('offers page editing, finishing, images, and converting for one PDF', () => {
    const [group] = groupFiles(named('report.pdf'))
    const operations = operationsFor(group)

    expect(operations.map((operation) => operation.label)).toEqual([
      'Organize pages',
      'Extract or split pages',
      'Compress',
      'Crop margins',
      'Page numbers',
      'Watermark',
      'Save pages as images',
      'Convert',
    ])
    expect(operations.map((operation) => operation.tool)).toEqual([
      'organize',
      'extract',
      'compressPdf',
      'crop',
      'number',
      'watermark',
      'toImages',
      'convert',
    ])
    expect(operations.every((operation) => operation.files.length === 1))
      .toBe(true)
  })

  it('routes converting to the converter, not to the Word tab', () => {
    const [pdf] = groupFiles(named('report.pdf'))
    const [word] = groupFiles(named('letter.docx'))

    expect(
      operationsFor(pdf).find((operation) => operation.label === 'Convert')?.tool,
    ).toBe('convert')
    expect(operationsFor(word).map((operation) => operation.tool)).toEqual([
      'convert',
    ])
  })

  it('offers converting, editing, and a PDF for one photo', () => {
    const [group] = groupFiles(named('holiday.png'))

    expect(operationsFor(group).map((operation) => operation.tool)).toEqual([
      'convert',
      'image',
      'imagesToPdf',
    ])
  })

  it('keeps photo editing to one photo, since it edits one at a time', () => {
    const [group] = groupFiles(named('a.png', 'b.png'))

    expect(operationsFor(group).map((operation) => operation.tool)).toEqual([
      'convert',
      'imagesToPdf',
    ])
    expect(missingActionNote(group)).toContain('one photo at a time')
  })

  it('offers merging, not splitting, when several PDFs arrive', () => {
    const [group] = groupFiles(named('a.pdf', 'b.pdf'))
    const operations = operationsFor(group)

    expect(operations).toHaveLength(1)
    expect(operations[0].tool).toBe('merge')
    expect(operations[0].files.map((file) => file.name)).toEqual([
      'a.pdf',
      'b.pdf',
    ])
  })

  it('routes gzip apart from PDF compression', () => {
    const [pdf] = groupFiles(named('report.pdf'))
    const [archive] = groupFiles(named('log.gz'))

    expect(operationsFor(pdf).map((operation) => operation.tool)).toContain(
      'compressPdf',
    )
    expect(operationsFor(archive)[0]).toMatchObject({
      tool: 'gzip',
      mode: 'decompress',
    })
  })

  it('only offers single-file operations for one file of a kind', () => {
    const [one] = groupFiles(named('a.zip'))
    const [two] = groupFiles(named('a.zip', 'b.zip'))

    expect(operationsFor(one).map((operation) => operation.tool)).toEqual(['zip'])
    expect(operationsFor(two)).toEqual([])
  })

  it('offers nothing type-specific for an unknown file', () => {
    const [group] = groupFiles(named('blob.bin'))

    expect(operationsFor(group)).toEqual([])
  })
})

describe('batchOperationsFor', () => {
  it('renames, zips, and compresses the whole drop, mixed types included', () => {
    const files = named('a.pdf', 'b.png', 'c.txt')
    const operations = batchOperationsFor(files)

    expect(operations.map((operation) => operation.tool)).toEqual([
      'rename',
      'zip',
      'gzip',
    ])
    for (const operation of operations) expect(operation.files).toHaveLength(3)
  })

  it('offers nothing until a file arrives', () => {
    expect(batchOperationsFor([])).toEqual([])
  })
})

describe('groupLabel', () => {
  it('pluralises only when it should', () => {
    expect(groupLabel('pdf', 1)).toBe('1 PDF')
    expect(groupLabel('pdf', 2)).toBe('2 PDFs')
    expect(groupLabel('docx', 1)).toBe('1 Word document')
  })
})
