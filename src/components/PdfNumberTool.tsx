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
  'border border-line bg-sunk px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent'

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
    <div className="space-y-6">
      <FileDrop
        onFiles={(incoming) => choose(incoming[0] ?? null)}
        accept=".pdf,application/pdf"
        multiple={false}
        label="Drop the PDF to number"
        hint="One number on every page, where you choose."
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

            <label className="text-xs text-muted">
              Format
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

            <label className="text-xs text-muted">
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

            <label className="text-xs text-muted">
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

            <label className="text-xs text-muted">
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

            <label className="flex items-center gap-2 text-xs text-muted pb-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.skipFirst}
                onChange={(event) =>
                  update({ skipFirst: event.target.checked })
                }
                className="border-edge bg-sunk text-accent focus:ring-accent"
              />
              Skip first page
            </label>

            <button
              type="button"
              onClick={() => void run()}
              disabled={busy}
              className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Numbering…' : 'Preview numbering'}
            </button>
          </div>

          <p className="mt-3 text-[11px] text-muted">
            Size and margin are in points; 72 points make an inch. The numbers
            are drawn on top and stay upright on a rotated page.
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
