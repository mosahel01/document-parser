import { isImageName } from './convert'
import { TEXT_EXTENSIONS } from './replace'

/**
 * The file-first flow: a visitor drops files, and their type decides which
 * operations are offered. This module is the only place that decision is made,
 * so the Home screen stays a list of buttons and the tools stay unaware of it.
 */
export type FileKind =
  | 'image'
  | 'pdf'
  | 'docx'
  | 'text'
  | 'zip'
  | 'gzip'
  | 'other'

type BaseOperation = {
  label: string
  hint: string
  /** The files this action receives, already narrowed to what it can use. */
  files: File[]
}

/**
 * One action, paired with the tab that carries it out. Tool ids are repeated
 * from the registry in `App.tsx` on purpose: an id with no tab fails the type
 * check at the `setActive(operation.tool)` call.
 */
export type HomeOperation = BaseOperation &
  (
    | { tool: 'convert' }
    | { tool: 'image' }
    | { tool: 'merge' }
    | { tool: 'extract' }
    | { tool: 'organize' }
    | { tool: 'compressPdf' }
    | { tool: 'crop' }
    | { tool: 'number' }
    | { tool: 'watermark' }
    | { tool: 'toImages' }
    | { tool: 'imagesToPdf' }
    | { tool: 'word'; mode: 'read' | 'toPdf' | 'fromPdf' }
    | { tool: 'zip'; mode: 'create' | 'open' }
    | { tool: 'gzip'; mode: 'compress' | 'decompress' }
    | { tool: 'replace' }
    | { tool: 'rename' }
  )

export type FileGroup = {
  kind: FileKind
  label: string
  files: File[]
}

const KIND_NAMES: Record<FileKind, [one: string, many: string]> = {
  image: ['image', 'images'],
  pdf: ['PDF', 'PDFs'],
  docx: ['Word document', 'Word documents'],
  text: ['text file', 'text files'],
  zip: ['zip archive', 'zip archives'],
  gzip: ['gzip file', 'gzip files'],
  other: ['file', 'files'],
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase()
}

/**
 * What the file is, judged by its name alone. Reading every file to sniff its
 * contents would cost the visitor time before any button appears.
 *
 * SVG counts as an image because that is the common intent and the converter
 * can draw it; editing it as text stays on the Find & replace tab.
 */
export function kindOf(name: string): FileKind {
  const extension = extensionOf(name)

  if (isImageName(name)) return 'image'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'docx') return 'docx'
  if (extension === 'zip') return 'zip'
  if (extension === 'gz') return 'gzip'
  if ((TEXT_EXTENSIONS as readonly string[]).includes(extension)) return 'text'

  return 'other'
}

/** "2 images", "1 PDF". */
export function groupLabel(kind: FileKind, count: number): string {
  const [one, many] = KIND_NAMES[kind]
  return `${count} ${count === 1 ? one : many}`
}

/** Group a drop by kind, keeping the order the files arrived in. */
export function groupFiles(files: File[]): FileGroup[] {
  const groups: FileGroup[] = []

  for (const file of files) {
    const kind = kindOf(file.name)
    const existing = groups.find((group) => group.kind === kind)

    if (existing) {
      existing.files.push(file)
    } else {
      groups.push({ kind, label: groupLabel(kind, 1), files: [file] })
    }
  }

  for (const group of groups) {
    group.label = groupLabel(group.kind, group.files.length)
  }

  return groups
}

const rename = (files: File[]): HomeOperation => ({
  tool: 'rename',
  label: 'Rename',
  hint: 'Type the name you want. Changing an image’s extension converts it.',
  files,
})

const zip = (files: File[]): HomeOperation => ({
  tool: 'zip',
  mode: 'create',
  label: 'Zip',
  hint: 'Pack these into one archive.',
  files,
})

const gzip = (files: File[]): HomeOperation => ({
  tool: 'gzip',
  mode: 'compress',
  label: 'Compress to .gz',
  hint: 'Helps text most; photos rarely shrink. Not the same as PDF compression.',
  files,
})

/**
 * What one group of the same kind can do. Single-file operations are offered
 * only when the group holds exactly one file, so nothing is silently dropped.
 */
