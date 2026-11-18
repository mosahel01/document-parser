import {
  RotationTypes,
  StandardFonts,
  degrees,
  rgb,
  type PDFPage,
} from 'pdf-lib'
import { openPdf, savePdf } from './pdf'

type Box = { x: number; y: number; width: number; height: number }

/** A page's quarter-turn, normalised to 0, 90, 180, or 270. */
function rotationOf(page: PDFPage): number {
  const rotation = page.getRotation()
  const angle =
    rotation.type === RotationTypes.Radians
      ? (rotation.angle * 180) / Math.PI
      : rotation.angle
  return ((Math.round(angle / 90) * 90) % 360 + 360) % 360
}

type Visible = {
  box: Box
  rotation: number
  /** Width and height as the page is seen, after its own rotation. */
  width: number
  height: number
}

function visiblePage(page: PDFPage): Visible {
  const box = page.getCropBox()
  const rotation = rotationOf(page)
  const sideways = rotation === 90 || rotation === 270

  return {
    box,
    rotation,
    width: sideways ? box.height : box.width,
    height: sideways ? box.width : box.height,
  }
}

/**
 * Turn a point measured from the bottom-left of the page as it is seen into a
 * point in the page's own (unrotated) coordinates.
 */
function toPagePoint(
  page: Visible,
  x: number,
  y: number,
): { x: number; y: number } {
  const { box, rotation } = page

  switch (rotation) {
    case 90:
      return { x: box.x + y, y: box.y + box.height - x }
    case 180:
      return { x: box.x + box.width - x, y: box.y + box.height - y }
    case 270:
      return { x: box.x + box.width - y, y: box.y + x }
    default:
      return { x: box.x + x, y: box.y + y }
  }
}

/* ------------------------------------------------------------------ crop */

/** How much to take off each side, as a percentage of the visible page. */
export type CropMargins = {
  top: number
  right: number
  bottom: number
  left: number
}

export type CropBox = Box

function assertMargins(margins: CropMargins): void {
  const values = [margins.top, margins.right, margins.bottom, margins.left]

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Margins cannot be negative.')
  }
  if (margins.left + margins.right >= 100) {
    throw new Error('The left and right margins together would remove the page.')
  }
  if (margins.top + margins.bottom >= 100) {
    throw new Error('The top and bottom margins together would remove the page.')
  }
}

/**
 * The crop box a page would get. The margins are read against the page as it
 * is seen, so 10% off the top of a sideways scan still takes the visible top.
 */
export function cropBoxFor(
  base: Box,
  margins: CropMargins,
  rotation = 0,
): CropBox {
  const sideways = rotation === 90 || rotation === 270
  const visibleWidth = sideways ? base.height : base.width
  const visibleHeight = sideways ? base.width : base.height

  const top = (margins.top / 100) * visibleHeight
  const right = (margins.right / 100) * visibleWidth
  const bottom = (margins.bottom / 100) * visibleHeight
  const left = (margins.left / 100) * visibleWidth

  let boxLeft: number
  let boxRight: number
  let boxTop: number
  let boxBottom: number

  switch (rotation) {
    case 90:
      // The visible top is the page's left edge, and so on clockwise.
      boxLeft = top
      boxTop = right
      boxRight = bottom
      boxBottom = left
      break
    case 180:
      boxLeft = right
      boxTop = bottom
      boxRight = left
      boxBottom = top
      break
    case 270:
      boxLeft = bottom
      boxTop = left
      boxRight = top
      boxBottom = right
      break
    default:
      boxLeft = left
      boxTop = top
      boxRight = right
      boxBottom = bottom
  }

  return {
    x: base.x + boxLeft,
    y: base.y + boxBottom,
    width: base.width - boxLeft - boxRight,
    height: base.height - boxTop - boxBottom,
  }
}

/** Trim every page to a smaller visible area, without rewriting its contents. */
export async function cropPdf(
  file: File,
  margins: CropMargins,
): Promise<Blob> {
  assertMargins(margins)

  const document = await openPdf(file, (pdf) => {
    for (const page of pdf.getPages()) {
      const next = cropBoxFor(page.getCropBox(), margins, rotationOf(page))
      if (next.width < 10 || next.height < 10) {
        throw new Error(
          'Those margins leave less than 10 points of page. Use smaller ones.',
        )
      }
      page.setCropBox(next.x, next.y, next.width, next.height)
    }
    return pdf
  })

  return savePdf(document)
}

/* ---------------------------------------------------------- page numbers */

export type PageNumberPosition =
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'top-left'
  | 'top-center'
  | 'top-right'

