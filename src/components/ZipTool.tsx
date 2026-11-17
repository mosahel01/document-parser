import { useMemo, useState } from 'react'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { FilePreview } from './FilePreview'
import { downloadBlob, downloadEach } from '../tools/download'
import { joinedBaseName } from '../tools/rename'
import {
  downloadNames,
  readZip,
  zipFiles,
  type ZipEntry,
} from '../tools/zip'
import { formatSize } from '../lib/format'

type Mode = 'create' | 'open'

const tabClass = (active: boolean) =>
  `rounded-md px-4 py-1.5 text-sm font-medium ${
    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
  }`

export function ZipTool() {
  const [mode, setMode] = useState<Mode>('create')

  const [files, setFiles] = useState<File[]>([])
  const [zipping, setZipping] = useState(false)

  const [archive, setArchive] = useState<File | null>(null)
  const [entries, setEntries] = useState<ZipEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)

  const packedSize = files.reduce((total, file) => total + file.size, 0)
  const unpackedSize = entries?.reduce((total, entry) => total + entry.bytes.length, 0) ?? 0
  const names = downloadNames(entries?.map((entry) => entry.path) ?? [])
  const zipName = `${joinedBaseName(files.map((file) => file.name))}.zip`

  // Built once per archive: a fresh Blob on every render would restart images.
  const entryBlobs = useMemo(
    () =>
      new Map(
        (entries ?? []).map((entry) => [
          entry.path,
          new Blob([entry.bytes]),
        ]),
      ),
    [entries],
  )

  async function createArchive() {
    setZipping(true)
    try {
      const blob = await zipFiles(
        files.map((file) => ({ name: file.name, file })),
      )
      downloadBlob(blob, zipName)
    } finally {
      setZipping(false)
    }
  }

  async function openArchive(incoming: File) {
    setArchive(incoming)
    setEntries(null)
    setError(null)
    setReading(true)
    try {
      setEntries(await readZip(incoming))
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Could not read the archive.',
      )
    } finally {
      setReading(false)
    }
  }

  async function downloadEverything() {
    if (!entries) return
    setSaving(true)
    try {
      await downloadEach(
        entries.map((entry, index) => ({
          blob: new Blob([entry.bytes]),
          name: names[index],
        })),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="inline-flex gap-1 rounded-lg border border-slate-300 bg-white p-1">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={tabClass(mode === 'create')}
        >
          Create a zip
        </button>
        <button
          type="button"
          onClick={() => setMode('open')}
          className={tabClass(mode === 'open')}
        >
          Open a zip
        </button>
      </div>

      {mode === 'create' ? (
        <>
          <FileDrop
            onFiles={(incoming) => setFiles([...files, ...incoming])}
            label="Drop the files to pack"
            hint="Any file type. Nothing is uploaded."
          />

          <FileList
            files={files}
            onRemove={(index) =>
              setFiles(files.filter((_, position) => position !== index))
            }
            onClear={() => setFiles([])}
          />

          {files.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3">
              <p className="text-sm text-slate-500">
                {files.length} {files.length === 1 ? 'file' : 'files'},{' '}
                {formatSize(packedSize)}
              </p>
              <button
                type="button"
                onClick={createArchive}
                disabled={zipping}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {zipping ? 'Packing…' : `Download ${zipName}`}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <FileDrop
            onFiles={(incoming) => {
              const chosen = incoming[0]
              if (chosen) void openArchive(chosen)
            }}
            accept=".zip,application/zip"
            multiple={false}
            label="Drop a .zip archive"
            hint="Only zip for now. RAR and 7z are not supported."
          />

          {reading && <p className="text-sm text-slate-500">Reading…</p>}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          {archive && !error && entries && (
            <section className="rounded-xl border border-slate-200 bg-white">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-700">
                    {archive.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {entries.length}{' '}
                    {entries.length === 1 ? 'file' : 'files'},{' '}
                    {formatSize(unpackedSize)} unpacked. Each file downloads as
                    itself.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={downloadEverything}
                    disabled={saving}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Download all'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setArchive(null)
                      setEntries(null)
                    }}
                    className="text-sm text-slate-500 hover:text-slate-900"
                  >
                    Close archive
                  </button>
                </div>
              </header>

              {entries.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">
                  This archive is empty.
                </p>
              ) : (
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-2 font-medium">File</th>
                        <th className="px-5 py-2 font-medium">Size</th>
                        <th className="px-5 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map((entry, index) => (
                        <tr key={entry.path}>
                          <td className="px-5 py-2 align-middle">
                            <div className="flex items-center gap-2">
                              <FilePreview
                                name={entry.path}
                                blob={entryBlobs.get(entry.path)}
                              />
                              <span className="break-all">{entry.path}</span>
                            </div>
                          </td>
                          <td className="shrink-0 px-5 py-2 text-slate-500">
                            {formatSize(entry.bytes.length)}
                          </td>
                          <td className="px-5 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                downloadBlob(
                                  new Blob([entry.bytes]),
                                  names[index],
                                )
                              }
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
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
