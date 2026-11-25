import type { ReactElement } from 'react'
import { Breadcrumbs } from './Breadcrumbs'

type ToolHeaderProps = {
  title: string
  description: string
  category: string
  icon?: ReactElement
  onGoHome?: () => void
  onGoCategory?: () => void
  privacyNotice?: string
}

export function ToolHeader({
  title,
  description,
  category,
  icon,
  onGoHome,
  onGoCategory,
  privacyNotice = 'Local processing • 0 bytes uploaded',
}: ToolHeaderProps) {
  const breadcrumbItems = [
    { label: 'Home', onClick: onGoHome },
    { label: category, onClick: onGoCategory },
    { label: title },
  ]

  return (
    <div className="mb-8 border-b border-line pb-6">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <div className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent [&>svg]:size-5">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
              {category}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {description}
            </p>
          </div>
        </div>

        {privacyNotice && (
          <div className="shrink-0 self-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-good/30 bg-good-soft px-3 py-1.5 text-[11px] font-medium text-good">
              <span className="size-1.5 rounded-full bg-good" aria-hidden="true" />
              {privacyNotice}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
