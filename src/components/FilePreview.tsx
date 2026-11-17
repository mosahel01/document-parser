import { useEffect, useMemo, useState } from 'react'

type FilePreviewProps = {
  name: string
  /** Omit when only a type badge makes sense, such as a zip entry. */
  blob?: Blob
  variant?: 'thumb' | 'wide'
}

const IMAGE_NAME = /\.(png|jpe?g|webp|gif|bmp|avif|svg|ico)$/i
const TEXT_NAME =
  /\.(txt|md|markdown|csv|tsv|json|xml|html?|css|js|jsx|ts|tsx|ya?ml|ini|log|srt|vtt|svg|sql|sh|conf)$/i

const SNIPPET_CHARACTERS = 320

function extensionLabel(name: string): string {
  const dot = name.lastIndexOf('.')
  const extension = dot > 0 ? name.slice(dot + 1) : ''
  return extension === '' ? 'FILE' : extension.slice(0, 4).toUpperCase()
}

/**
 * A small look at a file: a real thumbnail for images, the first few lines for
 * text, and a type badge for everything else. Never reads more than a slice.
 */
export function FilePreview({ name, blob, variant = 'thumb' }: FilePreviewProps) {
  // A blob with no type comes from inside a zip. Only raster names are safe to
  // hand to <img> then; an untyped SVG would show as a broken image.
  const knownType = blob?.type ?? ''
  const isImage =
    blob !== undefined &&
    (knownType.startsWith('image/')
      ? true
      : knownType === '' && IMAGE_NAME.test(name) && !/\.svg$/i.test(name))

  const url = useMemo(
    () => (isImage && blob ? URL.createObjectURL(blob) : null),
    [isImage, blob],
  )

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  // The blob is kept with the text so a stale read can never show under a new file.
  const [read, setRead] = useState<{ blob: Blob; text: string } | null>(null)

  useEffect(() => {
    if (!blob || isImage || !TEXT_NAME.test(name)) return

    let live = true
    blob
      .slice(0, SNIPPET_CHARACTERS * 4)
      .text()
      .then((text) => {
        if (live) setRead({ blob, text })
      })
      .catch(() => {
        // A preview is a nicety; failing to read one should stay quiet.
      })

    return () => {
      live = false
    }
  }, [blob, isImage, name])

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={
          variant === 'wide'
            ? 'max-h-56 w-full rounded-lg bg-white object-contain ring-1 ring-slate-200'
            : 'size-9 shrink-0 rounded object-cover ring-1 ring-slate-200'
        }
      />
    )
  }

  const snippet = read && read.blob === blob ? read.text : null

  if (snippet) {
    return (
      <pre
        className={
          variant === 'wide'
            ? 'max-h-40 overflow-hidden whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600'
            : 'max-w-56 overflow-hidden whitespace-pre-wrap text-xs text-slate-500'
        }
      >
        {snippet.slice(0, variant === 'wide' ? 1200 : SNIPPET_CHARACTERS)}
      </pre>
    )
  }

  return (
    <span
      className={
        variant === 'wide'
          ? 'inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500'
          : 'inline-flex w-9 shrink-0 justify-center rounded bg-slate-100 px-1 py-1 text-[10px] font-medium text-slate-500'
      }
    >
      {extensionLabel(name)}
    </span>
  )
}
