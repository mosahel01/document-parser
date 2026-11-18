/**
 * Crop, rotate, and resize a photo, in the browser, in one canvas pass. The
 * geometry lives in small pure functions so it can be checked without a canvas.
 */

export type Rect = { x: number; y: number; width: number; height: number }

export type ImageFormat = 'png' | 'jpg' | 'webp'

/** A canvas larger than this holds hundreds of megabytes and the tab dies. */
export const MAX_EDIT_PIXELS = 40_000_000

/** Small enough to see, so a stray click cannot produce a one-pixel crop. */
export const MIN_CROP_SIDE = 8

/**
 * The canvas a picture needs once it is turned by any angle, because a tilted
 * picture leans past its old edges. Quarter turns come back exact, and the
 * result is always at least one pixel so a canvas can be allocated.
 */
export function rotatedBounds(
  width: number,
  height: number,
  degrees: number,
): { width: number; height: number } {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))

  return {
    width: Math.max(1, Math.round(width * cos + height * sin)),
    height: Math.max(1, Math.round(width * sin + height * cos)),
  }
}

function round(value: number): number {
  return Math.round(value)
}

/**
 * Keep a crop inside the picture and big enough to see. Used while dragging, so
 * the box never leaves the frame or collapses to nothing.
 */
export function clampRect(
  rect: Rect,
  bounds: { width: number; height: number },
): Rect {
  const width = Math.min(
    Math.max(round(rect.width), Math.min(MIN_CROP_SIDE, bounds.width)),
    bounds.width,
  )
  const height = Math.min(
    Math.max(round(rect.height), Math.min(MIN_CROP_SIDE, bounds.height)),
    bounds.height,
  )

  return {
    x: Math.min(Math.max(round(rect.x), 0), bounds.width - width),
    y: Math.min(Math.max(round(rect.y), 0), bounds.height - height),
    width,
    height,
  }
}

/**
 * The other side of a resize, keeping the shape. Typing a width of 800 into a
 * 1600×900 photo gives 800×450; the result is never smaller than one pixel.
 */
export function matchingSide(
  natural: { width: number; height: number },
  side: 'width' | 'height',
  value: number,
): { width: number; height: number } {
  const target = Math.max(1, round(value))

  if (side === 'width') {
    return {
      width: target,
      height: Math.max(1, round((natural.height * target) / natural.width)),
    }
  }

  return {
    width: Math.max(1, round((natural.width * target) / natural.height)),
    height: target,
  }
}

export type ImageEdit = {
  /** Clockwise, and not limited to quarter turns: a scan can be straightened. */
  angle: number
  /** In pixels of the turned picture, so it matches what is on screen. */
  crop: Rect
  width: number
  height: number
  format: ImageFormat
  quality: number
}

function formatMime(format: ImageFormat): string {
  if (format === 'png') return 'image/png'
  if (format === 'webp') return 'image/webp'
  return 'image/jpeg'
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('The browser could not encode that image.')),
      mime,
      quality,
    )
  })
}

async function decode(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } catch {
    throw new Error(`"${file.name}" could not be opened as an image.`)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Draw the picture turned by any angle, at full resolution. Crop coordinates
 * are read from this canvas, so what the visitor drags over is what is cut out.
 */
export async function drawTurned(
  file: File,
  angle: number,
  canvas = document.createElement('canvas'),
): Promise<HTMLCanvasElement> {
  const image = await decode(file)
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height

  if (naturalWidth === 0 || naturalHeight === 0) {
    throw new Error(`"${file.name}" has no pixels to edit.`)
  }
  if (naturalWidth * naturalHeight > MAX_EDIT_PIXELS) {
    throw new Error(
      `"${file.name}" is ${naturalWidth}×${naturalHeight}. Photos over ${MAX_EDIT_PIXELS / 1_000_000} megapixels are too big to edit in the browser; shrink it first.`,
    )
  }

  const size = rotatedBounds(naturalWidth, naturalHeight, angle)
  if (size.width * size.height > MAX_EDIT_PIXELS) {
    throw new Error(
      `"${file.name}" tilted ${Math.round(angle)}° needs a ${size.width}×${size.height} canvas, over the ${MAX_EDIT_PIXELS / 1_000_000} megapixel editing limit. Use a smaller tilt or shrink the photo first.`,
    )
  }

  canvas.width = size.width
  canvas.height = size.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('The browser refused a canvas.')

  context.translate(size.width / 2, size.height / 2)
  context.rotate((angle * Math.PI) / 180)
  context.drawImage(image, -naturalWidth / 2, -naturalHeight / 2)

  return canvas
}

/** Cut the chosen rectangle out and draw it at the requested size. */
export async function cropAndResize(
  source: CanvasImageSource,
  crop: Rect,
  width: number,
  height: number,
  format: ImageFormat,
  quality: number,
): Promise<Blob> {
  const mime = formatMime(format)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('The browser refused a canvas.')

  // JPEG has no alpha channel; without a white fill, transparent areas go black.
  if (mime === 'image/jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  context.imageSmoothingQuality = 'high'
  context.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const blob = await canvasToBlob(
    canvas,
    mime,
    mime === 'image/png' ? undefined : quality,
  )

  // A browser without an encoder hands back PNG instead of failing, which would
  // ship the wrong format under the wrong name.
  if (blob.type !== mime) {
    throw new Error(`This browser cannot write ${format.toUpperCase()} images.`)
  }

  return blob
}

export async function editImage(file: File, edit: ImageEdit): Promise<Blob> {
  const turned = await drawTurned(file, edit.angle)
  return cropAndResize(
    turned,
    clampRect(edit.crop, { width: turned.width, height: turned.height }),
    edit.width,
    edit.height,
    edit.format,
    edit.quality,
  )
}
