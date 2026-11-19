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
    <div className="mb-6 border-b border-line pb-5">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-line bg-surface text-ink">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        {privacyNotice && (
          <div className="shrink-0 self-start">
            <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-line bg-surface px-2.5 py-1 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-good" aria-hidden="true" />
              {privacyNotice}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

