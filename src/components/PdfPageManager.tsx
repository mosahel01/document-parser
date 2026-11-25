import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
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
import { cropMarginsAreValid, type CropMargins } from '../lib/pageGeometry'
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
  'rounded-md border border-line bg-sunk px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-edge hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'

const EMPTY_CROP: CropMargins = { top: 5, right: 5, bottom: 5, left: 5 }

const CROP_EDGES: { key: keyof CropMargins; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'right', label: 'Right' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
]

/**
 * One page as it will be seen. Rotation is applied on the square frame, so a
 * quarter turn always fits without guessing the page's aspect ratio. A crop is
 * shown as a dashed window with everything outside it shaded, which is exactly
 * what the finished page keeps.
 */
function PageView({
  thumb,
  turn,
  crop,
  large = false,
}: {
  thumb?: string
  turn: number
  crop?: CropMargins
  large?: boolean
}) {
  return (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-sunk">
      {thumb ? (
        <img
          src={thumb}
          alt=""
          draggable={false}
          className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out"
          style={{ transform: `rotate(${turn}deg)` }}
        />
      ) : (
        <span className={large ? 'text-sm text-faint' : 'text-xs text-faint'}>
          no picture
        </span>
      )}

      {crop && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute border-2 border-dashed border-accent"
          style={{
            top: `${crop.top}%`,
            right: `${crop.right}%`,
            bottom: `${crop.bottom}%`,
            left: `${crop.left}%`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
          }}
        />
      )}
    </div>
  )
}

/**
 * The page editor: rotate, delete, duplicate, reorder, crop, and pull pages in
 * from another PDF. Pages can be picked one at a time, all at once, or by a
 * typed range, and a large preview follows the chosen page while it is changed.
 * It builds a fresh document from the slots on save, so the original file is
 * never touched.
 */
