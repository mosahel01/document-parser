import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DownloadBar } from './DownloadBar'
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
  `rounded-[3px] px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
    active ? 'bg-hover text-ink shadow-xs' : 'text-muted hover:text-ink'
  }`

export function ZipTool({
  initialFiles,
  initialMode,
}: {
  initialFiles?: File[]
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'create')

  const [files, setFiles] = useState<File[]>(
    initialMode === 'open' ? [] : (initialFiles ?? []),
  )
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

  const openArchive = useCallback(async (incoming: File) => {
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
  }, [])

  // An archive handed over by the Home screen is opened once, on arrival.
  const handedOver = useRef(
    initialMode === 'open' ? (initialFiles?.[0] ?? null) : null,
  )
  useEffect(() => {
    const archive = handedOver.current
    if (!archive) return
    handedOver.current = null
    void openArchive(archive)
  }, [openArchive])

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
    <div className="space-y-6">
      <div className="inline-flex rounded-[4px] border border-line bg-sunk p-0.5">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={tabClass(mode === 'create')}
        >
          ZIP Creator
        </button>
        <button
          type="button"
          onClick={() => setMode('open')}
          className={tabClass(mode === 'open')}
        >
          ZIP Extractor
        </button>
      </div>

      {mode === 'create' ? (
        <>
          <FileDrop
            onFiles={(incoming) => setFiles([...files, ...incoming])}
            label="Drop files or folders to create a ZIP"
            hint="ZIP packages multiple files and directories into one compressed archive."
          />

          <FileList
            files={files}
            onRemove={(index) =>
              setFiles(files.filter((_, position) => position !== index))
            }
            onClear={() => setFiles([])}
          />

          {files.length > 0 && (
            <DownloadBar
              note={`${files.length} ${files.length === 1 ? 'file' : 'files'} (${formatSize(packedSize)})`}
            >
              <button
                type="button"
                onClick={createArchive}
                disabled={zipping}
                className="rounded-[4px] bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
              >
                {zipping ? 'Packing…' : `Download ${zipName}`}
              </button>
            </DownloadBar>
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
            label="Drop a .zip archive to inspect and extract"
            hint="Inspects contents table: paths, sizes, and file types with selective extraction."
          />

          {reading && <p className="text-xs text-muted">Reading archive index...</p>}

          {error && (
            <p className="rounded-[5px] border border-bad/30 bg-bad-soft px-4 py-3 text-xs text-bad">
              {error}
            </p>
          )}

          {archive && !error && entries && (
            <section className="rounded-[5px] border border-line bg-surface">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <div>
                  <h2 className="text-xs font-medium text-ink">
                    {archive.name}
                  </h2>
                  <p className="font-mono text-[11px] text-muted">
                    {entries.length}{' '}
                    {entries.length === 1 ? 'file' : 'files'} &bull;{' '}
                    Archive: {formatSize(archive.size)} &bull; Extracted: {formatSize(unpackedSize)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setArchive(null)
                    setEntries(null)
                  }}
                  className="rounded-[3px] border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
                >
                  Close archive
                </button>
              </header>

              {entries.length === 0 ? (
                <p className="px-4 py-4 text-xs text-muted">
                  This archive is empty.
                </p>
              ) : (
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-sunk text-muted border-b border-line">
                      <tr>
                        <th className="px-4 py-2 font-medium">File / Path</th>
                        <th className="px-4 py-2 font-medium">Unpacked Size</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {entries.map((entry, index) => (
                        <tr key={entry.path} className="hover:bg-hover/40 transition-colors">
                          <td className="px-4 py-2 align-middle">
                            <div className="flex items-center gap-2">
                              <FilePreview
                                name={entry.path}
                                blob={entryBlobs.get(entry.path)}
                              />
                              <span className="break-all font-mono text-[11px] text-ink">{entry.path}</span>
                            </div>
                          </td>
                          <td className="shrink-0 px-4 py-2 font-mono text-[11px] text-muted">
                            {formatSize(entry.bytes.length)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                downloadBlob(
                                  new Blob([entry.bytes]),
                                  names[index],
                                )
                              }
                              className="rounded-[3px] border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
                            >
                              Extract
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

          {archive && !error && entries && entries.length > 0 && (
            <DownloadBar note={`Total ${entries.length} files (${formatSize(unpackedSize)})`}>
              <button
                type="button"
                onClick={downloadEverything}
                disabled={saving}
                className="rounded-[4px] bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : 'Extract All Files'}
              </button>
            </DownloadBar>
          )}
        </>
      )}
    </div>
  )
}
