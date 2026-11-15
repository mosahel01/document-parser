import { useRef, useState, type DragEvent } from 'react'

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
  const inputRef = useRef<HTMLInputElement>(null)
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
          ? 'border-slate-900 bg-slate-100'
          : 'border-slate-300 bg-white'
      }`}
    >
      <p className="font-medium text-slate-900">{label}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Choose files
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? [])
          if (chosen.length > 0) onFiles(chosen)
          // Reset so choosing the same file again still fires a change event.
          event.target.value = ''
        }}
      />
    </div>
  )
}
