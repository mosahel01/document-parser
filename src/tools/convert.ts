import { normalizeExtension, splitExtension } from './rename'
import { TEXT_EXTENSIONS, readTextFile } from './replace'
import { docxFromParagraphs } from './docxWriter'
import {
  docxToHtml,
  docxToMarkdown,
  docxToText,
  readDocx,
  type DocxBlock,
} from './docx'
import { blocksToPdf, docxToPdf } from './docxToPdf'
import { pdfToDocx, readPdfParagraphs } from './pdfToDocx'

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

/**
 * What one file can be read as. Extension only: sniffing the bytes would delay
 * every button on the Home screen.
 */
export type SourceKind = 'image' | 'pdf' | 'docx' | 'text' | 'other'

/** Every format the browser side can write, in the order the buttons appear. */
export const TARGET_FORMATS = [
  'png',
  'jpg',
  'webp',
  'pdf',
  'docx',
  'html',
  'md',
  'txt',
] as const

export type TargetFormat = (typeof TARGET_FORMATS)[number]

export const TARGET_LABELS: Record<TargetFormat, string> = {
  png: 'PNG',
  jpg: 'JPG',
  webp: 'WebP',
  pdf: 'PDF',
  docx: 'Word',
  html: 'HTML',
  md: 'Markdown',
  txt: 'Text',
}

/**
 * Which format each kind of file can become. Deliberately short: a list that
 * names a format the tool cannot really write would only produce a refusal
 * after the visitor has picked it.
 */
const CONVERSIONS: Record<SourceKind, readonly TargetFormat[]> = {
  image: ['png', 'jpg', 'webp', 'pdf'],
  pdf: ['docx', 'html', 'md', 'txt'],
  docx: ['pdf', 'html', 'md', 'txt'],
  // Relabelling one text format as another would be a rename, not a conversion,
  // so plain text only offers the two formats that need real work.
  text: ['pdf', 'docx'],
  other: [],
}

export type ConversionKind =
  | 'none'
  | 'image'
  | 'pdf'
  | 'document'
  | 'blocked'

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

export function sourceKindOf(name: string): SourceKind {
  if (isImageName(name)) return 'image'

  const extension = extensionOf(name)
  if (extension === 'pdf') return 'pdf'
  if (extension === 'docx') return 'docx'
  if ((TEXT_EXTENSIONS as readonly string[]).includes(extension)) return 'text'

  return 'other'
}

function isTargetFormat(value: string): value is TargetFormat {
  return (TARGET_FORMATS as readonly string[]).includes(value)
}

/** The formats one file can be converted to, without its own. */
export function targetsFor(fileName: string): TargetFormat[] {
  const source = extensionOf(fileName)
  return CONVERSIONS[sourceKindOf(fileName)].filter(
    (target) => !sameFormat(source, target),
  )
}

/**
 * The formats every file in the drop can reach. A mixed drop therefore offers
 * only what is true for all of it, instead of buttons that fail halfway. A file
 * that is already in the target format counts, so "everything to PDF" accepts a
 * PDF and hands it back unchanged.
 */
export function commonTargets(files: File[]): TargetFormat[] {
  if (files.length === 0) return []

  const reaches = (name: string, target: TargetFormat) =>
    sameFormat(extensionOf(name), target) ||
    CONVERSIONS[sourceKindOf(name)].includes(target)

  return TARGET_FORMATS.filter(
    (target) =>
      files.every((file) => reaches(file.name, target)) &&
      // A button that would change nothing for every file is not a choice.
      !files.every((file) => sameFormat(extensionOf(file.name), target)),
  )
}

function sourceLabel(source: string): string {
  return source === '' ? 'a file with no extension' : `a .${source} file`
}

