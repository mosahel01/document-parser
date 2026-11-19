import { useId, useState, type DragEvent } from 'react'

type FileDropProps = {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  label?: string
  hint?: string
}

/**
 * A drop zone plus a hidden file input. Both routes end in the same callback,
 * so callers never care how the files arrived.
 */
export function FileDrop({
  onFiles,
  accept,
  multiple = true,
  label = 'Drop files here',
  hint,
}: FileDropProps) {
  const id = useId()
  const [isOver, setIsOver] = useState(false)

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsOver(false)
    const dropped = Array.from(event.dataTransfer.files)
    if (dropped.length > 0) {
      onFiles(multiple ? dropped : dropped.slice(0, 1))
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOver(false)
        }
      }}
      onDrop={handleDrop}
      className={`rounded-[5px] border border-dashed p-8 text-center transition-colors ${
        isOver
          ? 'border-accent bg-hover/80'
          : 'border-edge bg-surface/80 hover:border-line hover:bg-hover/30'
      }`}
    >
      <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-[3px] border border-line bg-sunk text-muted">
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <p className="text-xs font-medium text-ink">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}

      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="peer sr-only"
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? [])
          if (chosen.length > 0) onFiles(chosen)
          event.target.value = ''
        }}
      />
      <label
        htmlFor={id}
        className="mt-3.5 inline-block cursor-pointer rounded-[4px] border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-edge hover:bg-hover peer-focus-visible:ring-1 peer-focus-visible:ring-accent"
      >
        Browse files
      </label>
    </div>
  )
}
