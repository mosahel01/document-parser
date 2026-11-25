type BreadcrumbItem = {
  label: string
  onClick?: () => void
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-faint"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="select-none text-line" aria-hidden="true">
                /
              </span>
            )}
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="transition-colors hover:text-accent cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={isLast ? 'font-medium text-ink' : 'text-muted'}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
