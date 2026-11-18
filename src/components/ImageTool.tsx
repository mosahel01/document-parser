import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { FileDrop } from './FileDrop'
import { downloadBlob } from '../tools/download'
import { splitExtension } from '../tools/rename'
import {
  MIN_CROP_SIDE,
  clampRect,
  drawTurned,
  editImage,
  matchingSide,
  type ImageFormat,
  type Rect,
  type Turn,
} from '../tools/image'
import { formatSize } from '../lib/format'

const FORMATS: { id: ImageFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpg', label: 'JPG' },
  { id: 'webp', label: 'WebP' },
]

const CORNERS = ['nw', 'ne', 'sw', 'se'] as const
type Corner = (typeof CORNERS)[number]

const CORNER_POSITION: Record<Corner, string> = {
  nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  sw: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  se: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
}

const smallButton =
  'rounded border border-edge px-3 py-1 text-sm text-muted hover:border-accent hover:text-ink disabled:opacity-40'

/** The format to start on, so the common case needs no choice. */
function startFormat(name: string): ImageFormat {
  const extension = splitExtension(name).ext.toLowerCase()
  if (extension === '.jpg' || extension === '.jpeg') return 'jpg'
  if (extension === '.webp') return 'webp'
  return 'png'
}

type Drag =
  | {
      kind: 'move'
      startX: number
      startY: number
      crop: Rect
      scaleX: number
      scaleY: number
    }
  | {
      kind: 'corner'
      corner: Corner
      startX: number
      startY: number
      crop: Rect
      scaleX: number
      scaleY: number
    }
  | { kind: 'new'; fromX: number; fromY: number }

