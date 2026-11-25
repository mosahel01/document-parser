import { useEffect, useRef, useState } from 'react'
import type { NavCategory } from './NavigationMenu'
import { BrandMark, BrandWordmark } from './Brand'

type MobileNavigationProps = {
  categories: NavCategory[]
  activeToolId: string
  onSelectTool: (id: string) => void
  onOpenSearch: () => void
}

/**
 * Below the desktop breakpoint the whole top bar folds into this menu. It opens
 * as a full-screen sheet, the same way the reference site handles small
 * screens, so every category is reachable without a cramped dropdown.
 */
export function MobileNavigation({
  categories,
  activeToolId,
  onSelectTool,
  onOpenSearch,
}: MobileNavigationProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Lock the page while the full-screen sheet is open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // If the window grows past the breakpoint, the menu is no longer needed.
  useEffect(() => {
    if (!open) return
    const query = window.matchMedia('(min-width: 768px)')
    function handleChange() {
      if (query.matches) setOpen(false)
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        className="flex size-9 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 text-muted transition-colors hover:text-ink md:hidden"
      >
        <span className={`h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${open ? 'rotate-45 translate-y-[6px]' : ''}`} />
        <span className={`h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
        <span className={`h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${open ? '-rotate-45 -translate-y-[6px]' : ''}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-0 z-50 overflow-y-auto bg-paper p-5 md:hidden"
        >
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onSelectTool('home')
              }}
              className="flex cursor-pointer items-center gap-2.5"
            >
              <BrandMark className="size-8" />
              <BrandWordmark className="text-xl" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              className="cursor-pointer rounded-md p-2 text-2xl leading-none text-muted hover:bg-sunk hover:text-ink"
            >
              ×
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenSearch()
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4 shrink-0 text-faint"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="flex-1 text-left">Search tools…</span>
            <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] text-faint">
              ⌘K
            </kbd>
          </button>

          <div className="mt-6 space-y-6">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 border-b border-line pb-2">
                  <span className="text-accent [&>svg]:size-4">{cat.icon}</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    {cat.label}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {cat.items.map((item) => {
                    const isSelected = item.id === activeToolId
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTool(item.id)
                            setOpen(false)
                          }}
                          className={`flex w-full cursor-pointer flex-col rounded-lg px-2.5 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-accent-soft'
                              : 'hover:bg-sunk'
                          }`}
                        >
                          <span className="text-sm font-semibold text-ink">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-muted">
                            {item.desc}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-line pt-5">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onSelectTool('home')
              }}
              className="w-full cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Browse all tools
            </button>
          </div>
        </div>
      )}
    </>
  )
}