export function PdfPageManager({ initialFiles }: { initialFiles?: File[] }) {
  const [book, setBook] = useState<Book>({ sources: [], slots: [] })
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  /** Sources whose thumbnails have been read, so a blank card says why. */
  const [finished, setFinished] = useState<ReadonlySet<number>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  /** The page shown in the large preview; the last one clicked or selected. */
  const [active, setActive] = useState<string | null>(null)
  const [range, setRange] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState<CropMargins>(EMPTY_CROP)
  const [cropError, setCropError] = useState<string | null>(null)
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

  /** Keep the big preview on a page that the next action will change. */
  function focusSelection() {
    if (active && selected.has(active)) return
    const first = book.slots.find((slot) => selected.has(slot.id))
    if (first) setActive(first.id)
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)

    setSelected(next)
    setActive(next.has(id) ? id : (next.values().next().value ?? active))
    setPreview(null)
  }

  function selectAll() {
    const ids = book.slots.map((slot) => slot.id)
    setSelected(new Set(ids))
    setActive(ids[0] ?? null)
    setRangeError(null)
    setPreview(null)
  }

  function clearSelection() {
    setSelected(new Set())
    setRangeError(null)
    setPreview(null)
  }

  /** The typed "1-3, 7" route, read against the output page order. */
  function selectRange(event: FormEvent) {
    event.preventDefault()
    const parsed = parsePageSelection(range, book.slots.length)
    if (parsed.error) {
      setRangeError(parsed.error)
      return
    }

    const ids = parsed.pages
      .map((index) => book.slots[index]?.id)
      .filter((id): id is string => id !== undefined)

    setSelected(new Set(ids))
    setActive(ids[0] ?? null)
    setRangeError(null)
    setPreview(null)
  }

  function turnSelected(delta: number) {
    if (selected.size === 0) return
    focusSelection()
    setBook((current) => ({
      ...current,
      slots: current.slots.map((slot) =>
        selected.has(slot.id)
          ? { ...slot, turn: (slot.turn + delta + 360) % 360 }
          : slot,
      ),
    }))
    setPreview(null)
  }

  function duplicateSelected() {
    if (selected.size === 0) return
    setBook((current) => {
      const slots: Slot[] = []
      for (const slot of current.slots) {
        slots.push(slot)
        if (selected.has(slot.id)) slots.push({ ...slot, id: newSlotId() })
      }
      return { ...current, slots }
    })
    setPreview(null)
  }

  function deleteSelected() {
    if (selected.size === 0) return
    setBook((current) => ({
      ...current,
      slots: current.slots.filter((slot) => !selected.has(slot.id)),
    }))
    setSelected(new Set())
    setActive(null)
    setPreview(null)
  }

  function applyCrop() {
    if (selected.size === 0) return
    if (!cropMarginsAreValid(crop)) {
      setCropError(
        'Margins must be zero or more, and opposite sides together cannot reach 100%.',
      )
      return
    }

    focusSelection()
    setBook((current) => ({
      ...current,
      slots: current.slots.map((slot) =>
        selected.has(slot.id) ? { ...slot, crop: { ...crop } } : slot,
      ),
    }))
    setCropError(null)
    setPreview(null)
  }

  function removeCrop() {
    if (selected.size === 0) return
    setBook((current) => ({
      ...current,
      slots: current.slots.map((slot) => {
        if (!selected.has(slot.id)) return slot
        const next = { ...slot }
        delete next.crop
        return next
      }),
    }))
    setCropError(null)
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
    setPreview(null)
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
    setPreview(null)
  }

  function removeSlot(id: string) {
    setBook((current) => ({
      ...current,
      slots: current.slots.filter((entry) => entry.id !== id),
    }))
    setSelected((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
    setActive((current) => (current === id ? null : current))
    setPreview(null)
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
  const activeSlot =
    book.slots.find((slot) => slot.id === active) ??
    book.slots.find((slot) => selected.has(slot.id)) ??
    book.slots[0]
  const activeIndex = activeSlot
    ? book.slots.findIndex((slot) => slot.id === activeSlot.id)
    : -1
  const activeThumb = activeSlot
    ? thumbs[`${activeSlot.source}:${activeSlot.page + 1}`]
    : undefined
  const activeReady =
    activeSlot !== undefined && finished.has(activeSlot.source)

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
        hint="Rotate, crop, delete, copy, and drag pages into the order you want."
      />

      {error && (
        <p className="rounded-lg border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {pages > 0 && (
        <section className="overflow-hidden rounded-xl border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                {pages} {pages === 1 ? 'page' : 'pages'}
              </h2>
              <p className="text-xs text-muted">
                {book.sources
                  .map((file) => `${file.name} (${formatSize(file.size)})`)
                  .join(', ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveTo('preview')}
              disabled={busy !== null}
              className={smallButton}
            >
              Preview result
            </button>
          </header>

          <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-5">
            <div className="min-w-0 space-y-4">
              {/* Three ways to pick pages: click, all, or a typed range. */}
              <div className="space-y-2 rounded-lg border border-line bg-paper p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                    Select pages
                  </span>
                  <span className="text-xs text-muted">click any page</span>
                  <button type="button" onClick={selectAll} className={smallButton}>
                    Select all
                  </button>
                  <form
                    onSubmit={selectRange}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      value={range}
                      onChange={(event) => {
                        setRange(event.target.value)
                        setRangeError(null)
                      }}
                      placeholder="1-3, 7"
                      aria-label="Page numbers or ranges to select"
                      aria-invalid={rangeError !== null}
                      className="w-28 rounded-md border border-line bg-sunk px-2.5 py-1 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    <button type="submit" className={smallButton}>
                      Select range
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selected.size === 0}
                    className={smallButton}
                  >
                    Clear
                  </button>
                  <span className="ml-auto text-xs text-muted">
                    {selected.size === 0
                      ? 'Nothing selected'
                      : `${selected.size} of ${pages} selected`}
                  </span>
                </div>
                {rangeError && <p className="text-xs text-bad">{rangeError}</p>}
              </div>

              {/* Actions act on the picked pages and update the preview at once. */}
              <div className="flex flex-wrap items-center gap-2">
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
                  onClick={() => {
                    if (!cropOpen && activeSlot?.crop) setCrop(activeSlot.crop)
                    setCropError(null)
                    setCropOpen((open) => !open)
                  }}
                  disabled={selected.size === 0}
                  className={smallButton}
                >
                  Crop…
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
              </div>

              {cropOpen && (
                <div className="space-y-3 rounded-lg border border-line bg-paper p-3">
                  <div>
                    <h3 className="text-xs font-semibold text-ink">
                      Crop the selected pages
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Percentages are taken from each page as it is seen, so a
                      sideways page is trimmed on its visible edges.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    {CROP_EDGES.map((edge) => (
                      <label key={edge.key} className="text-xs text-muted">
                        {edge.label} %
                        <input
                          type="number"
                          min={0}
                          max={45}
                          step={1}
                          value={crop[edge.key]}
                          onChange={(event) => {
                            setCrop({
                              ...crop,
                              [edge.key]: Number(event.target.value),
                            })
                            setCropError(null)
                          }}
                          className="mt-1 block w-20 rounded-md border border-line bg-sunk px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                        />
                      </label>
                    ))}
                    <button type="button" onClick={applyCrop} className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-accent-ink transition-colors hover:bg-accent-hover cursor-pointer">
                      Apply crop
                    </button>
                    <button type="button" onClick={removeCrop} className={smallButton}>
                      Remove crop
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCropOpen(false)
                        setCropError(null)
                      }}
                      className="text-xs text-muted underline hover:text-ink cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  {cropError && <p className="text-xs text-bad">{cropError}</p>}
                </div>
              )}

              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {book.slots.map((slot, index) => {
                  const thumb = thumbs[`${slot.source}:${slot.page + 1}`]
                  const isSelected = selected.has(slot.id)
                  const isActive = activeSlot?.id === slot.id
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
                      className={`overflow-hidden rounded-lg border bg-paper transition-shadow ${
                        isSelected
                          ? 'border-accent ring-1 ring-accent'
                          : isActive
                            ? 'border-edge'
                            : 'border-line'
                      } ${dragging === slot.id ? 'opacity-40' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(slot.id)}
                        aria-pressed={isSelected}
                        aria-label={`Select ${label}`}
                        className="block w-full cursor-pointer"
                      >
                        {thumb ? (
                          <PageView thumb={thumb} turn={slot.turn} crop={slot.crop} />
                        ) : (
                          <span className="flex aspect-square items-center justify-center bg-sunk text-xs text-faint">
                            {finished.has(slot.source) ? 'no picture' : 'reading…'}
                          </span>
                        )}
                      </button>

                      <div className="flex items-center justify-between gap-1 border-t border-line px-2 py-1.5">
                        <span className="text-xs text-muted">
                          {index + 1}
                          {slot.turn !== 0 && (
                            <span className="ml-1 text-faint">↻{slot.turn}°</span>
                          )}
                          {slot.crop && (
                            <span className="ml-1 text-accent" title="Cropped">
                              ✂
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveSlot(slot.id, -1)}
                            disabled={index === 0}
                            aria-label={`Move ${label} left`}
                            className="rounded px-1 text-faint hover:bg-hover hover:text-ink disabled:opacity-30 cursor-pointer"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSlot(slot.id, 1)}
                            disabled={index === book.slots.length - 1}
                            aria-label={`Move ${label} right`}
                            className="rounded px-1 text-faint hover:bg-hover hover:text-ink disabled:opacity-30 cursor-pointer"
                          >
                            →
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActive(slot.id)
                              setBook((current) => ({
                                ...current,
                                slots: current.slots.map((entry) =>
                                  entry.id === slot.id
                                    ? {
                                        ...entry,
                                        turn: (entry.turn + 90) % 360,
                                      }
                                    : entry,
                                ),
                              }))
                              setPreview(null)
                            }}
                            aria-label={`Turn ${label} a quarter turn`}
                            className="rounded px-1 text-faint hover:bg-hover hover:text-ink cursor-pointer"
                          >
                            ↻
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSlot(slot.id)}
                            aria-label={`Remove ${label}`}
                            className="rounded px-1 text-faint hover:bg-hover hover:text-ink cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* A big, live view of the page being worked on. */}
            <aside className="order-first self-start rounded-xl border border-line bg-paper p-3 lg:order-last lg:sticky lg:top-24">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                  Preview
                </span>
                {activeSlot && (
                  <span className="text-xs text-muted">
                    Page {activeIndex + 1} of {pages}
                  </span>
                )}
              </div>

              {activeSlot ? (
                <>
                  <PageView
                    thumb={activeThumb}
                    turn={activeSlot.turn}
                    crop={activeSlot.crop}
                    large
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">
                    {activeSlot.turn === 0
                      ? 'Not turned'
                      : `Turned ${activeSlot.turn}° clockwise`}
                    {activeSlot.crop
                      ? ` · cropped ${activeSlot.crop.top}% top, ${activeSlot.crop.right}% right, ${activeSlot.crop.bottom}% bottom, ${activeSlot.crop.left}% left`
                      : ' · not cropped'}
                  </p>
                  {!activeThumb && (
                    <p className="mt-1 text-[11px] text-faint">
                      {activeReady
                        ? 'No picture for this page, but the changes still save.'
                        : `Reading ${book.sources[activeSlot.source]?.name ?? 'the file'}…`}
                    </p>
                  )}
                  {selected.size > 1 && (
                    <p className="mt-1 text-[11px] text-faint">
                      {selected.size} pages are selected. This preview shows one;
                      every selected page gets the same change.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted">No page selected.</p>
              )}
            </aside>
          </div>
        </section>
      )}

      {pages === 0 && book.sources.length > 0 && !error && (
        <p className="text-sm text-muted">
          Every page was removed. Add a PDF to start again.
        </p>
      )}

      {preview && (
        <section className="overflow-hidden rounded-xl border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">{preview.name}</h2>
              <p className="text-xs text-muted">
                {preview.note} · {formatSize(preview.blob.size)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-xs font-medium text-muted hover:text-ink cursor-pointer"
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
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover cursor-pointer"
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
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {busy === 'save' ? 'Saving…' : 'Save PDF'}
            </button>
          </DownloadBar>
        )
      )}
    </div>
  )
}
