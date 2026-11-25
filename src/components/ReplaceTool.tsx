import { useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { FilePreview } from './FilePreview'
import { downloadBlob, downloadEach } from '../tools/download'
import {
  TEXT_ACCEPT,
  buildPattern,
  hasUtf8Bom,
  isTextExtension,
  previewChange,
  readTextFile,
  replaceText,
  type ChangePreview,
  type ReplaceOptions,
} from '../tools/replace'
import { formatSize } from '../lib/format'

type Row = {
  file: File
  name: string
  blob: Blob
  count: number
  /** The first match in context, before and after the replacement. */
  preview: ChangePreview | null
}

const field =
  'border border-line bg-sunk px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export function ReplaceTool({ initialFiles }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles ?? [])
  const [skipped, setSkipped] = useState<string[]>([])
  const [find, setFind] = useState('')
  const [replacement, setReplacement] = useState('')
  const [regex, setRegex] = useState(false)
  const [matchCase, setMatchCase] = useState(false)

  const [rows, setRows] = useState<Row[] | null>(null)
  const [untouched, setUntouched] = useState(0)
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const options: ReplaceOptions = { find, replace: replacement, regex, matchCase }

  function addFiles(incoming: File[]) {
    const allowed = incoming.filter((file) => isTextExtension(file.name))
    const refused = incoming
      .filter((file) => !isTextExtension(file.name))
      .map((file) => file.name)

    setFiles([...files, ...allowed])
    setSkipped(refused)
    setRows(null)
  }

  async function run() {
    setBusy(true)
    setProblems([])
    setRows(null)

    try {
      // Fail once, up front, rather than once per file.
      buildPattern(options)
    } catch (problem) {
      setProblems([
        problem instanceof Error ? problem.message : 'That search is not valid.',
      ])
      setBusy(false)
      return
    }

    const found: Row[] = []
    const failed: string[] = []
    let unchanged = 0

    try {
      for (const file of files) {
        try {
          const original = await readTextFile(file)
          const result = replaceText(original, options)

          if (result.count === 0) {
            unchanged += 1
            continue
          }

          const text = (await hasUtf8Bom(file)) ? `\uFEFF${result.text}` : result.text

          found.push({
            file,
            name: file.name,
            blob: new Blob([text], { type: file.type || 'text/plain' }),
            count: result.count,
            preview: previewChange(original, options),
          })
        } catch (problem) {
          failed.push(
            problem instanceof Error
              ? problem.message
              : `${file.name} could not be read.`,
          )
        }
      }

      setRows(found)
      setProblems(failed)
      setUntouched(unchanged)
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

  return (
    <div className="space-y-6">
      <FileDrop
        onFiles={addFiles}
        accept={TEXT_ACCEPT}
        label="Drop text or code files to search & replace"
        hint="Text formats: txt, md, csv, json, html, css, code, srt, svg. Browser-only parsing."
      />

      {skipped.length > 0 && (
        <p className="border border-warn/30 bg-warn-soft px-4 py-3 text-xs text-warn">
          Skipped {skipped.length} {skipped.length === 1 ? 'file' : 'files'}{' '}
          this tool cannot rewrite: {skipped.join(', ')}. Use Word or PDF tools for binary formats.
        </p>
      )}

      <FileList
        files={files}
        onRemove={(index) =>
          setFiles(files.filter((_, position) => position !== index))
        }
        onClear={() => {
          setFiles([])
          setSkipped([])
          setRows(null)
        }}
      />

      {files.length > 0 && (
        <section className="border border-line bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink">
              Find
              <input
                value={find}
                onChange={(event) => setFind(event.target.value)}
                placeholder={regex ? 'cost:\\s*\\d+' : 'Search pattern'}
                className={`mt-1 w-full ${field}`}
              />
            </label>
            <label className="text-xs font-medium text-ink">
              Replace with
              <input
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                placeholder="leave empty to delete matches"
                className={`mt-1 w-full ${field}`}
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(event) => setMatchCase(event.target.checked)}
                className="border-edge bg-sunk text-accent focus:ring-accent"
              />
              Match case
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={regex}
                onChange={(event) => setRegex(event.target.checked)}
                className="border-edge bg-sunk text-accent focus:ring-accent"
              />
              Regular expression
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={run}
              disabled={busy || find === ''}
              className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Reading…' : 'Preview Changes'}
            </button>
          </div>

          <p className="mt-3 text-[11px] text-muted">
            Preview checks the text in memory and displays diff context. Nothing is
            written until you download.
            {regex ? ' In regex patterns, $1, $2 reference capture groups.' : ''}
          </p>
        </section>
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

      {rows && (
        <section className="border border-line bg-surface">
          <header className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-medium text-ink">
              {rows.length} {rows.length === 1 ? 'file' : 'files'} would change
            </h2>
            <p className="font-mono text-[11px] text-faint">
              {rows.length === 0
                ? 'Nothing to download.'
                : 'Download updated copies. Originals stay untouched.'}
              {untouched > 0
                ? ` ${untouched} ${untouched === 1 ? 'file had' : 'files had'} no match.`
                : ''}
            </p>
          </header>

          <ul className="divide-y divide-line">
            {rows.map((row, index) => (
              <li
                key={`${row.name}-${index}`}
                className="flex items-start gap-3 px-4 py-2.5 text-xs"
              >
                <FilePreview name={row.name} blob={row.file} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] font-medium text-ink">{row.name}</p>
                  <p className="text-[11px] text-faint">
                    {row.count} {row.count === 1 ? 'match' : 'matches'}
                  </p>
                  {row.preview && (
                    <div className="mt-1 space-y-1 font-mono text-[11px]">
                      <p className="flex items-baseline gap-2">
                        <span className="w-10 shrink-0 bg-sunk px-1 py-0.2 text-[9px] font-medium uppercase text-muted border border-line">
                          before
                        </span>
                        <span className="truncate text-muted">
                          {row.preview.before}
                        </span>
                      </p>
                      <p className="flex items-baseline gap-2">
                        <span className="w-10 shrink-0 bg-good-soft px-1 py-0.2 text-[9px] font-medium uppercase text-good border border-line">
                          after
                        </span>
                        <span className="truncate text-good">
                          {row.preview.after}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[11px] text-faint">
                  {formatSize(row.blob.size)}
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
