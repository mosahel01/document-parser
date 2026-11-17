import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDrop } from './FileDrop'
import { FilePreview } from './FilePreview'
import { PdfPagePreview } from './PdfPagePreview'
import { PdfPreview } from './PdfPreview'
import { downloadBlob, downloadEach } from '../tools/download'
import { joinedBaseName } from '../tools/rename'
import {
  countPages,
  extractPages,
  mergePdfs,
  parsePageSelection,
  pdfBaseName,
  splitIntoPages,
} from '../tools/pdf'
import { formatSize } from '../lib/format'

type Mode = 'merge' | 'split'

const tabClass = (active: boolean) =>
  `rounded-md px-4 py-1.5 text-sm font-medium ${
    active ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
  }`

export function PdfTool({
  initialFiles,
  initialMode,
}: {
  initialFiles?: File[]
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'merge')

  const [mergeFiles, setMergeFiles] = useState<File[]>(
    initialMode === 'split' ? [] : (initialFiles ?? []),
  )
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

  const [splitFile, setSplitFile] = useState<File | null>(null)
  const [session, setSession] = useState(0)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [range, setRange] = useState('')
  const [busy, setBusy] = useState<'extract' | 'split' | null>(null)
  const [splitError, setSplitError] = useState<string | null>(null)

  /** The finished PDF shown before it is saved, without leaving the page. */
  const [preview, setPreview] = useState<{
    blob: Blob
    name: string
    note: string
  } | null>(null)

  const selection = pageCount === null ? null : parsePageSelection(range, pageCount)

  function moveMergeFile(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= mergeFiles.length) return
    setPreview(null)

    const next = [...mergeFiles]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setMergeFiles(next)
  }

  function chooseMode(next: Mode) {
    setMode(next)
    setPreview(null)
  }

  async function mergeTo(destination: 'download' | 'preview') {
    setMerging(true)
    setMergeError(null)
    try {
      const blob = await mergePdfs(mergeFiles)
      const name = `${joinedBaseName(mergeFiles.map((file) => file.name))}.pdf`

      if (destination === 'download') {
        downloadBlob(blob, name)
      } else {
        setPreview({
          blob,
          name,
          note: `${mergeFiles.length} PDFs, joined in the order above`,
        })
      }
    } catch (problem) {
      setMergeError(
        problem instanceof Error ? problem.message : 'The merge failed.',
      )
    } finally {
      setMerging(false)
    }
  }

  const openForSplit = useCallback(async (file: File) => {
    setSplitFile(file)
    setSession((current) => current + 1)
    setPageCount(null)
    setRange('')
    setSplitError(null)
    setPreview(null)
    try {
      setPageCount(await countPages(file))
    } catch (problem) {
      setSplitError(
        problem instanceof Error ? problem.message : 'That PDF could not be read.',
      )
    }
  }, [])

  // A PDF handed over by the Home screen is opened for splitting on arrival.
  const handedOver = useRef(
    initialMode === 'split' ? (initialFiles?.[0] ?? null) : null,
  )
  useEffect(() => {
    const file = handedOver.current
    if (!file) return
    handedOver.current = null
    void openForSplit(file)
  }, [openForSplit])

  async function extractTo(destination: 'download' | 'preview') {
    if (!splitFile || !selection || selection.error) return
    setBusy('extract')
    setSplitError(null)
    try {
      const blob = await extractPages(splitFile, selection.pages)
      const name = `${pdfBaseName(splitFile.name)}-extracted.pdf`

      if (destination === 'download') {
        downloadBlob(blob, name)
      } else {
        setPreview({
          blob,
          name,
          note: `${selection.pages.length} of ${pageCount ?? 0} pages, in the order you typed`,
        })
      }
    } catch (problem) {
      setSplitError(
        problem instanceof Error ? problem.message : 'Extracting failed.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function splitAll() {
    if (!splitFile) return
    setBusy('split')
    setSplitError(null)
    try {
      const pages = await splitIntoPages(splitFile, pdfBaseName(splitFile.name))
      await downloadEach(
        pages.map((page) => ({ blob: page.blob, name: page.name })),
      )
    } catch (problem) {
      setSplitError(
        problem instanceof Error ? problem.message : 'Splitting failed.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="inline-flex gap-1 rounded-lg border border-edge bg-surface p-1">
        <button
          type="button"
          onClick={() => chooseMode('merge')}
          className={tabClass(mode === 'merge')}
        >
          Merge
        </button>
        <button
          type="button"
          onClick={() => chooseMode('split')}
          className={tabClass(mode === 'split')}
        >
          Split
        </button>
      </div>

      {mode === 'merge' ? (
        <>
          <FileDrop
            onFiles={(incoming) => {
              setMergeFiles([...mergeFiles, ...incoming])
              setPreview(null)
            }}
            accept=".pdf,application/pdf"
            label="Drop the PDFs to combine"
            hint="They are joined in the order shown below."
          />

          {mergeFiles.length > 0 && (
            <section className="rounded-xl border border-line bg-surface">
              <header className="flex items-center justify-between border-b border-line px-5 py-3">
                <h2 className="text-sm font-medium text-ink">
                  {mergeFiles.length}{' '}
                  {mergeFiles.length === 1 ? 'file' : 'files'}, in this order
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setMergeFiles([])
                    setPreview(null)
                  }}
                  className="text-sm text-muted hover:text-ink"
                >
                  Clear all
                </button>
              </header>
              <ul className="divide-y divide-line">
                {mergeFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 px-5 py-2 text-sm"
                  >
                    <span className="w-5 shrink-0 text-faint">
                      {index + 1}.
                    </span>
                    <FilePreview name={file.name} blob={file} />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="shrink-0 text-faint">
                      {formatSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveMergeFile(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${file.name} up`}
                      className="shrink-0 rounded px-1.5 text-faint hover:bg-hover hover:text-ink disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMergeFile(index, 1)}
                      disabled={index === mergeFiles.length - 1}
                      aria-label={`Move ${file.name} down`}
                      className="shrink-0 rounded px-1.5 text-faint hover:bg-hover hover:text-ink disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMergeFiles(
                          mergeFiles.filter((_, position) => position !== index),
                        )
                        setPreview(null)
                      }}
                      aria-label={`Remove ${file.name}`}
                      className="shrink-0 rounded px-2 text-faint hover:bg-hover hover:text-ink"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-line px-5 py-3">
                <p className="text-sm text-muted">
                  {mergeFiles.length < 2
                    ? 'Add at least two PDFs to merge.'
                    : `${mergeFiles.length} PDFs become one.`}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void mergeTo('preview')}
                    disabled={merging || mergeFiles.length < 2}
                    className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink hover:bg-hover disabled:opacity-50"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void mergeTo('download')}
                    disabled={merging || mergeFiles.length < 2}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
                  >
                    {merging ? 'Merging…' : 'Merge and download'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {mergeError && (
            <p className="rounded-xl border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad">
              {mergeError}
            </p>
          )}
        </>
      ) : (
        <>
          <FileDrop
            onFiles={(incoming) => {
              const chosen = incoming[0]
              if (chosen) void openForSplit(chosen)
            }}
            accept=".pdf,application/pdf"
            multiple={false}
            label="Drop the PDF to split"
            hint="You will see every page before choosing."
          />

          {splitError && (
            <p className="rounded-xl border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad">
              {splitError}
            </p>
          )}

          {splitFile && pageCount !== null && (
            <>
              <section className="rounded-xl border border-line bg-surface">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
                  <div>
                    <h2 className="text-sm font-medium text-ink">
                      {splitFile.name}
                    </h2>
                    <p className="text-sm text-muted">
                      {pageCount} {pageCount === 1 ? 'page' : 'pages'},{' '}
                      {formatSize(splitFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitFile(null)
                      setPageCount(null)
                      setPreview(null)
                    }}
                    className="text-sm text-muted hover:text-ink"
                  >
                    Close file
                  </button>
                </header>
                <div className="p-5">
                  <PdfPagePreview key={session} file={splitFile} />
                </div>
              </section>

              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-sm font-medium text-ink">
                  Extract pages
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Page numbers or ranges, separated by commas. Order is kept, so
                  "3, 1" puts page 3 first.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    value={range}
                    onChange={(event) => {
                      setRange(event.target.value)
                      setPreview(null)
                    }}
                    placeholder="1-3, 7"
                    aria-label="Pages to extract"
                    aria-invalid={selection?.error !== null}
                    className="w-48 rounded-lg border border-edge px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                  <button
                    type="button"
                    onClick={() => void extractTo('preview')}
                    disabled={busy !== null || !selection || selection.error !== null}
                    className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink hover:bg-hover disabled:opacity-50"
                  >
                    Preview pages
                  </button>
                  <button
                    type="button"
                    onClick={() => void extractTo('download')}
                    disabled={busy !== null || !selection || selection.error !== null}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
                  >
                    {busy === 'extract' ? 'Extracting…' : 'Extract and download'}
                  </button>
                  <button
                    type="button"
                    onClick={splitAll}
                    disabled={busy !== null}
                    className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink hover:bg-hover disabled:opacity-50"
                  >
                    {busy === 'split' ? 'Splitting…' : 'Split into single pages'}
                  </button>
                </div>

                {selection?.error && range.trim() !== '' && (
                  <p className="mt-2 text-sm text-bad">{selection.error}</p>
                )}
              </section>
            </>
          )}
        </>
      )}

      {preview && (
        <section className="rounded-xl border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <h2 className="text-sm font-medium text-ink">
                {preview.name}
              </h2>
              <p className="text-sm text-muted">
                {preview.note} · {formatSize(preview.blob.size)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => downloadBlob(preview.blob, preview.name)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-sm text-muted hover:text-ink"
              >
                Close preview
              </button>
            </div>
          </header>
          <div className="p-5">
            <PdfPreview blob={preview.blob} title={preview.name} />
            <p className="mt-2 text-xs text-faint">
              If the frame stays blank, your browser will not show PDFs inline.
              Download it to check.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
