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
  'w-20 border border-line bg-sunk px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent'

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
    <div className="space-y-6">
      <FileDrop
        onFiles={(incoming) => choose(incoming[0] ?? null)}
        accept=".pdf,application/pdf"
        multiple={false}
        label="Drop the PDF to crop"
        hint="Trim the same percentage from every page."
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

          <p className="mt-3 text-xs text-muted">
            Take a percentage off each side of every page as it is seen, so a
            sideways scan is trimmed on its visible edges.
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            {EDGES.map((edge) => (
              <label key={edge.key} className="text-xs text-muted">
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
              className="border border-line bg-sunk px-3 py-1.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
            >
              Trim 5% all round
            </button>

            <button
              type="button"
              onClick={() => void run()}
              disabled={busy || !valid}
              className="bg-accent px-4 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Cropping…' : 'Preview crop'}
            </button>
          </div>

          {!valid && (
            <p className="mt-2 text-xs text-bad">
              Margins must be zero or more, and opposite sides together cannot
              reach 100%.
            </p>
          )}

          <p className="mt-3 text-[11px] text-muted">
            Cropping changes where each page ends; the removed area is hidden
            rather than deleted from the file.
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
                {formatSize(preview.blob.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:text-ink cursor-pointer"
            >
              Close preview
            </button>
          </header>
          <div className="p-4">
            <PdfPreview blob={preview.blob} title={preview.name} />
          </div>
        </section>
      )}

      {preview && (
        <DownloadBar>
          <button
            type="button"
            onClick={() => downloadBlob(preview.blob, preview.name)}
            className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover cursor-pointer"
          >
            Download {preview.name}
          </button>
        </DownloadBar>
      )}
    </div>
  )
}
