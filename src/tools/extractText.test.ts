import { describe, expect, it } from 'vitest'
import { countStats } from './extractText'

describe('countStats', () => {
  it('counts words, characters, and lines correctly', () => {
    const text = 'Hello world\nThis is a second line.'
    const stats = countStats(text)
    expect(stats.characterCount).toBe(text.length)
    expect(stats.wordCount).toBe(7)
    expect(stats.lineCount).toBe(2)
  })

  it('handles empty text', () => {
    const stats = countStats('')
    expect(stats.characterCount).toBe(0)
    expect(stats.wordCount).toBe(0)
    expect(stats.lineCount).toBe(0)
  })
})

