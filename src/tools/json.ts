export type JsonFormatOptions = {
  indent: 2 | 4 | 'tab' | 'minify'
  sortKeys?: boolean
}

export type JsonParseError = {
  message: string
  line?: number
  column?: number
}

export type JsonFormatResult =
  | {
      success: true
      formatted: string
      bytes: number
      lines: number
    }
  | {
      success: false
      error: JsonParseError
    }

function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }
  const obj = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeep(obj[key])
  }
  return sorted
}

function locateError(raw: string, error: SyntaxError): { line?: number; column?: number } {
  // Modern V8 error messages often include "at position X"
  const match = /position\s+(\d+)/i.exec(error.message)
  if (match) {
    const pos = parseInt(match[1], 10)
    let line = 1
    let column = 1
    for (let i = 0; i < pos && i < raw.length; i++) {
      if (raw[i] === '\n') {
        line++
        column = 1
      } else {
        column++
      }
    }
    return { line, column }
  }
  return {}
}

export function formatJson(
  raw: string,
  options: JsonFormatOptions = { indent: 2, sortKeys: false },
): JsonFormatResult {
  const trimmed = raw.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: 'Input is empty.' },
    }
  }

  try {
    let parsed = JSON.parse(trimmed)
    if (options.sortKeys) {
      parsed = sortKeysDeep(parsed)
    }

    const space =
      options.indent === 'minify'
        ? undefined
        : options.indent === 'tab'
          ? '\t'
          : options.indent

    const formatted = JSON.stringify(parsed, null, space)
    const bytes = new TextEncoder().encode(formatted).length
    const lines = formatted.split('\n').length

    return {
      success: true,
      formatted,
      bytes,
      lines,
    }
  } catch (err) {
    const error = err instanceof SyntaxError ? err : new Error(String(err))
    const loc = locateError(trimmed, error as SyntaxError)
    return {
      success: false,
      error: {
        message: error.message.replace(/^JSON\.parse:\s*/, ''),
        line: loc.line,
        column: loc.column,
      },
    }
  }
}

