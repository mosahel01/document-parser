import { PDFDocument } from 'pdf-lib'

/** Each page becomes a whole PDF, so a huge document would fill memory fast. */
export const MAX_SPLIT_PAGES = 200

export type NamedPdf = { name: string; blob: Blob }

async function load(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes)
  } catch {
    throw new Error(
      'That PDF could not be opened. It may be damaged or password protected.',
    )
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
    const source = await load(new Uint8Array(await file.arrayBuffer()))
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }

  return save(merged)
}

export async function countPages(file: File): Promise<number> {
  const document = await load(new Uint8Array(await file.arrayBuffer()))
  return document.getPageCount()
}

/** One PDF per page, numbered to match the page count width. */
export async function splitIntoPages(
  file: File,
  baseName: string,
): Promise<NamedPdf[]> {
  const source = await load(new Uint8Array(await file.arrayBuffer()))
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
}

/** Build one PDF from the chosen pages, in the order given. */
export async function extractPages(
  file: File,
  indices: number[],
): Promise<Blob> {
  const source = await load(new Uint8Array(await file.arrayBuffer()))
  const output = await PDFDocument.create()

  const pages = await output.copyPages(source, indices)
  for (const page of pages) output.addPage(page)

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
