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
  const menuRef = useRef<HTMLDivElement>(null)

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
    <nav ref={menuRef} aria-label="Main Navigation" className="flex flex-wrap items-center gap-0.5">
      {categories.map((cat) => {
        const isOpen = openCategoryId === cat.id
        const isActive = cat.items.some((item) => item.id === activeToolId)

        return (
          <div key={cat.id} className="relative">
            <button
              type="button"
              onClick={() => setOpenCategoryId(isOpen ? null : cat.id)}
              aria-expanded={isOpen}
              aria-haspopup="true"
              className={`flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                isOpen || isActive
                  ? 'bg-hover text-ink'
                  : 'text-muted hover:bg-hover/60 hover:text-ink'
              }`}
            >
              <span className="size-3.5 text-muted">{cat.icon}</span>
              <span>{cat.label}</span>
              <svg
                viewBox="0 0 24 24"
                className={`size-3 text-faint transition-transform duration-100 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-40 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-[5px] border border-line bg-surface p-1 shadow-xl"
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                  {cat.label} Tools
                </div>
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const isSelected = item.id === activeToolId
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onSelectTool(item.id)
                          setOpenCategoryId(null)
                        }}
                        className={`flex w-full flex-col rounded-[3px] px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-hover text-ink'
                            : 'text-muted hover:bg-hover/60 hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-ink">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="rounded-[2px] bg-sunk px-1 py-0.2 font-mono text-[9px] text-faint border border-line">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-faint">
                          {item.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

