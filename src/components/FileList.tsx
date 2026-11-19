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
    <section className="rounded-[5px] border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-faint">
            Queued Files
          </span>
          <span className="rounded-[2px] bg-sunk px-1.5 py-0.2 font-mono text-[10px] text-faint border border-line">
            {files.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted hover:text-ink cursor-pointer"
        >
          Clear all
        </button>
      </header>
      <ul className="divide-y divide-line">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="flex items-center gap-3 px-4 py-2 text-xs"
          >
            <div className="shrink-0">
              <FilePreview name={file.name} blob={file} />
            </div>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">
              {file.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-faint">
              {formatSize(file.size)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
              className="flex size-6 shrink-0 items-center justify-center rounded-[2px] text-faint hover:bg-hover hover:text-ink cursor-pointer"
            >
              &times;
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
