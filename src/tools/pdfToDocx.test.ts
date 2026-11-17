import { describe, expect, it } from 'vitest'
import { groupLines, type PdfTextItem } from './pdfToDocx'

const at = (str: string, x: number, y: number, height = 10): PdfTextItem => ({
  str,
  transform: [height, 0, 0, height, x, y],
})

describe('groupLines', () => {
  it('joins items on one baseline in reading order', () => {
    const items = [at('world', 60, 700), at('Hello', 20, 700)]

    expect(groupLines(items)).toEqual(['Hello world'])
  })

  it('keeps a normal line break inside one paragraph', () => {
    expect(groupLines([at('one', 20, 700), at('two', 20, 686)])).toEqual([
      'one two',
    ])
  })

  it('starts a new paragraph after a wide vertical gap', () => {
    const items = [
      at('first paragraph', 20, 700),
      at('still first', 20, 686),
      at('second paragraph', 20, 600),
    ]

    expect(groupLines(items)).toEqual([
      'first paragraph still first',
      'second paragraph',
    ])
  })

  it('sorts by height so a PDF written bottom-up still reads top-down', () => {
    expect(groupLines([at('second', 20, 600), at('first', 20, 700)])).toEqual([
      'first',
      'second',
    ])
  })

  it('ignores empty items and tidies gaps inside a line', () => {
    expect(groupLines([at('  ', 20, 700), at('a', 20, 700), at('b', 40, 700)])).toEqual(
      ['a b'],
    )
  })
})
