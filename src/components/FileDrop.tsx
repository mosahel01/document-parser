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
 *
 * The button is a `<label>` tied to the input, not a button that calls
 * `input.click()`. The browser opens the picker itself, so nothing on the page
 * sits between the click and the dialog.
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
        // Without preventDefault the browser refuses the drop and opens the file.
        event.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={(event) => {
        // Moving over a child element also fires dragleave, so ignore those.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOver(false)
        }
      }}
      onDrop={handleDrop}
      className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
        isOver
          ? 'border-accent bg-hover'
          : 'border-edge bg-surface'
      }`}
    >
      <p className="font-medium text-ink">{label}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}

      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="peer sr-only"
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? [])
          if (chosen.length > 0) onFiles(chosen)
          // Reset so choosing the same file again still fires a change event.
          event.target.value = ''
        }}
      />
      <label
        htmlFor={id}
        className="mt-4 inline-block cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface"
      >
        Choose files
      </label>
    </div>
  )
}
