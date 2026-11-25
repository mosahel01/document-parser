import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react'

export type SearchableTool = {
  id: string
  title: string
  category: string
  description: string
  keywords: string[]
  icon: ReactElement
  badge?: string
}

type GlobalSearchProps = {
  isOpen: boolean
  onClose: () => void
  onSelectTool: (toolId: string) => void
  tools: SearchableTool[]
}

export function GlobalSearch({
  isOpen,
  onClose,
  onSelectTool,
  tools,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 40)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tools.slice(0, 10)

    return tools.filter((tool) => {
      if (tool.title.toLowerCase().includes(q)) return true
      if (tool.description.toLowerCase().includes(q)) return true
      if (tool.category.toLowerCase().includes(q)) return true
      if (tool.keywords.some((k) => k.toLowerCase().includes(q))) return true
      return false
    })
  }, [tools, query])

  const safeIndex = selectedIndex >= filtered.length ? 0 : selectedIndex

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filtered[safeIndex]
        if (selected) {
          onSelectTool(selected.id)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filtered, safeIndex, onSelectTool, onClose])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.children[safeIndex] as HTMLElement | undefined
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [safeIndex])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search tools"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 backdrop-blur-xs sm:pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-lg">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <svg
            viewBox="0 0 24 24"
            className="size-4 shrink-0 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search tools..."
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-hover hover:text-ink"
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No tools matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul ref={listRef} className="space-y-0.5">
              {filtered.map((tool, index) => {
                const isSelected = index === safeIndex
                return (
                  <li key={tool.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTool(tool.id)
                        onClose()
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-accent-soft text-ink'
                          : 'text-muted hover:bg-sunk hover:text-ink'
                      }`}
                    >
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? 'bg-accent text-accent-ink'
                            : 'bg-sunk text-muted'
                        }`}
                      >
                        {tool.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">
                            {tool.title}
                          </span>
                          <span className="rounded-full bg-sunk px-2 py-0.5 text-[10px] font-medium text-muted">
                            {tool.category}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
