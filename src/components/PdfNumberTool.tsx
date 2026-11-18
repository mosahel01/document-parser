import { useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FilePreview } from './FilePreview'
import { PdfPreview } from './PdfPreview'
import { downloadBlob } from '../tools/download'
import { pdfBaseName } from '../tools/pdf'
import {
  addPageNumbers,
  type PageNumberFormat,
  type PageNumberOptions,
  type PageNumberPosition,
} from '../tools/pdfEnhance'
import { formatSize } from '../lib/format'

const field =
  'rounded-lg border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25'

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: 'bottom-center', label: 'Bottom centre' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'top-center', label: 'Top centre' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
]

const FORMATS: { value: PageNumberFormat; label: string }[] = [
  { value: 'number', label: '1' },
  { value: 'page-number', label: 'Page 1' },
  { value: 'number-of-total', label: '1 of 10' },
]

export function PdfNumberTool({ initialFiles }: { initialFiles?: File[] }) {
  const handedPdf =
    initialFiles?.find((file) => /\.pdf$/i.test(file.name)) ?? null

  const [file, setFile] = useState<File | null>(handedPdf)
  const [options, setOptions] = useState<PageNumberOptions>({
    position: 'bottom-center',
    format: 'number',
    fontSize: 11,
    margin: 28,
    start: 1,
    skipFirst: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ blob: Blob; name: string } | null>(
    null,
  )

  function update(next: Partial<PageNumberOptions>) {
    setOptions({ ...options, ...next })
    setPreview(null)
  }

  function choose(next: File | null) {
    setFile(next)
    setPreview(null)
    setError(null)
  }

  async function run() {
    if (!file) return
    setBusy(true)
    setError(null)

    try {
      const blob = await addPageNumbers(file, options)
      setPreview({
        blob,
        name: `${pdfBaseName(file.name)}-numbered.pdf`,
      })
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'The page numbers could not be added.',
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
        label="Drop the PDF to number"
        hint="One number on every page, where you choose."
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
              Position
              <select
                value={options.position}
                onChange={(event) =>
                  update({
                    position: event.target.value as PageNumberPosition,
                  })
                }
                className={`mt-1 block ${field}`}
              >
                {POSITIONS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-muted">
              Looks like
              <select
                value={options.format}
                onChange={(event) =>
                  update({ format: event.target.value as PageNumberFormat })
                }
                className={`mt-1 block ${field}`}
              >
                {FORMATS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-muted">
              Size
              <input
                type="number"
                min={6}
                max={48}
                value={options.fontSize}
                onChange={(event) =>
                  update({ fontSize: Number(event.target.value) })
                }
                className={`mt-1 block w-20 ${field}`}
              />
            </label>

            <label className="text-sm text-muted">
              Margin
              <input
                type="number"
                min={0}
                max={200}
                value={options.margin}
                onChange={(event) =>
                  update({ margin: Number(event.target.value) })
                }
                className={`mt-1 block w-24 ${field}`}
              />
            </label>

            <label className="text-sm text-muted">
              First number
              <input
                type="number"
                min={0}
                max={100000}
                value={options.start}
                onChange={(event) =>
                  update({ start: Number(event.target.value) })
                }
                className={`mt-1 block w-24 ${field}`}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={options.skipFirst}
                onChange={(event) =>
                  update({ skipFirst: event.target.checked })
                }
                className="size-4"
              />
              Skip the first page
            </label>

            <button
              type="button"
              onClick={() => void run()}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? 'Numbering…' : 'Preview numbering'}
            </button>
          </div>

          <p className="mt-3 text-sm text-muted">
            Size and margin are in points; 72 points make an inch. The numbers
            are drawn on top and stay upright on a rotated page.
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
