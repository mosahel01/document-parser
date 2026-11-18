import { useEffect, useState } from 'react'
import { renderPageThumbs, type PageThumb } from '../lib/pdfThumbs'
import { formatSize } from '../lib/format'

type Thumbnail = { page: number; url: string }

type PdfPagePreviewProps = {
  file: File
  /** Rendering 500 canvases would stall the tab, so previews stop at some point. */
  maxPages?: number
}

export function PdfPagePreview({ file, maxPages = 60 }: PdfPagePreviewProps) {
  const [thumbs, setThumbs] = useState<Thumbnail[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        setThumbs([])
        await renderPageThumbs(
          file,
          maxPages,
          (thumb: PageThumb) => {
            setTotal(thumb.total)
            setThumbs((current) => [
              ...current,
              { page: thumb.page, url: thumb.url },
            ])
          },
          () => cancelled,
        )
      } catch (problem) {
        if (!cancelled) {
          setError(
            problem instanceof Error
              ? problem.message
              : 'This PDF could not be previewed.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [file, maxPages])

  if (error) {
    return (
      <p className="rounded-xl border border-warn/30 bg-warn-soft px-5 py-3 text-sm text-warn">
        Preview failed: {error} You can still split the file.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted">
        {loading
          ? `Rendering ${total > 0 ? `${total} ` : ''}pages…`
          : `${total} ${total === 1 ? 'page' : 'pages'}`}
        {!loading && total > thumbs.length
          ? `. Showing the first ${thumbs.length}.`
          : ''}
        {loading && thumbs.length > 0
          ? ` ${thumbs.length} of ${total} done.`
          : ''}
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {thumbs.map((thumb) => (
          <li
            key={thumb.page}
            className="overflow-hidden rounded-lg border border-line bg-surface"
          >
            <img
              src={thumb.url}
              alt={`Page ${thumb.page}`}
              className="w-full bg-surface"
            />
            <p className="border-t border-line px-2 py-1 text-center text-xs text-muted">
              {thumb.page}
            </p>
          </li>
        ))}
      </ul>

      {loading && thumbs.length === 0 && (
        <p className="mt-3 text-sm text-faint">
          {formatSize(file.size)} to read.
        </p>
      )}
    </div>
  )
}
