import { useEffect, useRef, useState, type ReactElement } from 'react'

export type NavItem = {
  id: string
  label: string
  desc: string
  badge?: string
}

export type NavCategory = {
  id: string
  label: string
  /** Fits the same bar on wide screens where the full label is too long. */
  shortLabel?: string
  icon: ReactElement
  items: NavItem[]
}

type NavigationMenuProps = {
  categories: NavCategory[]
  activeToolId: string
  onSelectTool: (id: string) => void
}

export function NavigationMenu({
  categories,
  activeToolId,
  onSelectTool,
}: NavigationMenuProps) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)
  const menuRef = useRef<HTMLElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!openCategoryId) return

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenCategoryId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openCategoryId])

  // Close on Escape
  useEffect(() => {
    if (!openCategoryId) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenCategoryId(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openCategoryId])

  return (
    <nav
      ref={menuRef}
      aria-label="Main navigation"
      className="flex h-16 items-center gap-0.5"
    >
      {categories.map((cat) => {
        const isOpen = openCategoryId === cat.id
        const isActive = cat.items.some((item) => item.id === activeToolId)
        const highlighted = isOpen || isActive

        return (
          <div
            key={cat.id}
            className="relative flex h-full items-center"
            onMouseEnter={() => setOpenCategoryId(cat.id)}
            onMouseLeave={() => setOpenCategoryId(null)}
          >
            <button
              type="button"
              onClick={() => setOpenCategoryId(isOpen ? null : cat.id)}
              aria-label={cat.label}
              aria-expanded={isOpen}
              aria-haspopup="true"
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                highlighted
                  ? 'bg-sunk text-ink'
                  : 'text-muted hover:bg-sunk hover:text-ink'
              }`}
            >
              <span className="whitespace-nowrap">
                {cat.shortLabel ?? cat.label}
              </span>
              <svg
                viewBox="0 0 20 20"
                className={`size-3.5 text-faint transition-transform duration-150 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-40 w-80 rounded-xl border border-line bg-paper p-2 shadow-[0_8px_32px_rgba(0,0,0,0.14)]"
              >
                {cat.items.map((item, index) => {
                  const isSelected = item.id === activeToolId
                  const showDivider = index === Math.ceil(cat.items.length / 2)

                  return (
                    <div key={item.id}>
                      {showDivider && (
                        <div className="my-1.5 h-px bg-line" aria-hidden="true" />
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onSelectTool(item.id)
                          setOpenCategoryId(null)
                        }}
                        className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-accent-soft' : 'hover:bg-sunk'
                        }`}
                      >
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent [&>svg]:size-4">
                          {cat.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-ink">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="rounded-full bg-warn-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warn">
                                {item.badge}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                            {item.desc}
                          </span>
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
