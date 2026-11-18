import { pdfjs } from './pdfjs'

export type PageThumb = { page: number; url: string; total: number }

/**
 * Render a PDF's pages to small PNG data URLs, one at a time, so the tab stays
 * responsive while a big file is read. `stopped` is checked between pages: a
 * component that unmounts flips it instead of letting the work finish.
 */
export async function renderPageThumbs(
  file: File,
  maxPages: number,
  onPage: (thumb: PageThumb) => void,
  stopped: () => boolean,
): Promise<void> {
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  const pdf = await task.promise

  try {
    const total = pdf.numPages
    const limit = Math.min(total, maxPages)

    for (let number = 1; number <= limit; number += 1) {
      const page = await pdf.getPage(number)
      const natural = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: 220 / natural.width })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      const canvasContext = canvas.getContext('2d')
      if (!canvasContext) throw new Error('The browser refused a canvas.')

      await page.render({ canvas, canvasContext, viewport }).promise
      if (stopped()) return

      onPage({ page: number, url: canvas.toDataURL('image/png'), total })
    }
  } finally {
    void task.destroy()
  }
}
