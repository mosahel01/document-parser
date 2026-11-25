import type { CSSProperties, ReactElement } from 'react'

export type ToolCardProps = {
  id: string
  title: string
  icon: ReactElement
  category?: string
  badge?: string
  onClick?: () => void
  comingSoon?: boolean
}

export function ToolCard({
  title,
  icon,
  category,
  badge,
  onClick,
  comingSoon = false,
}: ToolCardProps) {
  const style = {
    '--card-color': 'var(--accent)',
    '--card-bg': 'var(--accent-soft)',
  } as CSSProperties

  const body = (
    <>
      <span
        className="absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ backgroundColor: 'var(--card-color)' }}
        aria-hidden="true"
      />

      {badge && (
        <span
          className={`absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] ${
            comingSoon
              ? 'bg-warn-soft text-warn'
              : 'bg-good-soft text-good'
          }`}
        >
          {badge}
        </span>
      )}

      <span
        className="mx-auto mb-3.5 flex size-14 shrink-0 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:-translate-y-0.5 [&>svg]:size-7"
        style={{
          backgroundColor: 'var(--card-bg)',
          color: 'var(--card-color)',
        }}
      >
        {icon}
      </span>

      <h3 className="text-sm font-bold leading-snug text-ink">{title}</h3>
      {category && <span className="sr-only">{category}</span>}
    </>
  )

  if (comingSoon) {
    return (
      <div
        aria-disabled="true"
        style={style}
        className="relative flex h-full flex-col overflow-hidden rounded-[10px] border-[1.5px] border-dashed border-line bg-surface/40 px-5 pb-6 pt-7 text-center opacity-75"
      >
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[10px] border-[1.5px] border-line bg-paper px-5 pb-6 pt-7 text-center transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
    >
      {body}
    </button>
  )
}
