import { useEffect, useState } from 'react'
import { pdfjs } from '../lib/pdfjs'
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
        const data = new Uint8Array(await file.arrayBuffer())
        const task = pdfjs.getDocument({ data })
        const pdf = await task.promise

        if (cancelled) {
          void task.destroy()
          return
        }

        setTotal(pdf.numPages)
        const limit = Math.min(pdf.numPages, maxPages)

        for (let number = 1; number <= limit; number += 1) {
          const page = await pdf.getPage(number)
          const natural = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: 220 / natural.width })

          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)

          const canvasContext = canvas.getContext('2d')
          if (!canvasContext) throw new Error('The browser refused a canvas.')

          await page.render({ canvas, canvasContext, viewport }).promise
          if (cancelled) return

          setThumbs((current) => [
            ...current,
            { page: number, url: canvas.toDataURL('image/png') },
          ])
        }

        void task.destroy()
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
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
        Preview failed: {error} You can still split the file.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-slate-500">
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
            className="overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            <img
              src={thumb.url}
              alt={`Page ${thumb.page}`}
              className="w-full bg-white"
            />
            <p className="border-t border-slate-100 px-2 py-1 text-center text-xs text-slate-500">
              {thumb.page}
            </p>
          </li>
        ))}
      </ul>

      {loading && thumbs.length === 0 && (
        <p className="mt-3 text-sm text-slate-400">
          {formatSize(file.size)} to read.
        </p>
      )}
    </div>
  )
}
