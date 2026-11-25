import { useCallback, useEffect, useRef, useState } from 'react'

const GripIcon = () => (
  <svg viewBox="0 0 10 16" className="size-3.5" fill="currentColor" aria-hidden="true">
    <circle cx="2" cy="2" r="1.2" /><circle cx="8" cy="2" r="1.2" />
    <circle cx="2" cy="8" r="1.2" /><circle cx="8" cy="8" r="1.2" />
    <circle cx="2" cy="14" r="1.2" /><circle cx="8" cy="14" r="1.2" />
  </svg>
)
import { DownloadBar } from './DownloadBar'
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

type Mode = 'merge' | 'extract'

export function PdfTool({
  mode,
  initialFiles,
}: {
  mode: Mode
  initialFiles?: File[]
}) {
  const [mergeFiles, setMergeFiles] = useState<File[]>(
    mode === 'merge' ? (initialFiles ?? []) : [],
  )
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [draggingMerge, setDraggingMerge] = useState<number | null>(null)

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

  function dropMergeOn(targetIndex: number) {
    const fromIndex = draggingMerge
    setDraggingMerge(null)
    if (fromIndex === null || fromIndex === targetIndex) return
    const next = [...mergeFiles]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(targetIndex, 0, moved)
    setMergeFiles(next)
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

  // A PDF handed over by the Home screen is opened for extraction on arrival.
  const handedOver = useRef(
    mode === 'extract' ? (initialFiles?.[0] ?? null) : null,
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
    <div className="space-y-6">
      {mode === 'merge' && (
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
            <section className="border border-line bg-surface">
              <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <h2 className="text-xs font-medium text-ink">
                  {mergeFiles.length}{' '}
                  {mergeFiles.length === 1 ? 'file' : 'files'}, in this order
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setMergeFiles([])
                    setPreview(null)
                  }}
                  className="border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
                >
                  Clear all
                </button>
              </header>
              <ul className="divide-y divide-line">
                {mergeFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    draggable
                    onDragStart={(e) => { setDraggingMerge(index); e.dataTransfer.effectAllowed = 'move' }}
                    onDragEnd={() => setDraggingMerge(null)}
                    onDragOver={(e) => { if (draggingMerge !== null) e.preventDefault() }}
                    onDrop={(e) => { e.preventDefault(); dropMergeOn(index) }}
                    className={`flex items-center gap-3 px-4 py-2 text-xs ${draggingMerge === index ? 'opacity-40' : ''}`}
                  >
                    <button
                      type="button"
                      aria-label={`Drag to reorder ${file.name}`}
                      className="size-6 shrink-0 cursor-grab text-faint hover:text-ink flex items-center justify-center select-none"
                    >
                      <GripIcon />
                    </button>
                    <span className="w-5 shrink-0 font-mono text-[11px] text-faint">
                      {index + 1}.
                    </span>
                    <FilePreview name={file.name} blob={file} />
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{file.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-faint">
                      {formatSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMergeFiles(
                          mergeFiles.filter((_, position) => position !== index),
                        )
                        setPreview(null)
                      }}
                      aria-label={`Remove ${file.name}`}
                      className="size-6 shrink-0 text-faint hover:bg-hover hover:text-ink cursor-pointer"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-end border-t border-line px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => void mergeTo('preview')}
                  disabled={merging || mergeFiles.length < 2}
                  className="border border-line bg-sunk px-3 py-1.5 text-xs font-medium text-ink hover:border-edge disabled:opacity-50 cursor-pointer"
                >
                  Preview
                </button>
              </div>
            </section>
          )}

          {mergeError && (
            <p className="border border-bad/30 bg-bad-soft px-4 py-3 text-xs text-bad">
              {mergeError}
            </p>
          )}

          {mergeFiles.length > 0 && !preview && (
            <DownloadBar
              note={
                mergeFiles.length < 2
                  ? 'Add at least two PDFs to merge.'
                  : `${mergeFiles.length} PDFs become one.`
              }
            >
              <button
                type="button"
                onClick={() => void mergeTo('download')}
                disabled={merging || mergeFiles.length < 2}
                className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
              >
                {merging ? 'Merging…' : 'Merge and download'}
              </button>
            </DownloadBar>
          )}
        </>
      )}

      {mode === 'extract' && (
        <>
          <FileDrop
            onFiles={(incoming) => {
              const chosen = incoming[0]
              if (chosen) void openForSplit(chosen)
            }}
            accept=".pdf,application/pdf"
            multiple={false}
            label="Drop the PDF to extract pages from"
            hint="You will see every page before choosing."
          />

          {splitError && (
            <p className="border border-bad/30 bg-bad-soft px-4 py-3 text-xs text-bad">
              {splitError}
            </p>
          )}

          {splitFile && pageCount !== null && (
            <>
              <section className="border border-line bg-surface">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                  <div>
                    <h2 className="text-xs font-medium text-ink">
                      {splitFile.name}
                    </h2>
                    <p className="font-mono text-[11px] text-faint">
                      {pageCount} {pageCount === 1 ? 'page' : 'pages'} &bull;{' '}
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
                    className="border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
                  >
                    Close file
                  </button>
                </header>
                <div className="p-4">
                  <PdfPagePreview key={session} file={splitFile} />
                </div>
              </section>

              <section className="border border-line bg-surface p-4">
                <h2 className="text-xs font-medium text-ink">
                  Extract pages
                </h2>
                <p className="mt-1 text-[11px] text-muted">
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
                    className="w-48 border border-line bg-sunk px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => void extractTo('preview')}
                    disabled={busy !== null || !selection || selection.error !== null}
                    className="border border-line bg-sunk px-3 py-1.5 text-xs font-medium text-ink hover:border-edge disabled:opacity-50 cursor-pointer"
                  >
                    Preview pages
                  </button>
                </div>

                {selection?.error && range.trim() !== '' && (
                  <p className="mt-2 text-xs text-bad">{selection.error}</p>
                )}
              </section>

              {!preview && (
                <DownloadBar>
                  <button
                    type="button"
                    onClick={splitAll}
                    disabled={busy !== null}
                    className="border border-line bg-surface px-4 py-2 text-xs font-medium text-ink hover:bg-hover disabled:opacity-50 cursor-pointer"
                  >
                    {busy === 'split' ? 'Splitting…' : 'Split into single pages'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void extractTo('download')}
                    disabled={
                      busy !== null || !selection || selection.error !== null
                    }
                    className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
                  >
                    {busy === 'extract' ? 'Extracting…' : 'Extract and download'}
                  </button>
                </DownloadBar>
              )}
            </>
          )}
        </>
      )}

      {preview && (
        <section className="border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <div>
              <h2 className="text-xs font-medium text-ink">
                {preview.name}
              </h2>
              <p className="font-mono text-[11px] text-faint">
                {preview.note} &bull; {formatSize(preview.blob.size)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="border border-line bg-sunk px-2 py-0.5 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
              >
                Close preview
              </button>
            </div>
          </header>
          <div className="p-4">
            <PdfPreview blob={preview.blob} title={preview.name} />
            <p className="mt-2 text-[11px] text-faint">
              If the frame stays blank, your browser will not show PDFs inline.
              Download it to check.
            </p>
          </div>
        </section>
      )}

      {preview && (
        <DownloadBar>
          <button
            type="button"
            onClick={() => downloadBlob(preview.blob, preview.name)}
            className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover cursor-pointer"
          >
            Download {preview.name}
          </button>
        </DownloadBar>
      )}
    </div>
  )
}
