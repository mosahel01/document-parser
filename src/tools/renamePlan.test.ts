import { describe, expect, it } from 'vitest'
import { planRenames, renameOutputs } from './renamePlan'

const file = (name: string) => new File(['x'], name)

describe('planRenames', () => {
  it('asks for a conversion when the extension changes', () => {
    const [row] = planRenames([file('photo.png')], 'holiday', 'jpg')

    expect(row.next).toBe('holiday.jpg')
    expect(row.conversion.kind).toBe('image')
    expect(row.note).toBeNull()
  })

  it('numbers a converted batch and keeps the new extension', () => {
    const rows = planRenames([file('a.png'), file('b.png')], 'holiday', 'webp')

    expect(rows.map((row) => row.next)).toEqual([
      'holiday-1.webp',
      'holiday-2.webp',
    ])
  })

  it('keeps the real extension when a conversion is impossible', () => {
    const [row] = planRenames([file('report.pdf')], 'final', 'png')

    expect(row.next).toBe('final.pdf')
    expect(row.conversion.kind).toBe('blocked')
    expect(row.note).toContain('cannot write .png')
  })

  it('plans a real conversion for a document target', () => {
    const [row] = planRenames([file('report.pdf')], 'final', 'docx')

    expect(row.next).toBe('final.docx')
    expect(row.conversion.kind).toBe('document')
    expect(row.note).toBeNull()
  })

  it('numbers two files that would otherwise land on the same name', () => {
    const rows = planRenames([file('a.png'), file('a.jpeg')], '', 'webp')

    expect(rows.map((row) => row.next)).toEqual(['a.webp', 'a-2.webp'])
  })

  it('leaves names and bytes alone when both boxes are empty', () => {
    const [row] = planRenames([file('a.pdf')], '', '')

    expect(row.next).toBe('a.pdf')
    expect(row.conversion.kind).toBe('none')
  })
})

describe('renameOutputs', () => {
  it('returns the same bytes and the new name when nothing converts', async () => {
    const source = file('a.pdf')
    const [output] = await renameOutputs(planRenames([source], 'b', ''))

    expect(output.name).toBe('b.pdf')
    expect(output.blob).toBe(source)
  })

  it('reports progress once per file', async () => {
    const seen: number[] = []
    await renameOutputs(
      planRenames([file('a.pdf'), file('b.pdf')], 'c', ''),
      0.9,
      (done) => seen.push(done),
    )

    expect(seen).toEqual([1, 2])
  })
})
