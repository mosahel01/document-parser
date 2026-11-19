import { describe, expect, it } from 'vitest'
import { formatJson } from './json'

describe('formatJson', () => {
  it('formats valid JSON with 2-space indent by default', () => {
    const res = formatJson('{"b":1,"a":2}')
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.formatted).toBe('{\n  "b": 1,\n  "a": 2\n}')
      expect(res.lines).toBe(4)
    }
  })

  it('minifies JSON when requested', () => {
    const res = formatJson('{\n  "name": "doc",\n  "count": 42\n}', {
      indent: 'minify',
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.formatted).toBe('{"name":"doc","count":42}')
      expect(res.lines).toBe(1)
    }
  })

  it('sorts object keys recursively', () => {
    const res = formatJson('{"z": 1, "a": {"d": 4, "b": 2}}', {
      indent: 2,
      sortKeys: true,
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.formatted).toBe('{\n  "a": {\n    "b": 2,\n    "d": 4\n  },\n  "z": 1\n}')
    }
  })

  it('reports syntax error on invalid JSON', () => {
    const res = formatJson('{"bad": }')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.message).toBeTruthy()
    }
  })
})