function listFormats(formats: readonly TargetFormat[]): string {
  const names = formats.map((format) => TARGET_LABELS[format])
  if (names.length === 0) return 'nothing'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function workFor(target: TargetFormat): ConversionKind {
  if (target === 'png' || target === 'jpg' || target === 'webp') return 'image'
  if (target === 'pdf') return 'pdf'
  return 'document'
}

function blockedNote(
  kind: SourceKind,
  source: string,
  target: string,
): string {
  if (kind === 'other') {
    return `The browser cannot read ${sourceLabel(source)}, so it cannot write .${target}.`
  }

  return `The browser cannot write .${target} from ${sourceLabel(source)}. From this kind of file it can write ${listFormats(CONVERSIONS[kind])}.`
}

/**
 * Decide what typing an extension means for one file. Pure, so the plan can be
 * shown and tested without touching a canvas or a PDF.
 */
export function conversionFor(
  fileName: string,
  typedExtension: string,
): Conversion {
  const target = formatFamily(normalizeExtension(typedExtension))
  if (target === '') return { kind: 'none', target: '', note: null }

  const source = extensionOf(fileName)
  if (sameFormat(source, target)) return { kind: 'none', target, note: null }

  const kind = sourceKindOf(fileName)
  const allowed = CONVERSIONS[kind]

  if (isTargetFormat(target) && allowed.includes(target)) {
    return { kind: workFor(target), target, note: null }
  }

  return { kind: 'blocked', target, note: blockedNote(kind, source, target) }
}

/** Whether a plan replaces the bytes, as opposed to renaming or refusing. */
export function convertsBytes(kind: ConversionKind): boolean {
  return kind !== 'none' && kind !== 'blocked'
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

const A4 = [595.28, 841.89] as const
const LETTER = [612, 792] as const

export type ImagePdfPageSize = 'a4' | 'letter' | 'image'
export type ImagePdfOrientation = 'auto' | 'portrait' | 'landscape'

export type ImagePdfOptions = {
  pageSize: ImagePdfPageSize
  orientation: ImagePdfOrientation
  /** White border in points on every side. */
  margin: number
}

export type ImagePlacement = {
  pageWidth: number
  pageHeight: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * Fit one image on one page. Pure arithmetic, so the choice of paper, turn, and
 * margin can be tested without a canvas. "image" makes the page follow the
 * photo's shape instead of forcing it onto a fixed sheet.
 */
export function imagePageSize(
  imageWidth: number,
  imageHeight: number,
  options: ImagePdfOptions,
): ImagePlacement {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error('That image has no pixels to place on a page.')
  }

  const margin = Math.max(0, options.margin)
  let pageWidth: number
  let pageHeight: number

  if (options.pageSize === 'image') {
    const long = A4[1]
    if (imageWidth >= imageHeight) {
      pageWidth = long
      pageHeight = (long * imageHeight) / imageWidth
    } else {
      pageHeight = long
      pageWidth = (long * imageWidth) / imageHeight
    }
  } else {
    const [short, long] =
      options.pageSize === 'a4' ? A4 : LETTER
    const landscape =
      options.orientation === 'landscape' ||
      (options.orientation === 'auto' && imageWidth > imageHeight)
    pageWidth = landscape ? long : short
    pageHeight = landscape ? short : long
  }

  const roomWidth = pageWidth - margin * 2
  const roomHeight = pageHeight - margin * 2
  if (roomWidth <= 0 || roomHeight <= 0) {
    throw new Error('The margin is larger than the page.')
  }

  const scale = Math.min(roomWidth / imageWidth, roomHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  }
}

/** Put several photos into one PDF, one page each, in the order given. */
export async function imagesToPdf(
  files: File[],
  options: Partial<ImagePdfOptions> = {},
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error('Add at least one image to make a PDF.')
  }

  const settings: ImagePdfOptions = {
    pageSize: 'a4',
    orientation: 'auto',
    margin: 24,
    ...options,
  }

  // Imported here so the PDF library is fetched only when someone asks for a PDF.
  const { PDFDocument } = await import('pdf-lib')
  const document = await PDFDocument.create()
  document.setProducer('MergePDF')

  for (const file of files) {
    const image = await embedForPdf(document, file)
    const placement = imagePageSize(image.width, image.height, settings)
    const page = document.addPage([placement.pageWidth, placement.pageHeight])

    page.drawImage(image, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    })
  }

  const bytes = await document.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: 'application/pdf',
  })
}

/** Put one image on its own A4 page, scaled to fit without cropping. */
export async function imageToPdf(file: File): Promise<Blob> {
  return imagesToPdf([file])
}

/**
 * Split plain text into paragraphs. A blank line ends one; single newlines stay
 * inside it, so a plain-text page keeps its shape in a PDF.
 */
export function textBlocks(text: string): DocxBlock[] {
  return text
    .split(/\r?\n[ \t]*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => ({ text: paragraph, level: 0, list: false }))
}

/** Read a PDF, Word file, or text file as paragraphs with their structure. */
async function blocksOf(file: File): Promise<DocxBlock[]> {
  const kind = sourceKindOf(file.name)

  if (kind === 'docx') return readDocx(file)

  if (kind === 'pdf') {
    const paragraphs = await readPdfParagraphs(file)
    return paragraphs.map((text) => ({ text, level: 0, list: false }))
  }

  if (kind === 'text') return textBlocks(await readTextFile(file))

  throw new Error(`The browser cannot read ${file.name} as text.`)
}

async function pdfFrom(file: File): Promise<Blob> {
  const kind = sourceKindOf(file.name)

  if (kind === 'image') return imageToPdf(file)
  if (kind === 'docx') return docxToPdf(file)
  if (kind === 'text') return blocksToPdf(textBlocks(await readTextFile(file)))

  throw new Error(`The browser cannot make a PDF from ${file.name}.`)
}

const DOCUMENT_MIME = {
  html: 'text/html',
  md: 'text/markdown',
  txt: 'text/plain',
} as const

async function documentFrom(file: File, target: string): Promise<Blob> {
  const kind = sourceKindOf(file.name)

  if (target === 'docx') {
    if (kind === 'pdf') return (await pdfToDocx(file)).blob

    return docxFromParagraphs((await blocksOf(file)).map((block) => block.text))
  }

  if (target !== 'html' && target !== 'md' && target !== 'txt') {
    throw new Error(`The browser cannot write .${target}.`)
  }

  const blocks = await blocksOf(file)

  const text =
    target === 'html'
      ? docxToHtml(blocks, splitExtension(file.name).base)
      : target === 'md'
        ? docxToMarkdown(blocks)
        : docxToText(blocks)

  return new Blob([text], { type: `${DOCUMENT_MIME[target]};charset=utf-8` })
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
      return pdfFrom(file)
    case 'document':
      return documentFrom(file, plan.target)
    case 'blocked':
      throw new Error(plan.note ?? `Cannot convert to ${target}.`)
  }
}
