import { FilePreview } from './FilePreview'
import { formatSize } from '../lib/format'

type FileListProps = {
  files: File[]
  onRemove: (index: number) => void
  onClear: () => void
}

export function FileList({ files, onRemove, onClear }: FileListProps) {
  if (files.length === 0) return null

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-sm font-medium text-ink">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-muted hover:text-ink"
        >
          Clear all
        </button>
      </header>
      <ul className="divide-y divide-line">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="flex items-center gap-3 px-5 py-2 text-sm"
          >
            <FilePreview name={file.name} blob={file} />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="shrink-0 text-faint">
              {formatSize(file.size)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
              className="shrink-0 rounded px-2 text-faint hover:bg-hover hover:text-ink"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
