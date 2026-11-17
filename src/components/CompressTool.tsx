import { useState } from 'react'
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
  `rounded-md px-4 py-1.5 text-sm font-medium ${
    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
  }`

export function CompressTool() {
  const [mode, setMode] = useState<Mode>('compress')
  const [files, setFiles] = useState<File[]>([])
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
    <div className="space-y-8">
      <div className="inline-flex gap-1 rounded-lg border border-slate-300 bg-white p-1">
        <button
          type="button"
          onClick={() => switchTo('compress')}
          className={tabClass(mode === 'compress')}
        >
          Compress
        </button>
        <button
          type="button"
          onClick={() => switchTo('decompress')}
          className={tabClass(mode === 'decompress')}
        >
          Decompress
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
            ? 'Drop the files to compress'
            : 'Drop the .gz files to expand'
        }
        hint={
          mode === 'compress'
            ? 'One file in, one .gz out. Use Zip to pack several files into one.'
            : 'The name stored inside the archive is reused when there is one.'
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
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3">
          <p className="text-sm text-slate-500">
            {files.length} {files.length === 1 ? 'file' : 'files'} ready.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy
              ? 'Working…'
              : mode === 'compress'
                ? 'Compress and download'
                : 'Decompress and download'}
          </button>
        </div>
      )}

      {problems.length > 0 && (
        <ul className="space-y-2">
          {problems.map((problem) => (
            <li
              key={problem}
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800"
            >
              {problem}
            </li>
          ))}
        </ul>
      )}

      {rows && rows.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div>
              <h2 className="text-sm font-medium text-slate-700">
                {rows.length} {rows.length === 1 ? 'file' : 'files'} done
              </h2>
              <p className="text-sm text-slate-500">
                Each one downloads under its own name.
              </p>
            </div>
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Download all'}
            </button>
          </header>

          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li
                key={row.name}
                className="flex items-center gap-3 px-5 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {row.name}
                </span>
                <span className="shrink-0 text-slate-400">
                  {formatSize(row.file.size)} → {formatSize(row.blob.size)}
                </span>
                <button
                  type="button"
                  onClick={() => downloadBlob(row.blob, row.name)}
                  className="shrink-0 text-sm text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
