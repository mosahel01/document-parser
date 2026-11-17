import { formatSize } from '../lib/format'

/**
 * A gzip stream is tiny until it is not: a few hundred KB can expand to
 * gigabytes, so the unpacker counts bytes and stops.
 */
export const MAX_UNPACKED_BYTES = 200 * 1024 * 1024

export function gzipName(fileName: string): string {
  return `${fileName}.gz`
}

/**
 * gzip keeps the original name in an optional header field. When it is there it
 * is a better answer than guessing from the archive's own name.
 */
export function readGzipName(bytes: Uint8Array): string | null {
  if (bytes.length < 10) return null
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b || bytes[2] !== 8) return null

  const flags = bytes[3]
  let offset = 10

  if ((flags & 0x04) !== 0) {
    if (offset + 2 > bytes.length) return null
    const extraLength = bytes[offset] | (bytes[offset + 1] << 8)
    offset += 2 + extraLength
  }

  if ((flags & 0x08) === 0) return null

  const start = offset
  let end = start
  while (end < bytes.length && bytes[end] !== 0) end += 1
  if (end === start) return null

  const stored = new TextDecoder().decode(bytes.subarray(start, end))
  // The spec says basename, but some writers store a full path anyway.
  const base = stored.split(/[\\/]/).pop() ?? ''
  return base.trim() === '' ? null : base
}

export function unpackedName(fileName: string, innerName: string | null): string {
  if (innerName) return innerName

  const stripped = fileName.replace(/\.(gz|gzip)$/i, '')
  return stripped === fileName ? `${fileName}.out` : stripped
}

/** Compress one file into a .gz stream. */
export async function gzipFile(file: File): Promise<Blob> {
  const compressed = file.stream().pipeThrough(new CompressionStream('gzip'))
  const bytes = await new Response(compressed).arrayBuffer()
  return new Blob([bytes], { type: 'application/gzip' })
}

/** Expand a .gz file, refusing to build a buffer the tab cannot hold. */
export async function gunzipFile(file: File): Promise<Blob> {
  const expanded = file
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader()

  const parts: Uint8Array<ArrayBuffer>[] = []
  let total = 0

  try {
    for (;;) {
      const { done, value } = await expanded.read()
      if (done) break

      total += value.length
      if (total > MAX_UNPACKED_BYTES) {
        await expanded.cancel()
        throw new Error(
          `That file expands past ${formatSize(
            MAX_UNPACKED_BYTES,
          )}, which is more than the tab can hold.`,
        )
      }

      parts.push(value as Uint8Array<ArrayBuffer>)
    }
  } catch (problem) {
    if (problem instanceof Error && problem.message.startsWith('That file expands')) {
      throw problem
    }
    throw new Error('That file is not a gzip archive we can read.')
  }

  return new Blob(parts)
}
