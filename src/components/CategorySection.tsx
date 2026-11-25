import type { ReactElement } from 'react'
import { ToolCard } from './ToolCard'

export type CategoryToolItem = {
  id: string
  title: string
  description: string
  icon: ReactElement
  category?: string
  badge?: string
}

type CategorySectionProps = {
  title: string
  description?: string
  tools: CategoryToolItem[]
  onSelectTool: (id: string) => void
  onViewAll?: () => void
}

export function CategorySection({
  title,
  description,
  tools,
  onSelectTool,
  onViewAll,
}: CategorySectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 size-2 shrink-0 bg-accent" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-faint sm:inline">
            {tools.length} tools
          </span>
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-medium text-muted transition-colors hover:text-accent cursor-pointer"
            >
              View all &rarr;
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            id={tool.id}
            title={tool.title}
            icon={tool.icon}
            category={tool.category}
            badge={tool.badge}
            onClick={() => onSelectTool(tool.id)}
          />
        ))}
      </div>
    </section>
  )
}
