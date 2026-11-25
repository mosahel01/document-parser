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
      className={`group rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors sm:py-9 ${
        isOver
          ? 'border-accent bg-accent-soft'
          : 'border-edge bg-paper hover:border-accent hover:bg-accent-soft/50'
      }`}
    >
      <div
        className={`mx-auto mb-3.5 flex size-12 items-center justify-center rounded-xl transition-colors ${
          isOver
            ? 'bg-accent text-accent-ink'
            : 'bg-accent-soft text-accent group-hover:bg-accent group-hover:text-accent-ink'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <p className="text-base font-bold text-ink">{label}</p>
      {hint && (
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}

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
        className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      >
        Select files
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </label>
    </div>
  )
}
