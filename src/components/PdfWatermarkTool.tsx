import { useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FilePreview } from './FilePreview'
import { PdfPreview } from './PdfPreview'
import { downloadBlob } from '../tools/download'
import { pdfBaseName } from '../tools/pdf'
import { addWatermark, type WatermarkOptions } from '../tools/pdfEnhance'
import { formatSize } from '../lib/format'

const field =
  'rounded-lg border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25'

const PRESETS = ['CONFIDENTIAL', 'DRAFT', 'COPY', 'SAMPLE']

export function PdfWatermarkTool({ initialFiles }: { initialFiles?: File[] }) {
  const handedPdf =
    initialFiles?.find((file) => /\.pdf$/i.test(file.name)) ?? null

  const [file, setFile] = useState<File | null>(handedPdf)
  const [options, setOptions] = useState<WatermarkOptions>({
    text: 'CONFIDENTIAL',
    fontSize: 48,
    opacity: 0.25,
    angle: 45,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ blob: Blob; name: string } | null>(
    null,
  )

  const empty = options.text.trim() === ''

  function update(next: Partial<WatermarkOptions>) {
    setOptions({ ...options, ...next })
    setPreview(null)
  }

  function choose(next: File | null) {
    setFile(next)
    setPreview(null)
    setError(null)
  }

  async function run() {
    if (!file || empty) return
    setBusy(true)
    setError(null)

    try {
      const blob = await addWatermark(file, options)
      setPreview({
        blob,
        name: `${pdfBaseName(file.name)}-watermarked.pdf`,
      })
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'The watermark could not be added.',
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
        label="Drop the PDF to watermark"
        hint="One line of text across the middle of every page."
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
              Text
              <input
                value={options.text}
                onChange={(event) => update({ text: event.target.value })}
                aria-invalid={empty}
                className={`mt-1 block w-64 ${field}`}
              />
            </label>

            <label className="text-sm text-muted">
              Size
              <input
                type="number"
                min={6}
                max={200}
                value={options.fontSize}
                onChange={(event) =>
                  update({ fontSize: Number(event.target.value) })
                }
                className={`mt-1 block w-20 ${field}`}
              />
            </label>

            <label className="text-sm text-muted">
              Opacity {Math.round(options.opacity * 100)}%
              <input
                type="range"
                min={5}
                max={80}
                step={5}
                value={options.opacity * 100}
                onChange={(event) =>
                  update({ opacity: Number(event.target.value) / 100 })
                }
                className="mt-2 block w-40"
              />
            </label>

            <label className="text-sm text-muted">
              Angle {options.angle}°
              <input
                type="range"
                min={-90}
                max={90}
                step={5}
                value={options.angle}
                onChange={(event) =>
                  update({ angle: Number(event.target.value) })
                }
                className="mt-2 block w-40"
              />
            </label>

            <button
              type="button"
              onClick={() => void run()}
              disabled={busy || empty}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? 'Marking…' : 'Preview watermark'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Try</span>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => update({ text: preset })}
                className="rounded border border-edge px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-ink"
              >
                {preset}
              </button>
            ))}
          </div>

          <p className="mt-3 text-sm text-muted">
            Long text is shrunk to stay on the page. The watermark is drawn on
            top, so a small one can sit over the words without hiding them.
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