export type PageNumberFormat = 'number' | 'page-number' | 'number-of-total'

export type PageNumberOptions = {
  position: PageNumberPosition
  format: PageNumberFormat
  fontSize: number
  margin: number
  start: number
  skipFirst: boolean
}

export function pageNumberText(
  page: number,
  last: number,
  format: PageNumberFormat,
): string {
  if (format === 'page-number') return `Page ${page}`
  if (format === 'number-of-total') return `${page} of ${last}`
  return String(page)
}

function assertOptions(options: PageNumberOptions): void {
  if (!Number.isFinite(options.fontSize) || options.fontSize < 6) {
    throw new Error('The page number size must be at least 6 points.')
  }
  if (!Number.isFinite(options.margin) || options.margin < 0) {
    throw new Error('The margin cannot be negative.')
  }
  if (!Number.isInteger(options.start) || options.start < 0) {
    throw new Error('The first page number must be a whole number.')
  }
}

/** Write a number on every page, in the corner or centre the visitor chose. */
export async function addPageNumbers(
  file: File,
  options: PageNumberOptions,
): Promise<Blob> {
  assertOptions(options)

  const document = await openPdf(file, async (pdf) => {
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const pages = pdf.getPages()
    const numbered = pages.length - (options.skipFirst ? 1 : 0)
    const last = options.start + Math.max(numbered, 0) - 1

    pages.forEach((page, index) => {
      if (options.skipFirst && index === 0) return

      const number = options.start + index - (options.skipFirst ? 1 : 0)
      const text = pageNumberText(number, last, options.format)
      const view = visiblePage(page)
      const width = font.widthOfTextAtSize(text, options.fontSize)
      const x = options.position.endsWith('left')
        ? options.margin
        : options.position.endsWith('right')
          ? view.width - options.margin - width
          : (view.width - width) / 2
      const y = options.position.startsWith('top')
        ? view.height - options.margin - options.fontSize
        : options.margin
      const point = toPagePoint(view, x, y)

      page.drawText(text, {
        x: point.x,
        y: point.y,
        size: options.fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
        // Counter the page's own turn so the number reads upright on screen.
        rotate: degrees(view.rotation),
      })
    })

    return pdf
  })

  return savePdf(document)
}

/* ------------------------------------------------------------- watermark */

export type WatermarkOptions = {
  text: string
  fontSize: number
  opacity: number
  angle: number
}

function assertWatermark(options: WatermarkOptions): void {
  if (options.text.trim() === '') {
    throw new Error('Type the watermark text first.')
  }
  if (!Number.isFinite(options.fontSize) || options.fontSize < 6) {
    throw new Error('The watermark size must be at least 6 points.')
  }
  if (
    !Number.isFinite(options.opacity) ||
    options.opacity <= 0 ||
    options.opacity > 1
  ) {
    throw new Error('The watermark opacity must be over 0 and at most 1.')
  }
  if (!Number.isFinite(options.angle)) {
    throw new Error('The watermark angle must be a number.')
  }
}

/** Draw one diagonal line of text across the middle of every page. */
export async function addWatermark(
  file: File,
  options: WatermarkOptions,
): Promise<Blob> {
  assertWatermark(options)

  const document = await openPdf(file, async (pdf) => {
    const font = await pdf.embedFont(StandardFonts.HelveticaBold)
    const text = options.text.trim()

    for (const page of pdf.getPages()) {
      const view = visiblePage(page)

      try {
        // A long line would run off the paper, so shrink it to fit the short side.
        const natural = font.widthOfTextAtSize(text, options.fontSize)
        const room = Math.min(view.width, view.height) * 0.9
        const size = Math.min(
          options.fontSize,
          (options.fontSize * room) / Math.max(natural, 1),
        )
        const width = font.widthOfTextAtSize(text, size)

        const centre = toPagePoint(view, view.width / 2, view.height / 2)
        const drawAngle = options.angle + view.rotation
        const radians = (drawAngle * Math.PI) / 180

        // Centre the line on the page, measuring along the direction it runs.
        const x =
          centre.x -
          (width / 2) * Math.cos(radians) +
          size * 0.35 * Math.sin(radians)
        const y =
          centre.y -
          (width / 2) * Math.sin(radians) -
          size * 0.35 * Math.cos(radians)

        page.drawText(text, {
          x,
          y,
          size,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: options.opacity,
          rotate: degrees(drawAngle),
        })
      } catch {
        throw new Error(
          'The watermark has a character the built-in font cannot draw. Use plain letters, numbers, and common punctuation.',
        )
      }
    }

    return pdf
  })

  return savePdf(document)
}