export function ImageTool({ initialFiles }: { initialFiles?: File[] }) {
  const [source, setSource] = useState<File | null>(
    initialFiles?.[0] ?? null,
  )
  const [turn, setTurn] = useState<Turn>(0)
  const [turned, setTurned] = useState<{ width: number; height: number } | null>(
    null,
  )
  const [crop, setCrop] = useState<Rect | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  )
  const [lock, setLock] = useState(true)
  const [format, setFormat] = useState<ImageFormat>(
    startFormat(initialFiles?.[0]?.name ?? ''),
  )
  const [quality, setQuality] = useState(0.9)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<Drag | null>(null)

  // One pass per file and turn: rotate into the visible canvas. Anything that
  // invalidates a chosen crop is cleared by the event that caused it, below.
  useEffect(() => {
    if (!source) return

    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return

    void drawTurned(source, turn, canvas)
      .then((drawn) => {
        if (!cancelled) setTurned({ width: drawn.width, height: drawn.height })
      })
      .catch((problem: unknown) => {
        if (!cancelled) {
          setError(
            problem instanceof Error
              ? problem.message
              : 'That image could not be opened.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [source, turn])

  const bounds = turned ?? { width: 1, height: 1 }
  const activeCrop: Rect = crop ?? {
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height,
  }
  const output = size ?? {
    width: activeCrop.width,
    height: activeCrop.height,
  }

  function pick(file: File) {
    setSource(file)
    setTurn(0)
    setCrop(null)
    setSize(null)
    setTurned(null)
    setError(null)
    setFormat(startFormat(file.name))
    setQuality(0.9)
  }

  /** A crop box does not survive being turned, so both resets happen together. */
  function turnBy(delta: number) {
    setTurn((current) => ((current + delta + 360) % 360) as Turn)
    setCrop(null)
    setSize(null)
    setTurned(null)
  }

  /** Pointer position in pixels of the turned picture. */
  function pointIn(event: ReactPointerEvent): { x: number; y: number } {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }

    const rect = stage.getBoundingClientRect()
    return {
      x: Math.min(
        Math.max(((event.clientX - rect.left) / rect.width) * bounds.width, 0),
        bounds.width,
      ),
      y: Math.min(
        Math.max(((event.clientY - rect.top) / rect.height) * bounds.height, 0),
        bounds.height,
      ),
    }
  }

  function scales(): { scaleX: number; scaleY: number } {
    const stage = stageRef.current
    if (!stage) return { scaleX: 1, scaleY: 1 }

    const rect = stage.getBoundingClientRect()
    return {
      scaleX: bounds.width / rect.width,
      scaleY: bounds.height / rect.height,
    }
  }

  function begin(event: ReactPointerEvent, plan: Drag) {
    event.preventDefault()
    stageRef.current?.setPointerCapture(event.pointerId)
    drag.current = plan
  }

  function startNew(event: ReactPointerEvent) {
    if (event.target !== event.currentTarget) return
    const point = pointIn(event)

    begin(event, { kind: 'new', fromX: point.x, fromY: point.y })
    setCrop({
      x: point.x,
      y: point.y,
      width: Math.min(MIN_CROP_SIDE, bounds.width),
      height: Math.min(MIN_CROP_SIDE, bounds.height),
    })
  }

  function startMove(event: ReactPointerEvent) {
    begin(event, {
      kind: 'move',
      startX: event.clientX,
      startY: event.clientY,
      crop: activeCrop,
      ...scales(),
    })
  }

  function startCorner(event: ReactPointerEvent, corner: Corner) {
    begin(event, {
      kind: 'corner',
      corner,
      startX: event.clientX,
      startY: event.clientY,
      crop: activeCrop,
      ...scales(),
    })
  }

  function move(event: ReactPointerEvent) {
    const plan = drag.current
    if (!plan) return

    if (plan.kind === 'new') {
      const point = pointIn(event)
      setCrop(
        clampRect(
          {
            x: Math.min(plan.fromX, point.x),
            y: Math.min(plan.fromY, point.y),
            width: Math.abs(point.x - plan.fromX),
            height: Math.abs(point.y - plan.fromY),
          },
          bounds,
        ),
      )
      return
    }

    const dx = (event.clientX - plan.startX) * plan.scaleX
    const dy = (event.clientY - plan.startY) * plan.scaleY

    if (plan.kind === 'move') {
      setCrop(
        clampRect(
          {
            ...plan.crop,
            x: plan.crop.x + dx,
            y: plan.crop.y + dy,
          },
          bounds,
        ),
      )
      return
    }

    // The opposite corner stays put, so the box grows from the handle held.
    const { corner, crop: start } = plan
    const left = corner === 'nw' || corner === 'sw'
    const top = corner === 'nw' || corner === 'ne'
    const anchor = {
      x: left ? start.x + start.width : start.x,
      y: top ? start.y + start.height : start.y,
    }
    const moving = {
      x: Math.min(
        Math.max((left ? start.x : start.x + start.width) + dx, 0),
        bounds.width,
      ),
      y: Math.min(
        Math.max((top ? start.y : start.y + start.height) + dy, 0),
        bounds.height,
      ),
    }

    const x = Math.min(anchor.x, moving.x)
    const y = Math.min(anchor.y, moving.y)

    setCrop(
      clampRect(
        {
          x,
          y,
          width: Math.abs(moving.x - anchor.x),
          height: Math.abs(moving.y - anchor.y),
        },
        bounds,
      ),
    )
  }

  function end(event: ReactPointerEvent) {
    drag.current = null
    stageRef.current?.releasePointerCapture(event.pointerId)
  }

  function resize(side: 'width' | 'height', value: number) {
    const natural = { width: activeCrop.width, height: activeCrop.height }
    const target = Number.isFinite(value) ? value : 1

    if (lock) {
      setSize(matchingSide(natural, side, target))
      return
    }

    setSize(
      side === 'width'
        ? { width: Math.max(1, Math.round(target)), height: output.height }
        : { width: output.width, height: Math.max(1, Math.round(target)) },
    )
  }

  async function save() {
    if (!source) return

    setBusy(true)
    setError(null)
    try {
      const blob = await editImage(source, {
        turn,
        crop: activeCrop,
        width: output.width,
        height: output.height,
        format,
        quality,
      })
      const base = splitExtension(source.name).base
      downloadBlob(blob, `${base}-edited.${format}`)
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Saving the photo failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  const lossy = format === 'jpg' || format === 'webp'
  const percent = (value: number, whole: number) =>
    `${(value / Math.max(whole, 1)) * 100}%`

  return (
    <div className="space-y-8">
      <FileDrop
        onFiles={(incoming) => {
          const chosen = incoming[0]
          if (chosen) pick(chosen)
        }}
        accept="image/*"
        multiple={false}
        label="Drop the photo to crop, resize, or rotate"
        hint="PNG, JPG, WebP, GIF, BMP, AVIF, or SVG. Nothing is uploaded."
      />

      {error && (
        <p className="rounded-xl border border-bad/30 bg-bad-soft px-5 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {source && (
        <section className="rounded-xl border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium text-ink">
                {source.name}
              </h2>
              <p className="text-sm text-muted">
                {turned
                  ? `${turned.width} × ${turned.height} px`
                  : 'reading…'}{' '}
                · {formatSize(source.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !turned}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Download'}
            </button>
          </header>

          <div className="space-y-5 p-5">
            <div className="inline-block max-w-full rounded-lg bg-sunk p-2">
              <div
                ref={stageRef}
                onPointerDown={startNew}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                className="relative touch-none select-none overflow-hidden"
              >
                <canvas
                  ref={canvasRef}
                  className="block max-h-[420px] max-w-full"
                />

                {turned && (
                  <div
                    role="presentation"
                    onPointerDown={startMove}
                    style={{
                      left: percent(activeCrop.x, bounds.width),
                      top: percent(activeCrop.y, bounds.height),
                      width: percent(activeCrop.width, bounds.width),
                      height: percent(activeCrop.height, bounds.height),
                    }}
                    className="absolute cursor-move border border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] ring-1 ring-black/30"
                  >
                    {CORNERS.map((corner) => (
                      <span
                        key={corner}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          startCorner(event, corner)
                        }}
                        className={`absolute size-3 rounded-sm border border-black/40 bg-white ${CORNER_POSITION[corner]}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => turnBy(-90)}
                className={smallButton}
              >
                Rotate left
              </button>
              <button
                type="button"
                onClick={() => turnBy(90)}
                className={smallButton}
              >
                Rotate right
              </button>
              <button
                type="button"
                onClick={() => setCrop(null)}
                disabled={crop === null}
                className={smallButton}
              >
                Whole photo
              </button>
              <span className="text-sm text-muted">
                Drag on the photo to crop; drag inside the box to move it.
              </span>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-muted hover:text-ink">
                Set the crop exactly
              </summary>
              <div className="mt-2 flex flex-wrap gap-3">
                {(
                  [
                    ['x', 'Left'],
                    ['y', 'Top'],
                    ['width', 'Width'],
                    ['height', 'Height'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-muted">
                    {label}
                    <input
                      type="number"
                      min={key === 'x' || key === 'y' ? 0 : MIN_CROP_SIDE}
                      value={Math.round(activeCrop[key])}
                      onChange={(event) =>
                        setCrop(
                          clampRect(
                            {
                              ...activeCrop,
                              [key]: Number(event.target.value),
                            },
                            bounds,
                          ),
                        )
                      }
                      className="mt-1 block w-20 rounded-lg border border-edge bg-paper px-2 py-1 text-sm text-ink"
                    />
                  </label>
                ))}
              </div>
            </details>

            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm text-muted">
                Width
                <input
                  type="number"
                  min={1}
                  value={output.width}
                  onChange={(event) =>
                    resize('width', Number(event.target.value))
                  }
                  className="mt-1 block w-24 rounded-lg border border-edge bg-paper px-2 py-1 text-sm text-ink"
                />
              </label>
              <label className="text-sm text-muted">
                Height
                <input
                  type="number"
                  min={1}
                  value={output.height}
                  onChange={(event) =>
                    resize('height', Number(event.target.value))
                  }
                  className="mt-1 block w-24 rounded-lg border border-edge bg-paper px-2 py-1 text-sm text-ink"
                />
              </label>
              <label className="flex items-center gap-2 pb-1 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={lock}
                  onChange={(event) => {
                    setLock(event.target.checked)
                    setSize(null)
                  }}
                />
                Keep the shape
              </label>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="block text-sm text-muted">Save as</span>
                <div className="mt-1 inline-flex gap-1 rounded-lg border border-edge p-1">
                  {FORMATS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormat(option.id)}
                      className={`rounded-md px-3 py-1 text-sm font-medium ${
                        format === option.id
                          ? 'bg-accent text-accent-ink'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {option.label}
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
            </div>

            <p className="text-sm text-muted">
              Output: {output.width} × {output.height} px as{' '}
              {format.toUpperCase()}.
              {crop
                ? ' The crop is cut from the picture you see.'
                : ' Drag on the photo to cut out part of it.'}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
