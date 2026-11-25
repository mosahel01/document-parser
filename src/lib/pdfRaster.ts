import { PDFDocument } from 'pdf-lib'
import { pdfjs } from './pdfjs'
import { MAX_PDF_BYTES } from '../tools/pdf'
import { formatSize } from './format'

/** Rendering keeps a full bitmap per page, so a long document is refused. */
export const MAX_PAGE_IMAGES = 60

/** A compressed copy holds a JPEG per page; this is the most that stays sane. */
export const MAX_COMPRESS_PAGES = 200

/**
 * A single enormous page would need hundreds of megabytes for one canvas.
 * Beyond this the scale drops, rather than letting the tab die.
 */
export const MAX_RASTER_PIXELS = 40_000_000

export type RasterFormat = 'png' | 'jpg'

export type PageImage = {
  /** 1-based page number in the source. */
  page: number
  total: number
  blob: Blob
  /** Pixel size of the drawn image. */
  width: number
  height: number
  /** Page size in PDF points, unchanged by the chosen resolution. */
  pointWidth: number
  pointHeight: number
}

export type RasterOptions = {
  dpi: number
  format: RasterFormat
  quality?: number
  /** 1-based pages to render. Omitted means every page. */
  pages?: number[]
  maxPages?: number
  onPage?: (image: PageImage) => void
  stopped?: () => boolean
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('The browser could not encode that page.')),
      type,
      quality,
    )
  })
}

/**
 * Draw each PDF page to a canvas and hand back an image. pdf.js reads the page,
 * so a rotated or cropped page looks on screen exactly as it does in a viewer.
 */
export async function renderPdfPages(
  file: File,
  options: RasterOptions,
): Promise<PageImage[]> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(
      `${file.name} is ${formatSize(file.size)}. PDFs over ${formatSize(MAX_PDF_BYTES)} are not opened in the browser, because the tab would freeze first.`,
    )
  }

  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })

  let pdf
  try {
    pdf = await task.promise
  } catch (problem) {
    const reason = problem instanceof Error ? problem.message : String(problem)
    throw new Error(`${file.name} could not be opened by the page renderer. ${reason}`)
  }

  try {
    const total = pdf.numPages
    const limit = options.maxPages ?? total

    const requested = options.pages
      ? [...new Set(options.pages)].filter((page) => page >= 1 && page <= total)
      : Array.from({ length: total }, (_, index) => index + 1)

    if (requested.length === 0) {
      throw new Error('There are no pages to render.')
    }
    if (requested.length > limit) {
      throw new Error(
        `${requested.length} pages is over the ${limit} page limit for this tool, so the tab keeps up.`,
      )
    }

    const type = options.format === 'png' ? 'image/png' : 'image/jpeg'
    const images: PageImage[] = []

    for (const number of requested) {
      if (options.stopped?.()) break

      const page = await pdf.getPage(number)
      const natural = page.getViewport({ scale: 1 })
      let scale = options.dpi / 72
      const pixels = natural.width * scale * natural.height * scale

      if (pixels > MAX_RASTER_PIXELS) {
        scale *= Math.sqrt(MAX_RASTER_PIXELS / pixels)
      }

      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))

      const context = canvas.getContext('2d')
      if (!context) throw new Error('The browser refused a canvas.')

      // JPEG cannot store transparency; PDF pages are white anyway.
      if (options.format === 'jpg') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      await page.render({ canvas, canvasContext: context, viewport }).promise
      const blob = await canvasToBlob(canvas, type, options.quality)

      if (blob.type !== type) {
        throw new Error(`This browser cannot write ${options.format.toUpperCase()} images.`)
      }

      const image: PageImage = {
        page: number,
        total,
        blob,
        width: canvas.width,
        height: canvas.height,
        pointWidth: natural.width,
        pointHeight: natural.height,
      }
      images.push(image)
      options.onPage?.(image)

      page.cleanup()
      canvas.width = 0
      canvas.height = 0
    }

    return images
  } finally {
    void task.destroy()
  }
}

export type CompressionOptions = {
  dpi: number
  quality: number
  onPage?: (page: number, total: number) => void
  stopped?: () => boolean
}

export type CompressionResult = {
  blob: Blob
  originalSize: number
  /** True when the rebuilt copy was no smaller, so the original was kept. */
  keptOriginal: boolean
}

/**
 * Rebuild a PDF with one JPEG per page. This is real compression, and it costs
 * the text layer: every page becomes a picture, so words stop being selectable.
 */
export async function compressPdf(
  file: File,
  options: CompressionOptions,
): Promise<CompressionResult> {
  const images = await renderPdfPages(file, {
    dpi: options.dpi,
    format: 'jpg',
    quality: options.quality,
    maxPages: MAX_COMPRESS_PAGES,
    onPage: (image) => options.onPage?.(image.page, image.total),
    stopped: options.stopped,
  })

  // A half-drawn document is not a smaller copy of the original, so stop here.
  if (options.stopped?.()) {
    throw new Error('The compression stopped before it finished.')
  }

  if (images.length === 0) {
    throw new Error('The compression stopped before any page was read.')
  }

  const document = await PDFDocument.create()
  document.setProducer('MergePDF')

  for (const image of images) {
    const bytes = new Uint8Array(
      await image.blob.arrayBuffer(),
    ) as Uint8Array<ArrayBuffer>
    const embedded = await document.embedJpg(bytes)
    const page = document.addPage([image.pointWidth, image.pointHeight])
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: image.pointWidth,
      height: image.pointHeight,
    })
  }

  const bytes = await document.save()
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: 'application/pdf',
  })

  if (blob.size >= file.size) {
    return { blob: file, originalSize: file.size, keptOriginal: true }
  }

  return { blob, originalSize: file.size, keptOriginal: false }
}