export function operationsFor(group: FileGroup): HomeOperation[] {
  const { kind, files } = group

  switch (kind) {
    case 'image':
      return files.length === 1
        ? [
            {
              tool: 'convert',
              label: 'Convert',
              hint: 'PNG, JPG, WebP, or a one-page PDF.',
              files,
            },
            {
              tool: 'image',
              label: 'Crop, resize, rotate',
              hint: 'Cut out part of the photo, turn it, and set its size.',
              files,
            },
            {
              tool: 'imagesToPdf',
              label: 'Make a PDF',
              hint: 'Choose the page size, orientation, and margin.',
              files,
            },
          ]
        : [
            {
              tool: 'convert',
              label: 'Convert them all',
              hint: 'Every photo goes to the same format.',
              files,
            },
            {
              tool: 'imagesToPdf',
              label: 'Make one PDF',
              hint: 'One page per photo, in the order shown.',
              files,
            },
          ]

    case 'pdf':
      return files.length === 1
        ? [
            {
              tool: 'organize',
              label: 'Organize pages',
              hint: 'Rotate, delete, copy, or drag pages into a new order.',
              files,
            },
            {
              tool: 'extract',
              label: 'Extract or split pages',
              hint: 'See every page, then keep what you need.',
              files,
            },
            {
              tool: 'compressPdf',
              label: 'Compress',
              hint: 'Rebuild pages as smaller pictures. Text stops being selectable.',
              files,
            },
            {
              tool: 'crop',
              label: 'Crop margins',
              hint: 'Trim a percentage from each side of every page.',
              files,
            },
            {
              tool: 'number',
              label: 'Page numbers',
              hint: 'Add a number to every page, where you choose.',
              files,
            },
            {
              tool: 'watermark',
              label: 'Watermark',
              hint: 'One line of text across each page.',
              files,
            },
            {
              tool: 'toImages',
              label: 'Save pages as images',
              hint: 'JPG or PNG, one picture per page.',
              files,
            },
            {
              tool: 'convert',
              label: 'Convert',
              hint: 'Word, HTML, Markdown, or text. The words only.',
              files,
            },
          ]
        : [
            {
              tool: 'merge',
              label: 'Merge into one PDF',
              hint: 'Joined in the order shown.',
              files,
            },
          ]

    case 'docx':
      return files.length === 1
        ? [
            {
              tool: 'convert',
              label: 'Convert',
              hint: 'PDF, HTML, Markdown, or text. Images and layout stay behind.',
              files,
            },
          ]
        : []

    case 'text':
      return [
        {
          tool: 'replace',
          label: 'Find and replace',
          hint: 'UTF-8 text only. See each change before it happens.',
          files,
        },
        {
          tool: 'convert',
          label: 'Convert',
          hint: 'A PDF or a Word file. The words only.',
          files,
        },
      ]

    case 'zip':
      return files.length === 1
        ? [
            {
              tool: 'zip',
              mode: 'open',
              label: 'Open the archive',
              hint: 'Look inside, then take out what you need.',
              files,
            },
          ]
        : []

    case 'gzip':
      return files.length === 1
        ? [
            {
              tool: 'gzip',
              mode: 'decompress',
              label: 'Decompress',
              hint: 'The name stored inside the archive is reused.',
              files,
            },
          ]
        : []

    default:
      return []
  }
}

/**
 * Actions that take the whole drop, whatever the mix of types. Kept apart from
 * `operationsFor` so a group's buttons never quietly grab files of another kind.
 */
export function batchOperationsFor(files: File[]): HomeOperation[] {
  if (files.length === 0) return []
  return [rename(files), zip(files), gzip(files)]
}

/** A reason the group has no action of its own, or null when it has one. */
export function missingActionNote(group: FileGroup): string | null {
  const { kind, files } = group

  if (kind === 'docx' && files.length > 1) {
    return 'Converting a Word file works one document at a time. Pick one, or use the whole batch below.'
  }
  if (kind === 'image' && files.length > 1) {
    return 'Cropping, resizing, and rotating work one photo at a time. Converting takes the whole set.'
  }
  if (kind === 'zip' && files.length > 1) {
    return 'Unzipping works one archive at a time.'
  }
  if (kind === 'pdf' && files.length > 1) {
    return 'Extracting pages works one PDF at a time. Merging takes the whole set.'
  }
  if (kind === 'gzip' && files.length > 1) {
    return 'Decompressing works one archive at a time.'
  }
  if (kind === 'other') {
    return 'Nothing here reads this type yet. Renaming, zipping, and compressing still work.'
  }

  return null
}
