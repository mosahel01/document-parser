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
    <section className="space-y-3">
      <div className="flex items-baseline justify-between border-b border-line pb-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted">
              {description}
            </p>
          )}
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-muted hover:text-ink cursor-pointer"
          >
            View all ({tools.length}) &rarr;
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            id={tool.id}
            title={tool.title}
            description={tool.description}
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

