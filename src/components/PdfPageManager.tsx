import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { PdfPreview } from './PdfPreview'
import { downloadBlob } from '../tools/download'
import { joinedBaseName } from '../tools/rename'
import {
  MAX_ARRANGE_PAGES,
  countPages,
  pagesToPdf,
  parsePageSelection,
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
  'border border-line bg-sunk px-2.5 py-1 text-xs text-muted hover:border-edge hover:text-ink disabled:opacity-40 cursor-pointer'

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

  // STEP 2: range input state
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)

  // STEP 3: lightbox state
  const [lightboxId, setLightboxId] = useState<string | null>(null)

  // STEP 4: auto-preview flag
  const autoPreviewPending = useRef(false)

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

  // STEP 3: Close lightbox on Escape key
  useEffect(() => {
    if (lightboxId === null) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightboxId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxId])

  // STEP 4: saveTo as useCallback so we can depend on it safely
  const saveTo = useCallback(
    async (destination: 'download' | 'preview') => {
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
    },
    [book],
  )

  // STEP 4: Auto-preview effect — fires when slots change and the flag is set
  // Keep a ref to saveTo so the effect never goes stale.
  // useLayoutEffect syncs the ref before the browser paints (React-idiomatic).
  const saveToRef = useRef(saveTo)
  useLayoutEffect(() => {
    saveToRef.current = saveTo
  })

  useEffect(() => {
    if (!autoPreviewPending.current) return
    autoPreviewPending.current = false
    void saveToRef.current('preview')
  }, [book.slots])

  function toggle(id: string) {
    // Clear the range input when the user clicks cards manually so the field
    // never shows a stale value that disagrees with the actual selection.
    setRangeInput('')
    setRangeError(null)
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setRangeInput('')
    setRangeError(null)
    setSelected(new Set(book.slots.map((slot) => slot.id)))
  }

  function turnSelected(delta: number) {
    const newCount = book.slots.length
    setBook((current) => ({
      ...current,
      slots: current.slots.map((slot) =>
        selected.has(slot.id)
          ? { ...slot, turn: (slot.turn + delta + 360) % 360 }
          : slot,
      ),
    }))
    if (newCount <= 20) autoPreviewPending.current = true
  }

  function duplicateSelected() {
    const newCount = book.slots.length + selected.size
    setBook((current) => {
      const slots: Slot[] = []
      for (const slot of current.slots) {
        slots.push(slot)
        if (selected.has(slot.id)) slots.push({ ...slot, id: newSlotId() })
      }
      return { ...current, slots }
    })
    if (newCount <= 20) autoPreviewPending.current = true
  }

  function deleteSelected() {
    if (selected.size === 0) return
    const newCount = book.slots.length - selected.size
    setBook((current) => ({
      ...current,
      slots: current.slots.filter((slot) => !selected.has(slot.id)),
    }))
    setSelected(new Set())
    setPreview(null)
    if (newCount > 0 && newCount <= 20) autoPreviewPending.current = true
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

  // STEP 2: Range input handler
  function handleRangeChange(value: string) {
    setRangeInput(value)
    if (value.trim() === '') {
      setRangeError(null)
      return
    }
    const result = parsePageSelection(value, book.slots.length)
    if (result.error === null && result.pages.length > 0) {
      setRangeError(null)
      const ids = new Set(result.pages.map((idx) => book.slots[idx].id))
      setSelected(ids)
    } else if (result.error !== null) {
      setRangeError(result.error)
    }
  }

  const pages = book.slots.length

  // STEP 3: Resolve lightbox slot
  const lbSlot = lightboxId !== null
    ? book.slots.find((s) => s.id === lightboxId)
    : undefined
  const lbIndex = lightboxId !== null
    ? book.slots.findIndex((s) => s.id === lightboxId) + 1
    : 0
  const lbThumb =
    lbSlot !== undefined
      ? thumbs[`${lbSlot.source}:${lbSlot.page + 1}`]
      : undefined

  // If the lightbox slot was deleted while the modal is open, the render guard
  // `lbSlot !== undefined` already hides the modal. No effect needed here.

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
        <p className="border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {pages > 0 && (
        <section className="border border-line bg-surface">
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
              {busy === 'save' && pages <= 20 && (
                <span className="text-xs text-muted">Rebuilding preview…</span>
              )}
              <button
                type="button"
                onClick={() => void saveTo('preview')}
                disabled={busy !== null}
                className="border border-edge px-4 py-2 text-sm font-medium text-ink hover:bg-hover disabled:opacity-50"
              >
                Preview
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
              onClick={() => {
                setSelected(new Set())
                setRangeInput('')
                setRangeError(null)
              }}
              disabled={selected.size === 0}
              className={smallButton}
            >
              Clear
            </button>
            {/* STEP 2: Range input */}
            <span className="text-xs text-muted">Range:</span>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => handleRangeChange(e.target.value)}
              placeholder="1-3, 7"
              className="border border-line bg-sunk px-2 py-1 text-xs text-ink placeholder:text-faint w-24 outline-none focus:border-edge"
            />
            {rangeInput !== '' && (
              <button
                type="button"
                onClick={() => {
                  setRangeInput('')
                  setRangeError(null)
                  setSelected(new Set())
                }}
                className="cursor-pointer px-1 text-faint hover:text-ink"
                aria-label="Clear range"
              >
                ×
              </button>
            )}
            {rangeError !== null && (
              <span className="text-xs text-bad">{rangeError}</span>
            )}
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
                  className={`overflow-hidden border bg-surface ${
                    isSelected
                      ? 'border-accent ring-1 ring-accent'
                      : 'border-line'
                  } ${dragging === slot.id ? 'opacity-40' : ''}`}
                >
                  {/* STEP 3: double-click opens lightbox */}
                  <button
                    type="button"
                    onClick={() => toggle(slot.id)}
                    onDoubleClick={() => setLightboxId(slot.id)}
                    aria-pressed={isSelected}
                    aria-label={`Select ${label}`}
                    className="block w-full"
                  >
                    <span className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-sunk">
                      {thumb ? (
                        // STEP 1: rotate thumbnail with CSS transform
                        <img
                          src={thumb}
                          alt=""
                          draggable={false}
                          className="max-h-full max-w-full object-contain"
                          style={{
                            transform: `rotate(${slot.turn}deg)`,
                            transition: 'transform 0.2s',
                          }}
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
                        aria-label={`Drag to reorder ${label}`}
                        className="px-1 text-faint hover:bg-hover hover:text-ink cursor-grab select-none"
                      >
                        <svg viewBox="0 0 10 16" className="size-3" fill="currentColor" aria-hidden="true">
                          <circle cx="2" cy="2" r="1.2" /><circle cx="8" cy="2" r="1.2" />
                          <circle cx="2" cy="8" r="1.2" /><circle cx="8" cy="8" r="1.2" />
                          <circle cx="2" cy="14" r="1.2" /><circle cx="8" cy="14" r="1.2" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBook((current) => ({
                            ...current,
                            slots: current.slots.map((entry) =>
                              entry.id === slot.id
                                ? { ...entry, turn: (entry.turn + 90) % 360 }
                                : entry,
                            ),
                          }))
                          // STEP 4: auto-preview for per-card rotation
                          if (pages <= 20) autoPreviewPending.current = true
                        }}
                        aria-label={`Turn ${label} a quarter turn`}
                        className="px-1 text-faint hover:bg-hover hover:text-ink"
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
                          // STEP 4: auto-preview for per-card delete
                          if (pages - 1 > 0 && pages - 1 <= 20) {
                            autoPreviewPending.current = true
                          }
                        }}
                        aria-label={`Remove ${label}`}
                        className="px-1 text-faint hover:bg-hover hover:text-ink"
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
        <section className="border border-line bg-surface">
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

      {preview ? (
        <DownloadBar>
          <button
            type="button"
            onClick={() => downloadBlob(preview.blob, preview.name)}
            className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Download
          </button>
        </DownloadBar>
      ) : (
        pages > 0 && (
          <DownloadBar>
            <button
              type="button"
              onClick={() => void saveTo('download')}
              disabled={busy !== null}
              className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {busy === 'save' ? 'Saving…' : 'Save PDF'}
            </button>
          </DownloadBar>
        )
      )}

      {/* STEP 3: Lightbox modal */}
      {lightboxId !== null && lbSlot !== undefined && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLightboxId(null)}
        >
          <div
            className="bg-surface border border-line p-4 flex flex-col gap-3 max-w-[90vw] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-ink">
                Page {lbIndex}
                {lbSlot.turn !== 0 ? ` · ↻${lbSlot.turn}°` : ''}
              </span>
              <button
                type="button"
                onClick={() => setLightboxId(null)}
                className="text-muted hover:text-ink text-sm"
              >
                Close
              </button>
            </div>
            {lbThumb !== undefined ? (
              // At 90° and 270° the image is sideways: its visual height maps to
              // its layout width, so we constrain max-w instead of max-h to
              // prevent the rotated image from overflowing the viewport.
              <div
                className="flex items-center justify-center overflow-hidden"
                style={{
                  // Give the container the rotated image's visual footprint so
                  // the modal does not shrink the image unexpectedly.
                  maxHeight:
                    lbSlot.turn === 90 || lbSlot.turn === 270
                      ? '70vw'
                      : '70vh',
                  maxWidth:
                    lbSlot.turn === 90 || lbSlot.turn === 270
                      ? '70vh'
                      : '70vw',
                }}
              >
                <img
                  src={lbThumb}
                  alt=""
                  className="object-contain"
                  style={{
                    transform: `rotate(${lbSlot.turn}deg)`,
                    maxHeight:
                      lbSlot.turn === 90 || lbSlot.turn === 270
                        ? '70vw'
                        : '70vh',
                    maxWidth:
                      lbSlot.turn === 90 || lbSlot.turn === 270
                        ? '70vh'
                        : '70vw',
                  }}
                />
              </div>
            ) : (
              <span className="text-xs text-muted">No preview</span>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setBook((current) => ({
                    ...current,
                    slots: current.slots.map((s) =>
                      s.id === lightboxId
                        ? { ...s, turn: (s.turn - 90 + 360) % 360 }
                        : s,
                    ),
                  }))
                  if (book.slots.length <= 20) autoPreviewPending.current = true
                }}
                className={smallButton}
              >
                Rotate left
              </button>
              <button
                type="button"
                onClick={() => {
                  setBook((current) => ({
                    ...current,
                    slots: current.slots.map((s) =>
                      s.id === lightboxId
                        ? { ...s, turn: (s.turn + 90) % 360 }
                        : s,
                    ),
                  }))
                  if (book.slots.length <= 20) autoPreviewPending.current = true
                }}
                className={smallButton}
              >
                Rotate right
              </button>
              <button
                type="button"
                onClick={() => {
                  const newCount = book.slots.length - 1
                  setBook((current) => ({
                    ...current,
                    slots: current.slots.filter((s) => s.id !== lightboxId),
                  }))
                  setSelected((current) => {
                    const next = new Set(current)
                    next.delete(lightboxId)
                    return next
                  })
                  setPreview(null)
                  if (newCount > 0 && newCount <= 20) {
                    autoPreviewPending.current = true
                  }
                  setLightboxId(null)
                }}
                className={`${smallButton} hover:border-bad hover:text-bad`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
