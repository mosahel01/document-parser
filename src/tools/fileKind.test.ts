import { describe, expect, it } from 'vitest'
import {
  batchOperationsFor,
  groupFiles,
  groupLabel,
  kindOf,
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
  it('offers page editing, splitting, and PDF to Word for a single PDF', () => {
    const [group] = groupFiles(named('report.pdf'))
    const operations = operationsFor(group)

    expect(operations.map((operation) => operation.label)).toEqual([
      'Edit pages',
      'Split or extract pages',
      'PDF to Word',
    ])
    expect(operations.every((operation) => operation.files.length === 1))
      .toBe(true)
  })

  it('offers merging, not splitting, when several PDFs arrive', () => {
    const [group] = groupFiles(named('a.pdf', 'b.pdf'))
    const operations = operationsFor(group)

    expect(operations).toHaveLength(1)
    expect(operations[0].tool).toBe('pdf')
    expect(operations[0].files.map((file) => file.name)).toEqual([
      'a.pdf',
      'b.pdf',
    ])
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
      'compress',
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
