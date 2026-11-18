import { useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { FilePreview } from './FilePreview'
import { downloadBlob, downloadEach } from '../tools/download'
import {
  TARGET_LABELS,
  commonTargets,
  convertFile,
  type TargetFormat,
} from '../tools/convert'
import { replaceExtension } from '../tools/rename'
import { formatSize } from '../lib/format'

/** What each output is, said plainly enough to choose between them. */
const NOTES: Record<TargetFormat, string> = {
  png: 'Lossless, and transparent areas stay transparent.',
  jpg: 'No transparency: transparent areas turn white.',
  webp: 'Small files, and transparency is kept.',
  pdf: 'Photos get an A4 page each. Word and text become plain paragraphs.',
  docx: 'The words go into a Word file. Layout and images stay behind.',
  html: 'The words as a web page.',
  md: 'The words as Markdown.',
  txt: 'The words as plain text, with no formatting.',
}

type Result = { file: File; blob: Blob; name: string }

export function ConvertTool({ initialFiles }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles ?? [])
  const [picked, setPicked] = useState<TargetFormat>('png')
  const [quality, setQuality] = useState(0.9)

  const [results, setResults] = useState<Result[] | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  // The buttons follow the drop: only formats every file can reach are offered,
  // and a target that is no longer reachable falls back to the first one.
  const targets = commonTargets(files)
  const target = targets.includes(picked) ? picked : (targets[0] ?? null)

  const lossy = target === 'jpg' || target === 'webp'

  async function run() {
    if (!target) return

    setBusy(true)
    setProblems([])
    setResults(null)

    const done: Result[] = []
    const failed: string[] = []

    try {
      // One at a time: a run of large photos would otherwise hold several full
      // canvases in memory at once, and a PDF is read page by page.
      for (const file of files) {
        try {
          done.push({
            file,
            blob: await convertFile(file, target, quality),
            name: replaceExtension(file.name, target),
          })
          setResults([...done])
        } catch (problem) {
          failed.push(
            problem instanceof Error
              ? problem.message
              : 'That file could not be converted.',
          )
        }
      }

      setProblems(failed)
    } finally {
      setBusy(false)
    }
  }

  async function saveAll() {
    if (!results) return
    setSaving(true)
    try {
      await downloadEach(
        results.map((result) => ({ blob: result.blob, name: result.name })),
      )
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setFiles([])
    setResults(null)
    setProblems([])
  }

  return (
    <div className="space-y-8">
      <FileDrop
        onFiles={(incoming) => {
          setFiles([...files, ...incoming])
          setResults(null)
        }}
        label="Drop the files to convert"
        hint="Photos, PDFs, Word documents, or text. Nothing is uploaded."
      />

      <FileList
        files={files}
        onRemove={(index) =>
          setFiles(files.filter((_, position) => position !== index))
        }
        onClear={reset}
      />

      {files.length > 0 && target === null && (
        <p className="rounded-xl border border-line bg-surface px-5 py-3 text-sm text-muted">
          These files have no format in common, so there is nothing all of them
          can become. Convert one kind at a time, for example the photos, then
          the PDFs.
        </p>
      )}

      {files.length > 0 && target !== null && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="block text-sm font-medium text-ink">
                Convert to
              </span>
              <div className="mt-1 inline-flex flex-wrap gap-1 rounded-lg border border-edge p-1">
                {targets.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setPicked(option)
                      setResults(null)
                    }}
                    className={`rounded-md px-3 py-1 text-sm font-medium ${
                      target === option
                        ? 'bg-accent text-accent-ink'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {TARGET_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>

            {lossy && (
              <label className="text-sm text-muted">
                Quality {Math.round(quality * 100)}%
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={5}
                  value={quality * 100}
                  onChange={(event) =>
                    setQuality(Number(event.target.value) / 100)
                  }
                  className="mt-1 block w-40"
                />
              </label>
            )}

            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? 'Converting…' : 'Convert'}
            </button>
          </div>

          <p className="mt-3 text-sm text-muted">
            {NOTES[target]}
            {lossy ? ' Lower quality makes smaller files.' : ''}{' '}
            A file already in {TARGET_LABELS[target]} is saved as it is.
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

      {results && results.length > 0 && (
        <section className="rounded-xl border border-line bg-surface">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-medium text-ink">Converted</h2>
            <p className="text-sm text-muted">
              Saved with the same name and the new extension.
            </p>
          </header>

          <ul className="divide-y divide-line">
            {results.map((result, index) => (
              <li key={`${result.name}-${index}`} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="w-28 shrink-0">
                    <FilePreview
                      name={result.file.name}
                      blob={result.file}
                      variant="wide"
                    />
                    <p className="mt-1 truncate text-xs text-muted">
                      {result.file.name}
                    </p>
                    <p className="text-xs text-faint">
                      {formatSize(result.file.size)}
                    </p>
                  </div>

                  <span className="pt-8 text-faint">→</span>

                  <div className="w-28 shrink-0">
                    <FilePreview
                      name={result.name}
                      blob={result.blob}
                      variant="wide"
                    />
                    <p className="mt-1 truncate text-xs font-medium text-ink">
                      {result.name}
                    </p>
                    <p className="text-xs text-faint">
                      {formatSize(result.blob.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadBlob(result.blob, result.name)}
                    className="ml-auto shrink-0 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    Download
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results && results.length > 0 && (
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
