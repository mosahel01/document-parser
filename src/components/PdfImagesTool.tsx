import { useRef, useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { FilePreview } from './FilePreview'
import { PdfPreview } from './PdfPreview'
import { downloadBlob, downloadEach } from '../tools/download'
import { isImageName, imagesToPdf, type ImagePdfPageSize, type ImagePdfOrientation } from '../tools/convert'
import { joinedBaseName, splitExtension } from '../tools/rename'
import { pageImageName, pdfBaseName } from '../tools/pdf'
import {
  MAX_PAGE_IMAGES,
  renderPdfPages,
  type PageImage,
  type RasterFormat,
} from '../lib/pdfRaster'
import { formatSize } from '../lib/format'

const field =
  'border border-line bg-sunk px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export function PdfToImagesTool({ initialFiles }: { initialFiles?: File[] }) {
  const handedPdf =
    initialFiles?.find((file) => /\.pdf$/i.test(file.name)) ?? null

  const [file, setFile] = useState<File | null>(handedPdf)
  const [format, setFormat] = useState<RasterFormat>('jpg')
  const [dpi, setDpi] = useState(200)
  const [quality, setQuality] = useState(0.85)
  const [rows, setRows] = useState<{ name: string; image: PageImage }[] | null>(
    null,
  )
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Flipped by the Stop button; checked between pages, so a long job ends. */
  const stopped = useRef(false)

  function choose(next: File | null) {
    setFile(next)
    setRows(null)
    setProgress(null)
    setError(null)
  }

  async function run() {
    if (!file) return
    stopped.current = false
    setBusy(true)
    setRows(null)
    setError(null)
    setProgress(null)

    try {
      const images = await renderPdfPages(file, {
        dpi,
        format,
        quality,
        maxPages: MAX_PAGE_IMAGES,
        onPage: (image) => setProgress({ page: image.page, total: image.total }),
        stopped: () => stopped.current,
      })

      // Stopping throws away the pages drawn so far: a partial set would look
      // like the whole document and be saved under names that claim the same.
      if (stopped.current) return

      const base = pdfBaseName(file.name)
      setRows(
        images.map((image) => ({
          name: pageImageName(base, image.page, image.total, format),
          image,
        })),
      )
    } catch (problem) {
      // Stopping is the visitor's choice, not a failure to report in red.
      if (!stopped.current) {
        setError(
          problem instanceof Error
            ? problem.message
            : 'The pages could not be drawn.',
        )
      }
    } finally {
      stopped.current = false
      setBusy(false)
      setProgress(null)
    }
  }

  async function saveAll() {
    if (!rows) return
    setSaving(true)
    try {
      await downloadEach(
        rows.map((row) => ({ blob: row.image.blob, name: row.name })),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <FileDrop
        onFiles={(incoming) => choose(incoming[0] ?? null)}
        accept=".pdf,application/pdf"
        multiple={false}
        label="Drop the PDF to turn into images"
        hint={`One picture per page, up to ${MAX_PAGE_IMAGES} pages at a time.`}
      />

      {file && (
        <section className="border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <FilePreview name={file.name} blob={file} />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">
                  {file.name}
                </p>
                <p className="font-mono text-[11px] text-faint">{formatSize(file.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => choose(null)}
              className="border border-line bg-sunk px-2.5 py-1 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
            >
              Choose another
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted">
              Format
              <select
                value={format}
                onChange={(event) => {
                  setFormat(event.target.value as RasterFormat)
                  setRows(null)
                }}
                className={`mt-1 block ${field}`}
              >
                <option value="jpg">JPG (compressed)</option>
                <option value="png">PNG (lossless)</option>
              </select>
            </label>

            <label className="text-xs text-muted">
              Resolution
              <select
                value={dpi}
                onChange={(event) => {
                  setDpi(Number(event.target.value))
                  setRows(null)
                }}
                className={`mt-1 block ${field}`}
              >
                <option value={150}>150 dpi, compact</option>
                <option value={200}>200 dpi, balanced</option>
                <option value={300}>300 dpi, high print</option>
              </select>
            </label>

            {format === 'jpg' && (
              <label className="text-xs text-muted">
                Quality {Math.round(quality * 100)}%
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={5}
                  value={quality * 100}
                  onChange={(event) => {
                    setQuality(Number(event.target.value) / 100)
                    setRows(null)
                  }}
                  className="mt-2 block w-32"
                />
              </label>
            )}

            <button
              type="button"
              onClick={() => void run()}
              disabled={busy}
              className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {busy
                ? progress
                  ? `Drawing page ${progress.page} of ${progress.total}…`
                  : 'Drawing…'
                : 'Export Images'}
            </button>

            {busy && (
              <button
                type="button"
                onClick={() => {
                  stopped.current = true
                }}
                className="border border-line bg-sunk px-3 py-2 text-xs font-medium text-ink hover:border-edge cursor-pointer"
              >
                Stop
              </button>
            )}
          </div>

          <p className="mt-3 text-[11px] text-muted">
            Each page is drawn as it appears in a viewer. Rotated and cropped
            pages keep their look.
          </p>
        </section>
      )}

      {error && (
        <p className="border border-bad/30 bg-bad-soft px-4 py-3 text-xs text-bad">
          {error}
        </p>
      )}

      {rows && rows.length > 0 && (
        <section className="border border-line bg-surface">
          <header className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-medium text-ink">
              {rows.length} {rows.length === 1 ? 'image' : 'images'}
            </h2>
            <p className="font-mono text-[11px] text-faint">
              Each page downloads as its own image.
            </p>
          </header>

          <ul className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((row) => (
              <li
                key={row.name}
                className="overflow-hidden border border-line bg-sunk"
              >
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden p-2">
                  <FilePreview
                    name={row.name}
                    blob={row.image.blob}
                    variant="wide"
                  />
                </div>
                <div className="border-t border-line bg-surface px-2.5 py-1.5">
                  <p className="truncate font-mono text-[11px] font-medium text-ink">
                    {row.name}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-faint">
                      {formatSize(row.image.blob.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadBlob(row.image.blob, row.name)}
                      className="border border-line bg-sunk px-1.5 py-0.5 text-[10px] text-muted hover:border-edge hover:text-ink cursor-pointer"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows && rows.length > 0 && (
        <DownloadBar
          note={`${rows.length} ${rows.length === 1 ? 'image' : 'images'}, one download each.`}
        >
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving}
            className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Download all'}
          </button>
        </DownloadBar>
      )}
    </div>
  )
}

export function ImagesToPdfTool({ initialFiles }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(
    (initialFiles ?? []).filter((file) => isImageName(file.name)),
  )
  const [pageSize, setPageSize] = useState<ImagePdfPageSize>('a4')
  const [orientation, setOrientation] = useState<ImagePdfOrientation>('auto')
  const [margin, setMargin] = useState(24)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ blob: Blob; name: string } | null>(
    null,
  )

  const name =
    files.length === 1
      ? `${splitExtension(files[0].name).base}.pdf`
      : `${joinedBaseName(files.map((file) => file.name))}.pdf`

  function resetPreview() {
    setPreview(null)
  }

  async function make(to: 'download' | 'preview') {
    if (files.length === 0) return
    setBusy(true)
    setError(null)

    try {
      const blob = await imagesToPdf(files, { pageSize, orientation, margin })
      if (to === 'download') downloadBlob(blob, name)
      else setPreview({ blob, name })
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'The images could not be made into a PDF.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <FileDrop
        onFiles={(incoming) => {
          setFiles([...files, ...incoming])
          resetPreview()
        }}
        accept="image/*,.svg"
        label={
          files.length === 0
            ? 'Drop the photos for one PDF'
            : 'Drop more photos to add them'
        }
        hint="They become one page each, in the order shown below."
      />

      <FileList
        files={files}
        onRemove={(index) => {
          setFiles(files.filter((_, position) => position !== index))
          resetPreview()
        }}
        onClear={() => {
          setFiles([])
          resetPreview()
        }}
      />

      {files.length > 0 && (
        <section className="border border-line bg-surface p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted">
              Page size
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(event.target.value as ImagePdfPageSize)
                  resetPreview()
                }}
                className={`mt-1 block ${field}`}
              >
                <option value="a4">A4 (standard)</option>
                <option value="letter">Letter</option>
                <option value="image">Match the photo shape</option>
              </select>
            </label>

            <label className="text-xs text-muted">
              Orientation
              <select
                value={orientation}
                onChange={(event) => {
                  setOrientation(event.target.value as ImagePdfOrientation)
                  resetPreview()
                }}
                disabled={pageSize === 'image'}
                className={`mt-1 block ${field} disabled:opacity-50`}
              >
                <option value="auto">Follow the photo</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>

            <label className="text-xs text-muted">
              Margin
              <select
                value={margin}
                onChange={(event) => {
                  setMargin(Number(event.target.value))
                  resetPreview()
                }}
                className={`mt-1 block ${field}`}
              >
                <option value={0}>None</option>
                <option value={12}>Narrow (12pt)</option>
                <option value={24}>Normal (24pt)</option>
                <option value={36}>Wide (36pt)</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => void make('preview')}
              disabled={busy}
              className="border border-line bg-sunk px-3 py-1.5 text-xs font-medium text-ink hover:border-edge disabled:opacity-50 cursor-pointer"
            >
              Preview PDF
            </button>
          </div>

          <p className="mt-3 text-[11px] text-muted">
            The photos are placed at their natural aspect ratio inside the margin. Nothing
            is uploaded.
          </p>
        </section>
      )}

      {error && (
        <p className="border border-bad/30 bg-bad-soft px-4 py-3 text-xs text-bad">
          {error}
        </p>
      )}

      {preview && (
        <section className="border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <div>
              <h2 className="text-xs font-medium text-ink">{preview.name}</h2>
              <p className="font-mono text-[11px] text-faint">
                {files.length} {files.length === 1 ? 'page' : 'pages'} &bull;{' '}
                {formatSize(preview.blob.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={resetPreview}
              className="border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
            >
              Close preview
            </button>
          </header>
          <div className="p-4">
            <PdfPreview blob={preview.blob} title={preview.name} />
          </div>
        </section>
      )}

      {files.length > 0 &&
        (preview ? (
          <DownloadBar>
            <button
              type="button"
              onClick={() => downloadBlob(preview.blob, preview.name)}
              className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover cursor-pointer"
            >
              Download {preview.name}
            </button>
          </DownloadBar>
        ) : (
          <DownloadBar
            note={`${files.length} ${files.length === 1 ? 'photo becomes' : 'photos become'} one PDF.`}
          >
            <button
              type="button"
              onClick={() => void make('download')}
              disabled={busy}
              className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Making the PDF…' : `Download ${name}`}
            </button>
          </DownloadBar>
        ))}
    </div>
  )
}
