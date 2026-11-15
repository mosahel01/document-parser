export type RenameOptions = {
  prefix: string
  suffix: string
  numbering: boolean
  start: number
  pad: number
  find: string
  replace: string
  useRegex: boolean
  caseSensitive: boolean
}

export type NameRow = {
  file: File
  original: string
  next: string
  collided: boolean
}

/** Split "report.final.pdf" into "report.final" and ".pdf". Dotfiles have no extension. */
export function splitExtension(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return { base: name, ext: '' }
  return { base: name.slice(0, dot), ext: name.slice(dot) }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Characters that break filenames on at least one common operating system. */
export function sanitizeName(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim()
}

/** Compile the find pattern once so the UI can show a useful error. */
export function patternError(options: RenameOptions): string | null {
  if (!options.useRegex || options.find === '') return null
  try {
    new RegExp(options.find, options.caseSensitive ? '' : 'i')
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid pattern'
  }
}

function applyReplace(base: string, options: RenameOptions): string {
  const { find, replace } = options
  if (find === '') return base

  // A function replacement stops "$&" in the user's text being treated as a pattern.
  const replaceWith = () => replace

  if (options.useRegex) {
    try {
      const flags = options.caseSensitive ? 'g' : 'gi'
      // Here "$1" should mean a capture group, so the text is passed through raw.
      return base.replace(new RegExp(find, flags), replace)
    } catch {
      // An invalid pattern is reported separately; leave the name untouched.
      return base
    }
  }

  if (options.caseSensitive) return base.split(find).join(replace)
  return base.replace(new RegExp(escapeRegExp(find), 'gi'), replaceWith)
}

/**
 * The bulk rules only ever rewrite the base name, so the extension survives.
 * Manual edits to a row are allowed to change the extension.
 */
export function suggestName(
  original: string,
  index: number,
  options: RenameOptions,
): string {
  const { base, ext } = splitExtension(original)

  let next = applyReplace(base, options)
  next = `${options.prefix}${next}${options.suffix}`

  if (options.numbering) {
    const number = options.start + index
    next = `${next}-${String(number).padStart(options.pad, '0')}`
  }

  return `${sanitizeName(next) || sanitizeName(base) || 'untitled'}${ext}`
}

/**
 * Turn the names the user wants into the names that will actually be saved:
 * illegal characters removed, blanks falling back to the original, and
 * duplicates numbered so no file overwrites another.
 */
export function finalizeNames(
  files: File[],
  desired: string[],
): { rows: NameRow[]; collisions: number } {
  const used = new Set<string>()
  let collisions = 0

  const rows = files.map((file, index) => {
    let next = sanitizeName(desired[index] ?? '') || file.name
    let collided = false

    if (used.has(next.toLowerCase())) {
      const { base, ext } = splitExtension(next)
      let counter = 2
      do {
        next = `${base} (${counter})${ext}`
        counter += 1
      } while (used.has(next.toLowerCase()))
      collided = true
      collisions += 1
    }

    used.add(next.toLowerCase())
    return { file, original: file.name, next, collided }
  })

  return { rows, collisions }
}
