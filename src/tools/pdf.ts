import { PDFDocument, RotationTypes, degrees } from 'pdf-lib'
import { formatSize } from '../lib/format'

/** Each page becomes a whole PDF, so a huge document would fill memory fast. */
export const MAX_SPLIT_PAGES = 200

/** pdf-lib parses on the main thread, so a vast file freezes the tab first. */
export const MAX_PDF_BYTES = 100 * 1024 * 1024

export type NamedPdf = { name: string; blob: Blob }

async function read(file: File): Promise<Uint8Array> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(
      `${file.name} is ${formatSize(file.size)}. PDFs over ${formatSize(MAX_PDF_BYTES)} are not opened in the browser, because the tab would freeze before the work finished.`,
    )
  }

  try {
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new Error(
      `${file.name} could not be read from disk. If it moved or was deleted, add it again.`,
    )
  }
}

/**
 * Say which file failed and why. pdf-lib's own text ("Failed to parse PDF
 * document (line 3 col 12): ...") is thin on its own, so it goes after a
 * sentence that names the file. Some files parse but then break while their
 * pages are read, so every read goes through `openPdf`, not just the load.
 */
function failure(file: File, problem: unknown): Error {
  if (problem instanceof Error && problem.message.includes(file.name)) {
    return problem
  }
  const reason = problem instanceof Error ? problem.message : String(problem)
  return new Error(`${file.name} could not be opened as a PDF. ${reason}`)
}

async function load(file: File): Promise<PDFDocument> {
  const bytes = await read(file)

  // The header may sit after a little junk; the format allows it within the
  // first kilobyte.
  const head = String.fromCharCode(...bytes.subarray(0, 1024))
  if (!head.includes('%PDF-')) {
    throw new Error(
      `${file.name} does not start like a PDF. It may be a different file type with a .pdf name.`,
    )
  }

  let document: PDFDocument
  try {
    // Read first, ask later: loading with encryption ignored tells us whether
    // the file is protected, which is a different problem from a broken file.
    document = await PDFDocument.load(bytes, { ignoreEncryption: true })
  } catch (problem) {
    throw failure(file, problem)
  }

  if (document.isEncrypted) {
    throw new Error(
      `${file.name} is password protected. Remove the password first, then try again.`,
    )
  }

  return document
}

/** Load a PDF and run `work` on it, naming the file if either step fails. */
async function openPdf<T>(
  file: File,
  work: (document: PDFDocument) => T | Promise<T>,
): Promise<T> {
  const document = await load(file)
  try {
    return await work(document)
  } catch (problem) {
    throw failure(file, problem)
  }
}

async function save(document: PDFDocument): Promise<Blob> {
  document.setProducer('Document Toolkit')
  const bytes = await document.save()
  // pdf-lib types the buffer loosely; Blob needs a plain ArrayBuffer.
  return new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: 'application/pdf',
  })
}

/** Join the files in the order given. */
export async function mergePdfs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create()

  for (const file of files) {
    await openPdf(file, async (source) => {
      const pages = await merged.copyPages(source, source.getPageIndices())
      for (const page of pages) merged.addPage(page)
    })
  }

  return save(merged)
}

export async function countPages(file: File): Promise<number> {
  return openPdf(file, (document) => document.getPageCount())
}

/**
 * One page in the output, and where it comes from. A page can appear twice, and
 * two copies of one page can be turned differently, which is what makes
 * "copy and paste a page" and "rotate only this one" possible.
 */
export type PageSlot = {
  /** Index into the files handed to `pagesToPdf`. */
  source: number
  /** Zero-based page in that file. */
  page: number
  /** Degrees to add to the page's own rotation: 0, 90, 180, or 270. */
  turn: number
}

/**
 * A page manager is a person picking pages by eye, so a few hundred is the most
 * that stays quick. Each slot copies its page into the new document.
 */
export const MAX_ARRANGE_PAGES = 300

function normaliseAngle(angle: number): number {
  return ((Math.round(angle / 90) * 90) % 360 + 360) % 360
}

