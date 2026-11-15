import { useState } from 'react'
import { FileDrop } from './FileDrop'
import {
  finalizeNames,
  patternError,
  sanitizeName,
  suggestName,
  type RenameOptions,
} from '../tools/rename'
import { downloadBlob, downloadZip } from '../tools/download'

const initialOptions: RenameOptions = {
  prefix: '',
  suffix: '',
  numbering: false,
  start: 1,
  pad: 3,
  find: '',
  replace: '',
  useRegex: false,
  caseSensitive: false,
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}
    </label>
  )
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

export function RenameTool() {
  const [files, setFiles] = useState<File[]>([])
  const [options, setOptions] = useState<RenameOptions>(initialOptions)
  const [edits, setEdits] = useState<Record<number, string>>({})
  const [zipping, setZipping] = useState(false)

  const error = patternError(options)

  // What the user asked for: their own edit if they made one, otherwise the suggestion.
  const desired = files.map(
    (file, index) =>
      edits[index] ?? (error ? file.name : suggestName(file.name, index, options)),
  )
  const { rows, collisions } = finalizeNames(files, desired)

  function changeOptions(patch: Partial<RenameOptions>) {
    setOptions({ ...options, ...patch })
    // Bulk rules rewrite every name, so hand-written names would silently disagree.
    setEdits({})
  }

  function addFiles(incoming: File[]) {
    setFiles([...files, ...incoming])
    setEdits({})
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index))
    setEdits({})
  }

  async function downloadAll() {
    setZipping(true)
    try {
      await downloadZip(
        rows.map((row) => ({ name: row.next, file: row.file })),
        'renamed-files.zip',
      )
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="space-y-8">
      <FileDrop
        onFiles={addFiles}
        label="Drop the files you want to rename"
        hint="Several at once is fine. Nothing is uploaded."
      />

      {files.length > 0 && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-medium text-slate-700">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setFiles([])
                  setEdits({})
                }}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Clear all
              </button>
            </header>
            <ul className="divide-y divide-slate-100">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 px-5 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-slate-400">
                    {formatSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                    className="shrink-0 rounded px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <details className="group rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-slate-700 select-none">
              Bulk rename
              <span className="ml-2 font-normal text-slate-500">
                optional, for many files at once
              </span>
            </summary>

            <div className="border-t border-slate-200 p-5">
              <p className="text-sm text-slate-500">
                Changes here replace any names you typed by hand. The extension
                is kept.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="prefix">Prefix</Label>
                  <input
                    id="prefix"
                    value={options.prefix}
                    onChange={(event) =>
                      changeOptions({ prefix: event.target.value })
                    }
                    placeholder="2026-"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label htmlFor="suffix">Suffix</Label>
                  <input
                    id="suffix"
                    value={options.suffix}
                    onChange={(event) =>
                      changeOptions({ suffix: event.target.value })
                    }
                    placeholder="-signed"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label htmlFor="find">Find</Label>
                  <input
                    id="find"
                    value={options.find}
                    onChange={(event) =>
                      changeOptions({ find: event.target.value })
                    }
                    placeholder="draft"
                    className={inputClass}
                    aria-invalid={error !== null}
                  />
                </div>
                <div>
                  <Label htmlFor="replace">Replace with</Label>
                  <input
                    id="replace"
                    value={options.replace}
                    onChange={(event) =>
                      changeOptions({ replace: event.target.value })
                    }
                    placeholder="final"
                    className={inputClass}
                  />
                </div>
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-700">Pattern error: {error}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={options.caseSensitive}
                    onChange={(event) =>
                      changeOptions({ caseSensitive: event.target.checked })
                    }
                    className="size-4 accent-slate-900"
                  />
                  Match case
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={options.useRegex}
                    onChange={(event) =>
                      changeOptions({ useRegex: event.target.checked })
                    }
                    className="size-4 accent-slate-900"
                  />
                  Find is a regular expression
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={options.numbering}
                    onChange={(event) =>
                      changeOptions({ numbering: event.target.checked })
                    }
                    className="size-4 accent-slate-900"
                  />
                  Add a number
                </label>

                {options.numbering && (
                  <div className="flex items-end gap-3">
                    <div>
                      <Label htmlFor="start">Start at</Label>
                      <input
                        id="start"
                        type="number"
                        min={0}
                        value={options.start}
                        onChange={(event) =>
                          changeOptions({ start: Number(event.target.value) || 0 })
                        }
                        className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pad">Digits</Label>
                      <input
                        id="pad"
                        type="number"
                        min={1}
                        max={6}
                        value={options.pad}
                        onChange={(event) =>
                          changeOptions({
                            pad: Math.min(
                              6,
                              Math.max(1, Number(event.target.value) || 1),
                            ),
                          })
                        }
                        className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </details>

          <section className="rounded-xl border border-slate-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <div>
                <h2 className="text-sm font-medium text-slate-700">
                  New names
                </h2>
                <p className="text-sm text-slate-500">
                  Type over any name you want to change.
                  {collisions > 0 &&
                    ` ${collisions} duplicate${
                      collisions === 1 ? ' was' : 's were'
                    } numbered automatically.`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEdits({})}
                  className="text-sm text-slate-500 hover:text-slate-900"
                >
                  Reset names
                </button>
                <button
                  type="button"
                  onClick={downloadAll}
                  disabled={zipping}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {zipping ? 'Preparing…' : 'Download all as .zip'}
                </button>
              </div>
            </header>

            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Current name</th>
                    <th className="px-5 py-2 font-medium">New name</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={`${row.original}-${index}`}>
                      <td className="px-5 py-2 align-middle text-slate-500">
                        <span className="break-all">{row.original}</span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={desired[index]}
                          onChange={(event) =>
                            setEdits({ ...edits, [index]: event.target.value })
                          }
                          onBlur={(event) => {
                            // Clean up only when the user leaves the field, so
                            // typing a "/" does not vanish mid-word.
                            const clean =
                              sanitizeName(event.target.value) || row.original
                            setEdits({ ...edits, [index]: clean })
                          }}
                          aria-label={`New name for ${row.original}`}
                          className="w-full rounded-md border border-transparent px-2 py-1 font-medium outline-none hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                        />
                      </td>
                      <td className="px-5 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => downloadBlob(row.file, row.next)}
                          className="text-sm text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
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
        </>
      )}
    </div>
  )
}
