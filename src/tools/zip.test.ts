import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { downloadNames, readZip, zipFiles } from './zip'

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
const file = (name: string, content: string) => new File([content], name)

describe('zipFiles', () => {
  it('packs files so they come back unchanged', async () => {
    const archive = await zipFiles([
      { name: 'a.txt', file: file('a.txt', 'alpha') },
      { name: 'b.txt', file: file('b.txt', 'beta') },
    ])

    const entries = await readZip(new File([archive], 'test.zip'))

    expect(entries.map((entry) => entry.path)).toEqual(['a.txt', 'b.txt'])
    expect(entries.map((entry) => text(entry.bytes))).toEqual(['alpha', 'beta'])
  })

  it('numbers duplicate names instead of overwriting one', async () => {
    const archive = await zipFiles([
      { name: 'notes.txt', file: file('notes.txt', 'first') },
      { name: 'notes.txt', file: file('notes.txt', 'second') },
    ])

    const entries = await readZip(new File([archive], 'test.zip'))

    expect(entries.map((entry) => entry.path)).toEqual([
      'notes (2).txt',
      'notes.txt',
    ])
    expect(entries.map((entry) => text(entry.bytes))).toEqual(['second', 'first'])
  })
})

describe('readZip', () => {
  it('keeps nested paths and skips directory entries', async () => {
    const archive = zipSync({
      'folder/': new Uint8Array(),
      'folder/page.txt': new TextEncoder().encode('inside'),
    })

    const entries = await readZip(new File([archive], 'nested.zip'))

    expect(entries.map((entry) => entry.path)).toEqual(['folder/page.txt'])
    expect(text(entries[0].bytes)).toBe('inside')
  })

  it('explains itself when the file is not a zip', async () => {
    await expect(readZip(new File(['not a zip'], 'broken.zip'))).rejects.toThrow(
      'not a zip archive',
    )
  })
})

describe('downloadNames', () => {
  it('keeps one entry per folder apart with a number', () => {
    expect(downloadNames(['a/notes.txt', 'b/notes.txt', 'c/notes.txt'])).toEqual(
      ['notes.txt', 'notes (2).txt', 'notes (3).txt'],
    )
  })

  it('drops folders a browser would ignore anyway', () => {
    expect(downloadNames(['deep/nested/report.pdf'])).toEqual(['report.pdf'])
  })
})
