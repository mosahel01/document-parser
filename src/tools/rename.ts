export type NameRow = {
  file: File
  original: string
  next: string
}

/** Split "report.final.pdf" into "report.final" and ".pdf". Dotfiles have no extension. */
export function splitExtension(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return { base: name, ext: '' }
  return { base: name.slice(0, dot), ext: name.slice(dot) }
}

/** Characters that break filenames on at least one common operating system. */
export function sanitizeName(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim()
}

/** "pdf", ".pdf", and " .PDF. " all mean the same extension. */
export function normalizeExtension(value: string): string {
  return value.trim().replace(/^\.+/, '').replace(/\.+$/, '').toLowerCase()
}

/** The same, with characters that break filenames removed. */
function sanitizeExtension(value: string): string {
  return sanitizeName(normalizeExtension(value)).replace(/^\.+/, '').replace(/\.+$/, '')
}

/** "photo.png" with "jpg" becomes "photo.jpg". No dot needed in the argument. */
export function replaceExtension(name: string, extension: string): string {
  return `${splitExtension(name).base}.${extension.replace(/^\.+/, '')}`
}

/**
 * A name that says where a made-up file came from. One source keeps its own
 * name, two become "a-and-b", more become "a-and-4-more". Each base is capped
 * so a few long names cannot blow past what a filesystem accepts.
 */
export function joinedBaseName(names: string[]): string {
  const bases = names
    .map((name) => sanitizeName(splitExtension(name).base).slice(0, 40))
    .filter((base) => base !== '')

  if (bases.length === 0) return 'file'
  if (bases.length === 1) return bases[0]
  if (bases.length === 2) return `${bases[0]}-and-${bases[1]}`
  return `${bases[0]}-and-${bases.length - 1}-more`
}

/**
 * One name for the whole batch. A single file keeps that name exactly; several
 * files get a number so they stay distinct: report-1.pdf, report-2.pdf.
 *
 * The extension box is optional. Empty means every file keeps its own; filled
 * means every file uses that one instead, converting the contents when the
 * browser can write that format.
 */
export function buildNames(
  files: File[],
  name: string,
  extension: string,
): NameRow[] {
  const base = sanitizeName(name)
  const wanted = sanitizeExtension(extension)

  if (base === '' && wanted === '') {
    return files.map((file) => ({
      file,
      original: file.name,
      next: file.name,
    }))
  }

  return files.map((file, index) => {
    const { base: originalBase, ext: originalExt } = splitExtension(file.name)

    let stem = base === '' ? originalBase : base
    if (base !== '' && files.length > 1) stem = `${base}-${index + 1}`

    const finalExt = wanted === '' ? originalExt : `.${wanted}`
    return { file, original: file.name, next: `${stem}${finalExt}` }
  })
}
