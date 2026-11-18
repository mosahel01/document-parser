import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDrop } from './FileDrop'
import { PdfPreview } from './PdfPreview'
import { downloadBlob } from '../tools/download'
import { joinedBaseName } from '../tools/rename'
import {
  MAX_ARRANGE_PAGES,
  countPages,
  pagesToPdf,
  pdfBaseName,
  type PageSlot,
} from '../tools/pdf'
import { renderPageThumbs } from '../lib/pdfThumbs'
import { formatSize } from '../lib/format'

/** A slot is a page in the output; `id` tells two copies of one page apart. */
type Slot = PageSlot & { id: string }

type Book = { sources: File[]; slots: Slot[] }

let slotCounter = 0
const newSlotId = () => `slot-${(slotCounter += 1)}`

/** How many pages of one file get a picture; the rest still work, just blank. */
const THUMBS_PER_FILE = 60

const smallButton =
  'rounded border border-edge px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-ink disabled:opacity-40'

/**
 * The page editor: rotate, delete, duplicate, reorder, and pull pages in from
 * another PDF. It builds a fresh document from the slots on save, so the
 * original file is never touched.
 */
export function PdfPageManager({ initialFiles }: { initialFiles?: File[] }) {
  const [book, setBook] = useState<Book>({ sources: [], slots: [] })
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  /** Sources whose thumbnails have been read, so a blank card says why. */
  const [finished, setFinished] = useState<ReadonlySet<number>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState<string | null>(null)
  const [busy, setBusy] = useState<'load' | 'save' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    blob: Blob
    name: string
    note: string
  } | null>(null)

  const rendered = useRef<Set<number>>(new Set())

  const addFiles = useCallback(
    async (incoming: File[]) => {
      if (incoming.length === 0) return
      setBusy('load')
      setError(null)

      const accepted: { file: File; pages: number }[] = []
      let firstProblem: string | null = null

      for (const file of incoming) {
        try {
          accepted.push({ file, pages: await countPages(file) })
        } catch (problem) {
          firstProblem ??=
            problem instanceof Error
              ? problem.message
              : `${file.name} could not be read.`
        }
      }

      const room = MAX_ARRANGE_PAGES - book.slots.length
      const offered = accepted.reduce((total, entry) => total + entry.pages, 0)

      if (offered > room) {
        setError(
          `${offered} pages would go over the ${MAX_ARRANGE_PAGES} page limit, so only the first ${Math.max(room, 0)} were added.`,
        )
      } else if (firstProblem) {
        setError(firstProblem)
      }

      if (accepted.length > 0) {
        setBook((current) => {
          const sources = [...current.sources, ...accepted.map((a) => a.file)]
          const slots = [...current.slots]
          let left = MAX_ARRANGE_PAGES - slots.length

          accepted.forEach((entry, offset) => {
            const source = current.sources.length + offset
            for (let page = 0; page < entry.pages && left > 0; page += 1) {
              slots.push({ id: newSlotId(), source, page, turn: 0 })
              left -= 1
            }
          })

          return { sources, slots }
        })
      }

      setBusy(null)
    },
    [book.slots.length],
  )

  // Files handed over by the Home screen arrive before the first paint of this
  // list, so they are read once, in an effect rather than during render.
  const handedOver = useRef(initialFiles ?? [])
  useEffect(() => {
    const files = handedOver.current
    if (files.length === 0) return
    handedOver.current = []
    void addFiles(files)
  }, [addFiles])

  // One picture per page, read lazily and remembered per source file.
  useEffect(() => {
    let cancelled = false

    async function render() {
      for (let source = 0; source < book.sources.length; source += 1) {
        if (cancelled) return
        if (rendered.current.has(source)) continue

        try {
          await renderPageThumbs(
            book.sources[source],
            THUMBS_PER_FILE,
            (thumb) => {
              // Keys use pdf.js page numbers, which start at 1.
              setThumbs((current) => ({
                ...current,
                [`${source}:${thumb.page}`]: thumb.url,
              }))
            },
            () => cancelled,
          )
        } catch {
          // A page without a picture can still be turned, moved, or removed.
        }

        // Marked only after the pass finished: a cancelled pass (a remount in
        // strict mode, or a file removed mid-render) starts again rather than
        // leaving the first pages blank forever.
        if (!cancelled) {
          rendered.current.add(source)
          setFinished((current) => new Set(current).add(source))
        }
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [book.sources])

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(book.slots.map((slot) => slot.id)))
  }

  function turnSelected(delta: number) {
    setBook((current) => ({
      ...current,
      slots: current.slots.map((slot) =>
        selected.has(slot.id)
          ? { ...slot, turn: (slot.turn + delta + 360) % 360 }
          : slot,
      ),
    }))
  }

  function duplicateSelected() {
    setBook((current) => {
      const slots: Slot[] = []
      for (const slot of current.slots) {
        slots.push(slot)
        if (selected.has(slot.id)) slots.push({ ...slot, id: newSlotId() })
      }
      return { ...current, slots }
    })
  }

  function deleteSelected() {
    if (selected.size === 0) return
    setBook((current) => ({
      ...current,
      slots: current.slots.filter((slot) => !selected.has(slot.id)),
    }))
    setSelected(new Set())
    setPreview(null)
  }

  function moveSlot(id: string, delta: number) {
    setBook((current) => {
      const from = current.slots.findIndex((slot) => slot.id === id)
      const to = from + delta
      if (from < 0 || to < 0 || to >= current.slots.length) return current

      const slots = [...current.slots]
      const [moved] = slots.splice(from, 1)
      slots.splice(to, 0, moved)
      return { ...current, slots }
    })
  }

  function dropOn(targetId: string) {
    const fromId = dragging
    setDragging(null)
    if (!fromId || fromId === targetId) return

    setBook((current) => {
      const from = current.slots.findIndex((slot) => slot.id === fromId)
      const to = current.slots.findIndex((slot) => slot.id === targetId)
      if (from < 0 || to < 0) return current

      const slots = [...current.slots]
      const [moved] = slots.splice(from, 1)
      slots.splice(to, 0, moved)
      return { ...current, slots }
    })
  }

  async function saveTo(destination: 'download' | 'preview') {
    setBusy('save')
    setError(null)
    try {
      const blob = await pagesToPdf(book.sources, book.slots)
      const name =
        book.sources.length === 1
          ? `${pdfBaseName(book.sources[0].name)}-pages.pdf`
          : `${joinedBaseName(book.sources.map((file) => file.name))}.pdf`

      if (destination === 'download') {
        downloadBlob(blob, name)
      } else {
        setPreview({
          blob,
          name,
          note: `${book.slots.length} ${book.slots.length === 1 ? 'page' : 'pages'}, in the order shown`,
        })
      }
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Saving the PDF failed.',
      )
    } finally {
      setBusy(null)
    }
  }

  const pages = book.slots.length

  return (
    <div className="space-y-6">
      <FileDrop
        onFiles={(incoming) => void addFiles(incoming)}
        accept=".pdf,application/pdf"
        label={
          book.sources.length === 0
            ? 'Drop a PDF to edit its pages'
            : 'Drop another PDF to add its pages'
        }
        hint="Rotate, delete, copy, and drag pages into the order you want."
      />

      {error && (
        <p className="rounded-xl border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {pages > 0 && (
        <section className="rounded-xl border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <h2 className="text-sm font-medium text-ink">
                {pages} {pages === 1 ? 'page' : 'pages'}
              </h2>
              <p className="text-sm text-muted">
                {book.sources
                  .map((file) => `${file.name} (${formatSize(file.size)})`)
                  .join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void saveTo('preview')}
                disabled={busy !== null}
                className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink hover:bg-hover disabled:opacity-50"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => void saveTo('download')}
                disabled={busy !== null}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
              >
                {busy === 'save' ? 'Saving…' : 'Save PDF'}
              </button>
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-2">
            <span className="text-sm text-muted">
              {selected.size === 0
                ? 'Click a page to select it, or drag one to move it.'
                : `${selected.size} selected`}
            </span>
            <button
              type="button"
              onClick={() => turnSelected(-90)}
              disabled={selected.size === 0}
              className={smallButton}
            >
              Rotate left
            </button>
            <button
              type="button"
              onClick={() => turnSelected(90)}
              disabled={selected.size === 0}
              className={smallButton}
            >
              Rotate right
            </button>
            <button
              type="button"
              onClick={duplicateSelected}
              disabled={selected.size === 0}
              className={smallButton}
            >
              Copy
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected.size === 0}
              className={`${smallButton} hover:border-bad hover:text-bad`}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={selectAll}
              disabled={selected.size === pages}
              className={smallButton}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              className={smallButton}
            >
              Clear
            </button>
          </div>

          <ul className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-5">
            {book.slots.map((slot, index) => {
              const thumb = thumbs[`${slot.source}:${slot.page + 1}`]
              const isSelected = selected.has(slot.id)
              const label = `page ${index + 1}`

              return (
                <li
                  key={slot.id}
                  draggable
                  onDragStart={(event) => {
                    setDragging(slot.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(event) => {
                    if (dragging) event.preventDefault()
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    dropOn(slot.id)
                  }}
                  className={`overflow-hidden rounded-lg border bg-surface ${
                    isSelected
                      ? 'border-accent ring-1 ring-accent'
                      : 'border-line'
                  } ${dragging === slot.id ? 'opacity-40' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(slot.id)}
                    aria-pressed={isSelected}
                    aria-label={`Select ${label}`}
                    className="block w-full"
                  >
                    <span className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-sunk">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          draggable={false}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-faint">
                          {finished.has(slot.source)
                            ? 'no picture'
                            : 'reading…'}
                        </span>
                      )}
                    </span>
                  </button>

                  <div className="flex items-center justify-between gap-1 border-t border-line px-1.5 py-1">
                    <span className="text-xs text-muted">
                      {index + 1}
                      {slot.turn !== 0 && (
                        <span className="ml-1 text-faint">↻{slot.turn}°</span>
                      )}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveSlot(slot.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${label} left`}
                        className="rounded px-1 text-faint hover:bg-hover hover:text-ink disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlot(slot.id, 1)}
                        disabled={index === book.slots.length - 1}
                        aria-label={`Move ${label} right`}
                        className="rounded px-1 text-faint hover:bg-hover hover:text-ink disabled:opacity-30"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBook((current) => ({
                            ...current,
                            slots: current.slots.map((entry) =>
                              entry.id === slot.id
                                ? { ...entry, turn: (entry.turn + 90) % 360 }
                                : entry,
                            ),
                          }))
                        }
                        aria-label={`Turn ${label} a quarter turn`}
                        className="rounded px-1 text-faint hover:bg-hover hover:text-ink"
                      >
                        ↻
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBook((current) => ({
                            ...current,
                            slots: current.slots.filter(
                              (entry) => entry.id !== slot.id,
                            ),
                          }))
                          setSelected((current) => {
                            const next = new Set(current)
                            next.delete(slot.id)
                            return next
                          })
                          setPreview(null)
                        }}
                        aria-label={`Remove ${label}`}
                        className="rounded px-1 text-faint hover:bg-hover hover:text-ink"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {pages === 0 && book.sources.length > 0 && !error && (
        <p className="text-sm text-muted">
          Every page was removed. Add a PDF to start again.
        </p>
      )}

      {preview && (
        <section className="rounded-xl border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <h2 className="text-sm font-medium text-ink">{preview.name}</h2>
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
          </div>
        </section>
      )}
    </div>
  )
}
