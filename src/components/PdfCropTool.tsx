import { useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FilePreview } from './FilePreview'
import { PdfPreview } from './PdfPreview'
import { downloadBlob } from '../tools/download'
import { pdfBaseName } from '../tools/pdf'
import { cropPdf, type CropMargins } from '../tools/pdfEnhance'
import { formatSize } from '../lib/format'

const field =
  'w-20 rounded-lg border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25'

const EDGES: { key: keyof CropMargins; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'right', label: 'Right' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
]

export function PdfCropTool({ initialFiles }: { initialFiles?: File[] }) {
  const handedPdf =
    initialFiles?.find((file) => /\.pdf$/i.test(file.name)) ?? null

  const [file, setFile] = useState<File | null>(handedPdf)
  const [margins, setMargins] = useState<CropMargins>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ blob: Blob; name: string } | null>(
    null,
  )

  const horizontal = margins.left + margins.right
  const vertical = margins.top + margins.bottom
  const valid =
    horizontal < 100 &&
    vertical < 100 &&
    [margins.top, margins.right, margins.bottom, margins.left].every(
      (value) => Number.isFinite(value) && value >= 0,
    )

  function choose(next: File | null) {
    setFile(next)
    setPreview(null)
    setError(null)
  }

  function setMargin(key: keyof CropMargins, value: number) {
    setMargins({ ...margins, [key]: value })
    setPreview(null)
  }

  async function run() {
    if (!file || !valid) return
    setBusy(true)
    setError(null)

    try {
      const blob = await cropPdf(file, margins)
      setPreview({
        blob,
        name: `${pdfBaseName(file.name)}-cropped.pdf`,
      })
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'The PDF could not be cropped.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <FileDrop
        onFiles={(incoming) => choose(incoming[0] ?? null)}
        accept=".pdf,application/pdf"
        multiple={false}
        label="Drop the PDF to crop"
        hint="Trim the same percentage from every page."
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

          <p className="mt-4 text-sm text-muted">
            Take a percentage off each side of every page as it is seen, so a
            sideways scan is trimmed on its visible edges.
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            {EDGES.map((edge) => (
              <label key={edge.key} className="text-sm text-muted">
                {edge.label} %
                <input
                  type="number"
                  min={0}
                  max={45}
                  step={1}
                  value={margins[edge.key]}
                  onChange={(event) =>
                    setMargin(edge.key, Number(event.target.value))
                  }
                  className={`mt-1 block ${field}`}
                />
              </label>
            ))}

            <button
              type="button"
              onClick={() => {
                setMargins({ top: 5, right: 5, bottom: 5, left: 5 })
                setPreview(null)
              }}
              className="rounded-lg border border-edge px-3 py-2 text-sm text-ink hover:bg-hover"
            >
              Trim 5% all round
            </button>

            <button
              type="button"
              onClick={() => void run()}
              disabled={busy || !valid}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? 'Cropping…' : 'Preview crop'}
            </button>
          </div>

          {!valid && (
            <p className="mt-2 text-sm text-bad">
              Margins must be zero or more, and opposite sides together cannot
              reach 100%.
            </p>
          )}

          <p className="mt-3 text-sm text-muted">
            Cropping changes where each page ends; the removed area is hidden
            rather than deleted from the file.
          </p>
        </section>
      )}

      {error && (
        <p className="rounded-xl border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {preview && (
        <section className="rounded-xl border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <h2 className="text-sm font-medium text-ink">{preview.name}</h2>
              <p className="text-sm text-muted">
                {formatSize(preview.blob.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-sm text-muted hover:text-ink"
            >
              Close preview
            </button>
          </header>
          <div className="p-5">
            <PdfPreview blob={preview.blob} title={preview.name} />
          </div>
        </section>
      )}

      {preview && (
        <DownloadBar>
          <button
            type="button"
            onClick={() => downloadBlob(preview.blob, preview.name)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Download
          </button>
        </DownloadBar>
      )}
    </>
  )
}