/**
 * Build one PDF from the chosen pages, in the order given. Turning a page adds
 * to the rotation it already had, so a sideways scan gets fixed rather than
 * reset.
 */
export async function pagesToPdf(
  files: File[],
  slots: PageSlot[],
): Promise<Blob> {
  if (slots.length === 0) {
    throw new Error('There are no pages left to save. Keep at least one.')
  }
  if (slots.length > MAX_ARRANGE_PAGES) {
    throw new Error(
      `${slots.length} pages is over the ${MAX_ARRANGE_PAGES} page limit for the page editor, so the tab keeps up.`,
    )
  }

  const sources: PDFDocument[] = []
  for (const file of files) sources.push(await load(file))

  const output = await PDFDocument.create()

  for (const slot of slots) {
    const source = sources[slot.source]
    if (!source) {
      throw new Error('One of the pages points at a file that is no longer here.')
    }

    const [page] = await output.copyPages(source, [slot.page])
    const own = page.getRotation()
    const ownAngle =
      own.type === RotationTypes.Radians ? (own.angle * 180) / Math.PI : own.angle
    page.setRotation(degrees(normaliseAngle(ownAngle + slot.turn)))
    output.addPage(page)
  }

  return save(output)
}

/** One PDF per page, numbered to match the page count width. */
export async function splitIntoPages(
  file: File,
  baseName: string,
): Promise<NamedPdf[]> {
  return openPdf(file, async (source) => {
    const total = source.getPageCount()

    if (total > MAX_SPLIT_PAGES) {
      throw new Error(
        `That PDF has ${total} pages. Splitting stops at ${MAX_SPLIT_PAGES} pages, so the tab keeps up.`,
      )
    }

    const width = String(total).length
    const results: NamedPdf[] = []

    for (let index = 0; index < total; index += 1) {
      const single = await PDFDocument.create()
      const [page] = await single.copyPages(source, [index])
      single.addPage(page)
      results.push({
        name: `${baseName}-${String(index + 1).padStart(width, '0')}.pdf`,
        blob: await save(single),
      })
    }

    return results
  })
}

/** Build one PDF from the chosen pages, in the order given. */
export async function extractPages(
  file: File,
  indices: number[],
): Promise<Blob> {
  const output = await openPdf(file, async (source) => {
    const made = await PDFDocument.create()

    const pages = await made.copyPages(source, indices)
    for (const page of pages) made.addPage(page)

    return made
  })

  return save(output)
}

export type PageSelection = { pages: number[]; error: string | null }

/**
 * Read "1-3, 7" into zero-based page indices. Order is kept so the result can
 * be used to rearrange pages, and a repeated page is copied twice.
 */
export function parsePageSelection(
  input: string,
  pageCount: number,
): PageSelection {
  const trimmed = input.trim()
  if (trimmed === '') return { pages: [], error: 'Type at least one page.' }

  const pages: number[] = []

  for (const raw of trimmed.split(',')) {
    const token = raw.trim()
    if (token === '') continue

    const range = /^(\d+)\s*-\s*(\d+)$/.exec(token)
    if (range) {
      const from = Number(range[1])
      const to = Number(range[2])

      if (from < 1 || to > pageCount) {
        return { pages: [], error: `Pages must be between 1 and ${pageCount}.` }
      }
      if (from > to) {
        return { pages: [], error: `"${token}" runs backwards.` }
      }

      for (let page = from; page <= to; page += 1) pages.push(page - 1)
      continue
    }

    if (/^\d+$/.test(token)) {
      const page = Number(token)
      if (page < 1 || page > pageCount) {
        return { pages: [], error: `Page ${page} is not in this document.` }
      }
      pages.push(page - 1)
      continue
    }

    return { pages: [], error: `"${token}" is not a page or a range.` }
  }

  if (pages.length === 0) return { pages: [], error: 'Type at least one page.' }

  return { pages, error: null }
}

/** "report.final.pdf" becomes "report.final". */
export function pdfBaseName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '') || 'document'
}
