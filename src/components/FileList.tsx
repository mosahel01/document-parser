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
    <section className="overflow-hidden rounded-xl border border-line bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
            Queued files
          </span>
          <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-muted">
            {files.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-accent"
        >
          Clear all
        </button>
      </header>
      <ul className="divide-y divide-line">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="flex items-center gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-surface"
          >
            <div className="shrink-0 overflow-hidden rounded-md">
              <FilePreview name={file.name} blob={file} />
            </div>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">
              {file.name}
            </span>
            <span className="shrink-0 text-[11px] text-faint">
              {formatSize(file.size)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-faint transition-colors hover:bg-accent-soft hover:text-accent"
            >
              &times;
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
