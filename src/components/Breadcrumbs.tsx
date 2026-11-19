type BreadcrumbItem = {
  label: string
  onClick?: () => void
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-muted">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-faint select-none">/</span>}
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="hover:text-ink transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'text-ink font-medium' : 'text-muted'}>
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}

