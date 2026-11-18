import { useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { FilePreview } from './FilePreview'
import { downloadBlob, downloadEach } from '../tools/download'
import { planRenames, renameOutputs, type PlannedRow } from '../tools/renamePlan'

export function RenameTool({ initialFiles }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles ?? [])
  const [name, setName] = useState('')
  const [extension, setExtension] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  )

  const rows = planRenames(files, name, extension)
  const sample = name.trim() === '' ? 'name' : name.trim()
  const converting = rows.some(
    (row) => row.conversion.kind === 'image' || row.conversion.kind === 'pdf',
  )

  async function saveAll() {
    setBusy(true)
    setProgress({ done: 0, total: rows.length })

    try {
      const outputs = await renameOutputs(rows, 0.9, (done, total) =>
        setProgress({ done, total }),
      )
      await downloadEach(outputs)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  async function saveOne(row: PlannedRow) {
    const [output] = await renameOutputs([row])
    downloadBlob(output.blob, output.name)
  }

  function clear() {
    setFiles([])
    setName('')
    setExtension('')
  }

  return (
    <div className="space-y-8">
      <FileDrop
        onFiles={(incoming) => setFiles([...files, ...incoming])}
        label="Drop the files you want to rename"
        hint="One file or a whole batch. Nothing is uploaded."
      />

      <FileList
        files={files}
        onRemove={(index) =>
          setFiles(files.filter((_, position) => position !== index))
        }
        onClear={clear}
      />

      {files.length > 0 && (
        <>
          <section className="rounded-xl border border-line bg-surface p-5">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div>
                <label
                  htmlFor="new-name"
                  className="block text-sm font-medium text-ink"
                >
                  New name
                </label>
                <input
                  id="new-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="report"
                  className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>
              <div>
                <label
                  htmlFor="new-extension"
                  className="block text-sm font-medium text-ink"
                >
                  Extension
                  <span className="ml-1 font-normal text-faint">
                    optional
                  </span>
                </label>
                <input
                  id="new-extension"
                  value={extension}
                  onChange={(event) => setExtension(event.target.value)}
                  placeholder="pdf"
                  className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>
            </div>

            <p className="mt-2 text-sm text-muted">
              {name.trim() === ''
                ? 'Leave the name empty to change only the extension.'
                : files.length > 1
                  ? `Every file gets a number: ${sample}-1, ${sample}-2, and so on.`
                  : 'The file keeps its own extension unless you fill the box.'}
            </p>
            <p className="mt-1 text-sm text-muted">
              {converting
                ? 'Changing an image to another image format, or to PDF, rewrites the file itself. PNG, JPG, and WebP work; anything else keeps its own extension and says why.'
                : 'Typing a different extension converts the file when the browser can write that format.'}
            </p>
          </section>

          <section className="rounded-xl border border-line bg-surface">
            <header className="border-b border-line px-5 py-3">
              <h2 className="text-sm font-medium text-ink">Preview</h2>
              <p className="text-sm text-muted">
                Downloads are the real files, saved one at a time.
              </p>
            </header>

            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-sunk text-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">Now</th>
                    <th className="px-5 py-2 font-medium">After</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row, index) => (
                    <tr key={`${row.row.original}-${index}`}>
                      <td className="px-5 py-2 align-middle">
                        <div className="flex items-center gap-2 text-muted">
                          <FilePreview
                            name={row.row.original}
                            blob={row.row.file}
                          />
                          <span className="break-all">{row.row.original}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2 align-middle">
                        <span className="break-all font-medium">{row.next}</span>
                        {(row.conversion.kind === 'image' ||
                          row.conversion.kind === 'pdf') && (
                          <span className="ml-2 rounded bg-good-soft px-1.5 py-0.5 text-xs font-medium text-good">
                            converted
                          </span>
                        )}
                        {row.note && (
                          <p className="mt-1 text-xs text-warn">{row.note}</p>
                        )}
                      </td>
                      <td className="px-5 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void saveOne(row)}
                          disabled={busy}
                          className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <DownloadBar>
            <button
              type="button"
              onClick={saveAll}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {progress
                ? `Preparing ${progress.done} of ${progress.total}…`
                : 'Download all'}
            </button>
          </DownloadBar>
        </>
      )}
    </div>
  )
}
