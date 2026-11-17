import { normalizeExtension, splitExtension } from './rename'

/** Input formats a browser can normally decode, GIF and SVG included. */
const IMAGE_INPUTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'avif',
  'svg',
  'ico',
])

export type ConversionKind = 'none' | 'image' | 'pdf' | 'blocked'

export type Conversion = {
  kind: ConversionKind
  /** The format to write, lower case and without a dot. */
  target: string
  /** Why a conversion cannot happen, in words a visitor can act on. */
  note: string | null
}

/** jpg and jpeg are the same format, so a rename between them converts nothing. */
function formatFamily(extension: string): string {
  return extension === 'jpeg' ? 'jpg' : extension
}

function extensionOf(name: string): string {
  return formatFamily(normalizeExtension(splitExtension(name).ext))
}

export function isImageName(name: string): boolean {
  return IMAGE_INPUTS.has(extensionOf(name))
}

export function sameFormat(a: string, b: string): boolean {
  return formatFamily(a) === formatFamily(b)
}

/**
 * Decide what typing an extension means for one file. Pure, so the plan can be
 * shown and tested without touching a canvas.
 */
export function conversionFor(
  fileName: string,
  typedExtension: string,
): Conversion {
  const target = formatFamily(normalizeExtension(typedExtension))
  if (target === '') return { kind: 'none', target: '', note: null }

  const source = extensionOf(fileName)
  if (sameFormat(source, target)) return { kind: 'none', target, note: null }

  const imageSource = isImageName(fileName)
  const sourceLabel =
    source === '' ? 'a file with no extension' : `a .${source} file`

  if (target === 'pdf') {
    return imageSource
      ? { kind: 'pdf', target, note: null }
      : {
          kind: 'blocked',
          target,
          note: `Only images become PDFs in the browser. ${sourceLabel} is not an image.`,
        }
  }

  if (target === 'png' || target === 'jpg' || target === 'webp') {
    return imageSource
      ? { kind: 'image', target, note: null }
      : {
          kind: 'blocked',
          target,
          note: `The browser cannot redraw ${sourceLabel} as an image.`,
        }
  }

  return {
    kind: 'blocked',
    target,
    note: `The browser cannot write .${target}. Supported: PNG, JPG, WebP, and PDF from images.`,
  }
}

function imageMime(target: string): string {
  if (target === 'png') return 'image/png'
  if (target === 'webp') return 'image/webp'
  return 'image/jpeg'
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
          : reject(new Error('The browser could not encode that image.')),
      type,
      quality,
    )
  })
}

/** Decode through an <img>, which handles every format the browser can show. */
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

async function draw(file: File, opaque: boolean): Promise<HTMLCanvasElement> {
  const image = await decode(file)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error(`"${file.name}" has no pixels to convert.`)
  }

  const context = canvas.getContext('2d')
  if (!context) throw new Error('The browser refused a canvas.')

  // JPEG has no alpha channel; without a white fill, transparent areas go black.
  // PNG and WebP keep their transparency, so they are drawn on a bare canvas.
  if (opaque) {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  context.drawImage(image, 0, 0)
  return canvas
}

/** Rewrite an image in another raster format. */
export async function convertImage(
  file: File,
  target: string,
  quality = 0.9,
): Promise<Blob> {
  const mime = imageMime(target)
  const canvas = await draw(file, mime === 'image/jpeg')
  const blob = await canvasToBlob(
    canvas,
    mime,
    mime === 'image/png' ? undefined : quality,
  )

  // A browser without an encoder silently hands back PNG instead of failing,
  // which would ship the wrong file under the wrong name.
  if (blob.type !== mime) {
    throw new Error(`This browser cannot write ${target.toUpperCase()} images.`)
  }

  return blob
}

const A4 = [595.28, 841.89] as const
const PDF_MARGIN = 24

/**
 * Embed the bytes the browser already has when they are already PNG or JPEG, so
 * a photo does not get inflated into a lossless copy first. Anything else, or a
 * file whose type lies about its contents, goes through the canvas.
 */
async function embedForPdf(
  document: import('pdf-lib').PDFDocument,
  file: File,
): Promise<import('pdf-lib').PDFImage> {
  const bytes = new Uint8Array(await file.arrayBuffer()) as Uint8Array<ArrayBuffer>

  try {
    if (file.type === 'image/png') return await document.embedPng(bytes)
    if (file.type === 'image/jpeg') return await document.embedJpg(bytes)
  } catch {
    // Misnamed or damaged: let the canvas try before giving up.
  }

  const png = await convertImage(file, 'png')
  return document.embedPng(
    new Uint8Array(await png.arrayBuffer()) as Uint8Array<ArrayBuffer>,
  )
}

/** Put one image on its own A4 page, scaled to fit without cropping. */
export async function imageToPdf(file: File): Promise<Blob> {
  // Imported here so the PDF library is fetched only when someone asks for a PDF.
  const { PDFDocument } = await import('pdf-lib')
  const document = await PDFDocument.create()
  const image = await embedForPdf(document, file)

  const [short, long] = A4
  const [width, height] =
    image.width > image.height ? [long, short] : [short, long]

  const page = document.addPage([width, height])
  const scale = Math.min(
    (width - PDF_MARGIN * 2) / image.width,
    (height - PDF_MARGIN * 2) / image.height,
  )
  const drawnWidth = image.width * scale
  const drawnHeight = image.height * scale

  page.drawImage(image, {
    x: (width - drawnWidth) / 2,
    y: (height - drawnHeight) / 2,
    width: drawnWidth,
    height: drawnHeight,
  })

  const bytes = await document.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: 'application/pdf',
  })
}

/** Turn one file into the format its new extension promises. */
export async function convertFile(
  file: File,
  target: string,
  quality = 0.9,
): Promise<Blob> {
  const plan = conversionFor(file.name, target)

  switch (plan.kind) {
    case 'none':
      return file
    case 'image':
      return convertImage(file, plan.target, quality)
    case 'pdf':
      return imageToPdf(file)
    case 'blocked':
      throw new Error(plan.note ?? `Cannot convert to ${target}.`)
  }
}
