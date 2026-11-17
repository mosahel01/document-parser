import { describe, expect, it } from 'vitest'
import {
  buildPattern,
  isTextExtension,
  previewChange,
  readTextFile,
  replaceText,
  snippetAround,
} from './replace'

const options = {
  find: 'cat',
  replace: 'dog',
  regex: false,
  matchCase: false,
}

describe('replaceText', () => {
  it('replaces every match and counts them', () => {
    expect(replaceText('cat cat catalog', options)).toEqual({
      text: 'dog dog dogalog',
      count: 3,
    })
  })

  it('ignores case unless asked', () => {
    expect(replaceText('Cat cat', options).count).toBe(2)
    expect(replaceText('Cat cat', { ...options, matchCase: true }).text).toBe(
      'Cat dog',
    )
  })

  it('leaves text alone when nothing matches', () => {
    expect(replaceText('a fish', options)).toEqual({ text: 'a fish', count: 0 })
  })

  it('treats a literal search as literal, not as a pattern', () => {
    expect(replaceText('a.b axb', { ...options, find: 'a.b' })).toEqual({
      text: 'dog axb',
      count: 1,
    })
  })

  it('keeps $ signs in a literal replacement', () => {
    expect(
      replaceText('cost', { ...options, find: 'cost', replace: '$&100' }).text,
    ).toBe('$&100')
  })

  it('supports groups in a pattern replacement', () => {
    expect(
      replaceText('John Smith', {
        ...options,
        find: '(\\w+) (\\w+)',
        replace: '$2, $1',
        regex: true,
      }).text,
    ).toBe('Smith, John')
  })

  it('refuses an empty search', () => {
    expect(() => replaceText('text', { ...options, find: '' })).toThrow(
      'Type something to find.',
    )
  })

  it('refuses a broken pattern', () => {
    expect(() =>
      replaceText('text', { ...options, find: '(', regex: true }),
    ).toThrow('is not a valid pattern')
  })
})

describe('buildPattern', () => {
  it('anchors nothing and matches globally', () => {
    expect(buildPattern(options).flags).toBe('gi')
  })
})

describe('snippetAround', () => {
  it('shows the words either side of the first match', () => {
    const snippet = snippetAround('start middle cat end', options, 6)

    expect(snippet).toBe('…iddle cat end')
  })

  it('returns nothing when there is no match', () => {
    expect(snippetAround('one two', options)).toBeNull()
  })
})

describe('previewChange', () => {
  it('shows the same window before and after', () => {
    const change = previewChange('a cat sat on a mat', options, 8)

    expect(change?.before).toBe('a cat sat on…')
    expect(change?.after).toBe('a dog sat on…')
  })

  it('shows groups applied inside the window', () => {
    const change = previewChange(
      'John Smith wrote this',
      { find: '(\\w+) (\\w+)', replace: '$2, $1', regex: true, matchCase: false },
      20,
    )

    expect(change).toEqual({
      before: 'John Smith wrote this',
      after: 'Smith, John wrote this',
    })
  })

  it('returns nothing when the search finds nothing', () => {
    expect(previewChange('nothing here', options)).toBeNull()
  })
})

describe('readTextFile', () => {
  it('reads ordinary text', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    expect(await readTextFile(file)).toBe('hello')
  })

  it('refuses a file with null bytes', async () => {
    const file = new File([new Uint8Array([104, 0, 105])], 'blob.bin', {
      type: 'application/octet-stream',
    })

    await expect(readTextFile(file)).rejects.toThrow('binary file')
  })

  it('refuses text that is not UTF-8 rather than garbling it', async () => {
    const file = new File([new Uint8Array([0xff, 0xfe, 0x41])], 'latin.txt', {
      type: 'text/plain',
    })

    await expect(readTextFile(file)).rejects.toThrow('not UTF-8')
  })
})

describe('isTextExtension', () => {
  it('accepts the formats the tool rewrites', () => {
    expect(isTextExtension('notes.md')).toBe(true)
    expect(isTextExtension('REPORT.CSV')).toBe(true)
    expect(isTextExtension('page.html')).toBe(true)
  })

  it('refuses formats it cannot rewrite as text', () => {
    expect(isTextExtension('photo.png')).toBe(false)
    expect(isTextExtension('report.pdf')).toBe(false)
    expect(isTextExtension('archive.tar.gz')).toBe(false)
  })

  it('refuses a file with no extension', () => {
    expect(isTextExtension('README')).toBe(false)
    expect(isTextExtension('.env')).toBe(false)
  })
})
