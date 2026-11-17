import { unzipSync, zipSync } from 'fflate'
import { formatSize } from '../lib/format'

export type ZipEntry = {
  /** Path inside the archive, e.g. "reports/2026.pdf". */
  path: string
  bytes: Uint8Array<ArrayBuffer>
}

/**
 * A zip is decompressed in one blocking step, so an absurd archive freezes the
 * tab before we can stop it. Refuse the input instead.
 */
export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024

function uniqueName(name: string, used: Set<string>): string {
  let candidate = name

  if (used.has(candidate)) {
    const dot = candidate.lastIndexOf('.')
    const base = dot > 0 ? candidate.slice(0, dot) : candidate
    const ext = dot > 0 ? candidate.slice(dot) : ''
    let counter = 2
    do {
      candidate = `${base} (${counter})${ext}`
      counter += 1
    } while (used.has(candidate))
  }

  used.add(candidate)
  return candidate
}

/** Pack bytes that are already in memory into one zip. */
function zipBytes(
  entries: { name: string; bytes: Uint8Array<ArrayBuffer> }[],
): Blob {
  const contents: Record<string, Uint8Array> = {}
  const used = new Set<string>()

  for (const { name, bytes } of entries) {
    contents[uniqueName(name, used)] = bytes
  }

  return new Blob([zipSync(contents)], { type: 'application/zip' })
}

/** Read the given files into memory and pack them into one zip. */
export async function zipFiles(
  files: { name: string; file: File }[],
): Promise<Blob> {
  const entries = await Promise.all(
    files.map(async ({ name, file }) => ({
      name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  )

  return zipBytes(entries)
}

/** Read every file out of a zip archive. */
export async function readZip(file: File): Promise<ZipEntry[]> {
  if (file.size > MAX_ARCHIVE_BYTES) {
    throw new Error(
      `That archive is over ${formatSize(MAX_ARCHIVE_BYTES)}. Open a smaller one, or unzip it on your computer.`,
    )
  }

  const data = new Uint8Array(await file.arrayBuffer())

  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(data)
  } catch {
    throw new Error('That file is not a zip archive we can read.')
  }

  return Object.entries(unzipped)
    .filter(([path]) => !path.endsWith('/'))
    // fflate types the buffer loosely; it always allocates a plain ArrayBuffer,
    // and Blob only accepts that, so state it once here.
    .map(([path, bytes]) => ({
      path,
      bytes: bytes as Uint8Array<ArrayBuffer>,
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Browsers ignore directory separators in a download name, so take the last
 * segment. The entry keeps its full path for display.
 */
export function fileNameFromPath(path: string): string {
  const base = path.split('/').pop()
  return base && base.length > 0 ? base : 'file'
}

/**
 * Two entries from different folders can share a basename, and both would land
 * in the same download folder. Number the repeats so nothing silently
 * overwrites anything: "notes.txt", "notes (2).txt".
 */
export function downloadNames(paths: string[]): string[] {
  const used = new Set<string>()

  return paths.map((path) => {
    let name = fileNameFromPath(path)

    if (used.has(name)) {
      const dot = name.lastIndexOf('.')
      const base = dot > 0 ? name.slice(0, dot) : name
      const ext = dot > 0 ? name.slice(dot) : ''
      let counter = 2
      do {
        name = `${base} (${counter})${ext}`
        counter += 1
      } while (used.has(name))
    }

    used.add(name)
    return name
  })
}
