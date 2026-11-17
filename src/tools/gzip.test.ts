import { describe, expect, it } from 'vitest'
import {
  gzipFile,
  gzipName,
  gunzipFile,
  readGzipName,
  unpackedName,
} from './gzip'

const textFile = (name: string, body: string) =>
  new File([body], name, { type: 'text/plain' })

function header(name: string, flags = 0x08, extra = new Uint8Array()): Uint8Array {
  const base = [0x1f, 0x8b, 8, flags, 0, 0, 0, 0, 0, 3]
  const extraPart =
    flags & 0x04
      ? [extra.length & 0xff, (extra.length >> 8) & 0xff, ...extra]
      : []
  const namePart = flags & 0x08 ? [...new TextEncoder().encode(name), 0] : []
  return new Uint8Array([...base, ...extraPart, ...namePart])
}

describe('gzip round trip', () => {
  it('gets the original text back', async () => {
    const original = 'the quick brown fox '.repeat(200)
    const packed = await gzipFile(textFile('notes.txt', original))
    const unpacked = await gunzipFile(
      new File([packed], 'notes.txt.gz', { type: 'application/gzip' }),
    )

    expect(await unpacked.text()).toBe(original)
  })

  it('explains itself when the file is not gzip', async () => {
    await expect(
      gunzipFile(new File(['not gzip at all'], 'bogus.gz')),
    ).rejects.toThrow('not a gzip archive')
  })
})

describe('readGzipName', () => {
  it('reads the stored name after the header', () => {
    expect(readGzipName(header('report.pdf'))).toBe('report.pdf')
  })

  it('skips an extra field before the name', () => {
    expect(readGzipName(header('notes.txt', 0x0c, new Uint8Array([1, 2, 3])))).toBe(
      'notes.txt',
    )
  })

  it('drops a folder path some writers leave in', () => {
    expect(readGzipName(header('docs/report.pdf'))).toBe('report.pdf')
  })

  it('returns nothing when the name flag is not set', () => {
    expect(readGzipName(header('report.pdf', 0))).toBeNull()
  })

  it('returns nothing for something that is not gzip', () => {
    expect(readGzipName(new Uint8Array([1, 2, 3]))).toBeNull()
  })
})

describe('names', () => {
  it('adds .gz when compressing', () => {
    expect(gzipName('report.pdf')).toBe('report.pdf.gz')
  })

  it('prefers the name stored inside the archive', () => {
    expect(unpackedName('download.gz', 'report.pdf')).toBe('report.pdf')
  })

  it('falls back to dropping .gz', () => {
    expect(unpackedName('report.pdf.gz', null)).toBe('report.pdf')
  })
})
