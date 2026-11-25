import { useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { downloadBlob, downloadEach } from '../tools/download'
import {
  gzipFile,
  gzipName,
  gunzipFile,
  readGzipName,
  unpackedName,
} from '../tools/gzip'
import { formatSize } from '../lib/format'

type Mode = 'compress' | 'decompress'

type Row = { file: File; blob: Blob; name: string }

const tabClass = (active: boolean) =>
  `px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
    active ? 'bg-hover text-ink shadow-xs' : 'text-muted hover:text-ink'
  }`

export function CompressTool({
  initialFiles,
  initialMode,
}: {
  initialFiles?: File[]
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'compress')
  const [files, setFiles] = useState<File[]>(initialFiles ?? [])
  const [rows, setRows] = useState<Row[] | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  async function run() {
    setBusy(true)
    setProblems([])
    setRows(null)

    const done: Row[] = []
    const failed: string[] = []

    try {
      for (const file of files) {
        try {
          if (mode === 'compress') {
            done.push({
              file,
              blob: await gzipFile(file),
              name: gzipName(file.name),
            })
          } else {
            const head = new Uint8Array(
              await file.slice(0, 65_536).arrayBuffer(),
            )
            done.push({
              file,
              blob: await gunzipFile(file),
              name: unpackedName(file.name, readGzipName(head)),
            })
          }
        } catch (problem) {
          failed.push(
            problem instanceof Error ? problem.message : `${file.name} failed.`,
          )
        }
      }

      setRows(done)
      setProblems(failed)
    } finally {
      setBusy(false)
    }
  }

  async function saveAll() {
    if (!rows) return
    setSaving(true)
    try {
      await downloadEach(rows.map((row) => ({ blob: row.blob, name: row.name })))
    } finally {
      setSaving(false)
    }
  }

  function switchTo(next: Mode) {
    setMode(next)
    setRows(null)
    setProblems([])
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex border border-line bg-sunk p-0.5">
        <button
          type="button"
          onClick={() => switchTo('compress')}
          className={tabClass(mode === 'compress')}
        >
          GZIP Compressor
        </button>
        <button
          type="button"
          onClick={() => switchTo('decompress')}
          className={tabClass(mode === 'decompress')}
        >
          GZIP Decompressor
        </button>
      </div>

      <FileDrop
        onFiles={(incoming) => {
          setFiles([...files, ...incoming])
          setRows(null)
        }}
        accept={mode === 'decompress' ? '.gz,.gzip,application/gzip' : undefined}
        label={
          mode === 'compress'
            ? 'Drop individual files to compress into .gz'
            : 'Drop .gz archives to decompress'
        }
        hint={
          mode === 'compress'
            ? 'GZIP compresses individual files directly using RFC 1952. Use ZIP for multiple files and folders.'
            : 'Extracts the original file stored inside the .gz stream.'
        }
      />

      <FileList
        files={files}
        onRemove={(index) =>
          setFiles(files.filter((_, position) => position !== index))
        }
        onClear={() => {
          setFiles([])
          setRows(null)
        }}
      />

      {files.length > 0 && (
        <div className="flex items-center justify-between border border-line bg-surface px-4 py-2.5">
          <p className="text-xs text-muted">
            {files.length} {files.length === 1 ? 'file' : 'files'} ready.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
          >
            {busy
              ? 'Working…'
              : mode === 'compress'
                ? 'Compress to .gz'
                : 'Decompress .gz'}
          </button>
        </div>
      )}

      {problems.length > 0 && (
        <ul className="space-y-2">
          {problems.map((problem) => (
            <li
              key={problem}
              className="border border-bad/30 bg-bad-soft px-4 py-3 text-xs text-bad"
            >
              {problem}
            </li>
          ))}
        </ul>
      )}

      {rows && rows.length > 0 && (
        <section className="border border-line bg-surface">
          <header className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-medium text-ink">
              {rows.length} {rows.length === 1 ? 'file' : 'files'} processed
            </h2>
            <p className="font-mono text-[11px] text-faint">
              Each file is downloaded independently under its preserved name.
            </p>
          </header>

          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li
                key={row.name}
                className="flex items-center gap-3 px-4 py-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                  {row.name}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-faint">
                  {formatSize(row.file.size)} → {formatSize(row.blob.size)}
                </span>
                <button
                  type="button"
                  onClick={() => downloadBlob(row.blob, row.name)}
                  className="border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows && rows.length > 0 && (
        <DownloadBar>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Download all'}
          </button>
        </DownloadBar>
      )}
    </div>
  )
}
