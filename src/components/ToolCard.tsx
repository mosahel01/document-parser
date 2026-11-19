import type { ReactElement } from 'react'

export type ToolCardProps = {
  id: string
  title: string
  description: string
  icon: ReactElement
  category?: string
  badge?: string
  onClick: () => void
}

export function ToolCard({
  title,
  description,
  icon,
  category,
  badge,
  onClick,
}: ToolCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col justify-between rounded-[5px] border border-line bg-surface p-3.5 text-left transition-colors hover:border-edge hover:bg-hover/60 cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex size-7 items-center justify-center rounded-[3px] border border-line bg-sunk text-ink transition-colors group-hover:border-edge">
            {icon}
          </div>
          <div className="flex items-center gap-1.5">
            {category && (
              <span className="rounded-[2px] bg-sunk px-1.5 py-0.5 font-mono text-[9px] text-faint border border-line">
                {category}
              </span>
            )}
            {badge && (
              <span className="rounded-[2px] bg-warn-soft px-1.5 py-0.5 font-mono text-[9px] text-warn border border-line">
                {badge}
              </span>
            )}
          </div>
        </div>

        <h3 className="mt-2.5 text-xs font-semibold text-ink transition-colors group-hover:text-ink">
          {title}
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-muted line-clamp-2">
          {description}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-end text-[10px] text-faint group-hover:text-ink">
        <span className="font-mono">Open &rarr;</span>
      </div>
    </button>
  )
}

