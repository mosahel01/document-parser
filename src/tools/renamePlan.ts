import { buildNames, splitExtension, type NameRow } from './rename'
import {
  conversionFor,
  convertFile,
  convertsBytes,
  type Conversion,
} from './convert'

export type PlannedRow = {
  row: NameRow
  /** What has to happen to the bytes, not just the name. */
  conversion: Conversion
  /** The name after conversion is taken into account. */
  next: string
  /** Set when the typed extension cannot be honoured. */
  note: string | null
}

/**
 * Two files with the same stem and different extensions can ask for the same
 * new name when only the extension box is filled. Number the repeats so one
 * download does not silently overwrite the other.
 */
function uniqueNames(names: string[]): string[] {
  const used = new Set<string>()

  return names.map((name) => {
    let candidate = name

    if (used.has(candidate)) {
      const { base, ext } = splitExtension(candidate)
      let counter = 2
      do {
        candidate = `${base}-${counter}${ext}`
        counter += 1
      } while (used.has(candidate))
    }

    used.add(candidate)
    return candidate
  })
}

/**
 * Work out every output before anything is written: the final name, whether the
 * contents change, and why a file has to keep its old extension.
 */
export function planRenames(
  files: File[],
  name: string,
  extension: string,
): PlannedRow[] {
  const planned = buildNames(files, name, extension).map((row) => {
    const conversion = conversionFor(row.original, extension)

    if (conversion.kind !== 'blocked') {
      return { row, conversion, next: row.next, note: null }
    }

    // Promising .docx and shipping a PNG is a lie, so keep the real extension.
    const stem = splitExtension(row.next).base
    const kept = `${stem}${splitExtension(row.original).ext}`
    return { row, conversion, next: kept, note: conversion.note }
  })

  const finals = uniqueNames(planned.map((row) => row.next))
  return planned.map((row, index) => ({ ...row, next: finals[index] }))
}

export type OutputFile = { blob: Blob; name: string }

/** Produce the finished files, converting the ones that asked for it. */
export async function renameOutputs(
  rows: PlannedRow[],
  quality = 0.9,
  onProgress?: (done: number, total: number) => void,
): Promise<OutputFile[]> {
  const outputs: OutputFile[] = []

  for (const [index, row] of rows.entries()) {
    const blob = convertsBytes(row.conversion.kind)
      ? await convertFile(row.row.file, row.conversion.target, quality)
      : row.row.file

    outputs.push({ blob, name: row.next })
    onProgress?.(index + 1, rows.length)
  }

  return outputs
}
