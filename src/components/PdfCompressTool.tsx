import { useRef, useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FilePreview } from './FilePreview'
import { PdfPreview } from './PdfPreview'
import { downloadBlob } from '../tools/download'
import { pdfBaseName } from '../tools/pdf'
import {
  MAX_COMPRESS_PAGES,
  compressPdf,
  type CompressionResult,
} from '../lib/pdfRaster'
import { formatSize } from '../lib/format'

const field =
  'rounded-lg border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25'

function saved(result: CompressionResult): string {
  if (result.keptOriginal) return 'no gain'
  const ratio = 1 - result.blob.size / result.originalSize
  return `${Math.round(ratio * 100)}% smaller`
}

export function PdfCompressTool({ initialFiles }: { initialFiles?: File[] }) {
  const handedPdf =
    initialFiles?.find((file) => /\.pdf$/i.test(file.name)) ?? null

  const [file, setFile] = useState<File | null>(handedPdf)
  const [dpi, setDpi] = useState(150)
  const [quality, setQuality] = useState(0.7)
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(
    null,
  )
  const [result, setResult] = useState<
    (CompressionResult & { name: string }) | null
  >(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Flipped by the Stop button; checked between pages, so a long job ends. */
  const stopped = useRef(false)

  function choose(next: File | null) {
    setFile(next)
    setResult(null)
    setProgress(null)
    setError(null)
  }

  async function run() {
    if (!file) return
    stopped.current = false
    setBusy(true)
    setResult(null)
    setError(null)
    setProgress(null)

    try {
      const made = await compressPdf(file, {
        dpi,
        quality,
        onPage: (page, total) => setProgress({ page, total }),
        stopped: () => stopped.current,
      })
      setResult({
        ...made,
        name: `${pdfBaseName(file.name)}-compressed.pdf`,
      })
    } catch (problem) {
      // Stopping is the visitor's choice, not a failure to report in red.
      if (!stopped.current) {
        setError(
          problem instanceof Error
            ? problem.message
            : 'The PDF could not be compressed.',
        )
      }
    } finally {
      stopped.current = false
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <>
      <FileDrop
        onFiles={(incoming) => choose(incoming[0] ?? null)}
        accept=".pdf,application/pdf"
        multiple={false}
        label="Drop the PDF to compress"
        hint={`Up to ${MAX_COMPRESS_PAGES} pages. Every page is redrawn as a JPEG.`}
      />

      {file && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <FilePreview name={file.name} blob={file} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {file.name}
                </p>
                <p className="text-sm text-muted">{formatSize(file.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => choose(null)}
              className="text-sm text-muted hover:text-ink"
            >
              Choose another
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="text-sm text-muted">
              Resolution
              <select
                value={dpi}
                onChange={(event) => {
                  setDpi(Number(event.target.value))
                  setResult(null)
                }}
                className={`mt-1 block ${field}`}
              >
                <option value={96}>96 dpi, smallest</option>
                <option value={150}>150 dpi, balanced</option>
                <option value={200}>200 dpi, sharper</option>
                <option value={300}>300 dpi, print</option>
              </select>
            </label>

            <label className="text-sm text-muted">
              JPEG quality {Math.round(quality * 100)}%
              <input
                type="range"
                min={30}
                max={95}
                step={5}
                value={quality * 100}
                onChange={(event) => {
                  setQuality(Number(event.target.value) / 100)
                  setResult(null)
                }}
                className="mt-2 block w-44"
              />
            </label>

            <button
              type="button"
              onClick={() => void run()}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {busy
                ? progress
                  ? `Page ${progress.page} of ${progress.total}…`
                  : 'Compressing…'
                : 'Compress'}
            </button>

            {busy && (
              <button
                type="button"
                onClick={() => {
                  stopped.current = true
                }}
                className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink hover:bg-hover"
              >
                Stop
              </button>
            )}
          </div>

          <p className="mt-3 text-sm text-muted">
            This rebuilds every page as a picture, which is what makes the file
            smaller. Text stops being selectable, and links, forms, and
            bookmarks are lost. If the rebuilt copy is not smaller, the original
            is kept.
          </p>
        </section>
      )}

      {error && (
        <p className="rounded-xl border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {result && (
        <section className="rounded-xl border border-line bg-surface">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-medium text-ink">
              {result.keptOriginal ? 'The original is already smaller' : 'Compressed'}
            </h2>
            <p className="text-sm text-muted">
              {formatSize(result.originalSize)} → {formatSize(result.blob.size)}{' '}
              ({saved(result)})
            </p>
          </header>
          <div className="p-5">
            <PdfPreview blob={result.blob} title={result.name} />
            <p className="mt-2 text-xs text-faint">
              {result.keptOriginal
                ? 'The rebuilt copy was larger, so this preview and download are the original file.'
                : 'Check the preview before saving. Small text may look softer at a low resolution.'}
            </p>
          </div>
        </section>
      )}

      {result && (
        <DownloadBar note={saved(result)}>
          <button
            type="button"
            onClick={() => downloadBlob(result.blob, result.name)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Download
          </button>
        </DownloadBar>
      )}
    </>
  )
}
