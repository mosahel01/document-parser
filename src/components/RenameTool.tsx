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
    <div className="space-y-6">
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
          <section className="rounded-[5px] border border-line bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <div>
                <label
                  htmlFor="new-name"
                  className="block text-xs font-medium text-ink"
                >
                  Target base name
                </label>
                <input
                  id="new-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="document"
                  className="mt-1 w-full rounded-[4px] border border-line bg-sunk px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="new-extension"
                  className="block text-xs font-medium text-ink"
                >
                  Extension
                  <span className="ml-1 text-faint">
                    (optional)
                  </span>
                </label>
                <input
                  id="new-extension"
                  value={extension}
                  onChange={(event) => setExtension(event.target.value)}
                  placeholder="pdf"
                  className="mt-1 w-full rounded-[4px] border border-line bg-sunk px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <p className="mt-2.5 text-[11px] text-muted">
              {name.trim() === ''
                ? 'Leave empty to preserve existing base names.'
                : files.length > 1
                  ? `Batches are numbered sequentially: ${sample}-1, ${sample}-2, etc.`
                  : 'Keeps its current extension unless an override is specified.'}
            </p>
            <p className="mt-1 text-[11px] text-faint">
              {converting
                ? 'Converting image formats or image to PDF redraws contents via Canvas. Output extensions determine formatting.'
                : 'Changing extensions will trigger format conversion when supported by client-side tools.'}
            </p>
          </section>

          <section className="rounded-[5px] border border-line bg-surface">
            <header className="border-b border-line px-4 py-2.5">
              <h2 className="text-xs font-medium text-ink">Preview Plan</h2>
              <p className="font-mono text-[11px] text-faint">
                Files download under their target names.
              </p>
            </header>

            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-sunk text-muted border-b border-line">
                  <tr>
                    <th className="px-4 py-2 font-medium">Original Name</th>
                    <th className="px-4 py-2 font-medium">Target Name</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row, index) => (
                    <tr key={`${row.row.original}-${index}`} className="hover:bg-hover/40 transition-colors">
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center gap-2 text-muted">
                          <FilePreview
                            name={row.row.original}
                            blob={row.row.file}
                          />
                          <span className="break-all font-mono text-[11px]">{row.row.original}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span className="break-all font-mono text-[11px] font-medium text-ink">{row.next}</span>
                        {(row.conversion.kind === 'image' ||
                          row.conversion.kind === 'pdf') && (
                          <span className="ml-2 rounded-[2px] bg-good-soft px-1.5 py-0.2 font-mono text-[10px] font-medium text-good border border-line">
                            converts
                          </span>
                        )}
                        {row.note && (
                          <p className="mt-0.5 text-[11px] text-warn">{row.note}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void saveOne(row)}
                          disabled={busy}
                          className="rounded-[3px] border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer disabled:opacity-50"
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
              className="rounded-[4px] bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
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
