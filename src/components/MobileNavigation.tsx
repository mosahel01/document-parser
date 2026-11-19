import { useEffect, useRef, useState } from 'react'
import type { NavCategory } from './NavigationMenu'

type MobileNavigationProps = {
  categories: NavCategory[]
  activeToolId: string
  onSelectTool: (id: string) => void
  onOpenSearch: () => void
}

export function MobileNavigation({
  categories,
  activeToolId,
  onSelectTool,
  onOpenSearch,
}: MobileNavigationProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <div ref={containerRef} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        className="flex size-8 items-center justify-center rounded-[4px] border border-line bg-surface text-muted hover:border-edge hover:bg-hover hover:text-ink cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {open ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[5px] border border-line bg-surface shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-[3px] p-1 text-muted hover:bg-hover hover:text-ink cursor-pointer"
              aria-label="Close menu"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenSearch()
              }}
              className="flex w-full items-center justify-between rounded-[4px] border border-line bg-sunk px-3 py-2 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Search tools...
              </span>
              <kbd className="font-mono text-[10px] text-faint">⌘K</kbd>
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-3 pb-3 space-y-4">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  <span className="size-3">{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const isSelected = item.id === activeToolId
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectTool(item.id)
                          setOpen(false)
                        }}
                        className={`flex w-full flex-col rounded-[3px] px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-hover text-ink'
                            : 'text-muted hover:bg-hover/60 hover:text-ink'
                        }`}
                      >
                        <span className="text-xs font-medium text-ink">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-faint">
                          {item.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}