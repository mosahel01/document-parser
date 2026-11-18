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
  'rounded-lg border border-edge bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25'

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
    <div className="space-y-8">
      <FileDrop
        onFiles={addFiles}
        accept={TEXT_ACCEPT}
        label="Drop the text files to change"
        hint="Text formats only: txt, md, csv, json, html, css, code, srt, svg. The file picker is filtered to match."
      />

      {skipped.length > 0 && (
        <p className="rounded-xl border border-warn/30 bg-warn-soft px-5 py-3 text-sm text-warn">
          Skipped {skipped.length} {skipped.length === 1 ? 'file' : 'files'}{' '}
          this tool cannot rewrite: {skipped.join(', ')}. PDFs, Word files, and
          images hold no plain text to search.
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
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Find
              <input
                value={find}
                onChange={(event) => setFind(event.target.value)}
                placeholder={regex ? 'cost:\\s*\\d+' : 'Acme Ltd'}
                className={`mt-1 w-full ${field}`}
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Replace with
              <input
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                placeholder="leave empty to delete"
                className={`mt-1 w-full ${field}`}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(event) => setMatchCase(event.target.checked)}
              />
              Match case
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={regex}
                onChange={(event) => setRegex(event.target.checked)}
              />
              Regular expression
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
            <p className="font-medium">Before you replace</p>
            <p className="mt-1">
              This rewrites the text inside the {files.length}{' '}
              {files.length === 1 ? 'file' : 'files'} above. Your originals stay
              as they are; each download is a new copy you choose to keep.
            </p>
            {find !== '' && replacement === '' && (
              <p className="mt-1 font-medium">
                The replacement is empty, so every match will be deleted.
              </p>
            )}
            {regex && (
              <p className="mt-1">
                A pattern is applied as typed. Check it on one file first if it
                is long.
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={run}
              disabled={busy || find === ''}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? 'Reading…' : 'Preview changes'}
            </button>
          </div>

          <p className="mt-3 text-sm text-muted">
            Preview checks the text in memory and shows the change; nothing is
            written until you download a copy. Files keep their own names.
            {regex ? ' In a pattern, $1 stands for the first bracketed group.' : ''}
          </p>
        </section>
      )}

      {problems.length > 0 && (
        <ul className="space-y-2">
          {problems.map((problem) => (
            <li
              key={problem}
              className="rounded-xl border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad"
            >
              {problem}
            </li>
          ))}
        </ul>
      )}

      {rows && (
        <section className="rounded-xl border border-line bg-surface">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-medium text-ink">
              {rows.length} {rows.length === 1 ? 'file' : 'files'} would change
            </h2>
            <p className="text-sm text-muted">
              {rows.length === 0
                ? 'Nothing to download.'
                : 'Download the copies you want. Your originals stay untouched.'}
              {untouched > 0
                ? ` ${untouched} ${untouched === 1 ? 'file had' : 'files had'} no match and would not change.`
                : ''}
            </p>
          </header>

          <ul className="divide-y divide-line">
            {rows.map((row, index) => (
              <li
                key={`${row.name}-${index}`}
                className="flex items-start gap-3 px-5 py-3 text-sm"
              >
                <FilePreview name={row.name} blob={row.file} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{row.name}</p>
                  <p className="text-xs text-muted">
                    {row.count} {row.count === 1 ? 'match' : 'matches'}
                  </p>
                  {row.preview && (
                    <div className="mt-1 space-y-1 font-mono text-xs">
                      <p className="flex items-baseline gap-2">
                        <span className="w-9 shrink-0 rounded bg-hover px-1 text-[0.7rem] font-medium uppercase text-muted">
                          now
                        </span>
                        <span className="truncate text-muted">
                          {row.preview.before}
                        </span>
                      </p>
                      <p className="flex items-baseline gap-2">
                        <span className="w-9 shrink-0 rounded bg-good-soft px-1 text-[0.7rem] font-medium uppercase text-good">
                          after
                        </span>
                        <span className="truncate text-good">
                          {row.preview.after}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-faint">
                  {formatSize(row.blob.size)}
                </span>
                <button
                  type="button"
                  onClick={() => downloadBlob(row.blob, row.name)}
                  className="shrink-0 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
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
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Download all'}
          </button>
        </DownloadBar>
      )}
    </div>
  )
}
