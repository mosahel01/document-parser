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

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Filter tools based on query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tools.slice(0, 8) // default quick suggestions

    return tools.filter((tool) => {
      if (tool.title.toLowerCase().includes(q)) return true
      if (tool.description.toLowerCase().includes(q)) return true
      if (tool.category.toLowerCase().includes(q)) return true
      if (tool.keywords.some((k) => k.toLowerCase().includes(q))) return true
      return false
    })
  }, [tools, query])

  const safeIndex = selectedIndex >= filtered.length ? 0 : selectedIndex

  // Keyboard navigation
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

  // Scroll active item into view
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex w-full max-w-xl flex-col rounded-[6px] border border-line bg-surface shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <svg
            viewBox="0 0 24 24"
            className="size-4 shrink-0 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
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
            placeholder="Type a command or search tools (e.g. merge, compress, word, json)..."
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-[3px] p-0.5 text-xs text-muted hover:bg-hover hover:text-ink"
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <kbd className="hidden rounded-[3px] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs font-medium text-ink">No tools found matching &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-xs text-muted">
                Try searching for keywords like <span className="text-ink">pdf</span>,{' '}
                <span className="text-ink">convert</span>, <span className="text-ink">zip</span>, or{' '}
                <span className="text-ink">resize</span>.
              </p>
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
                      className={`flex w-full items-center justify-between rounded-[4px] px-3 py-2 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-hover text-ink'
                          : 'text-muted hover:bg-hover/60 hover:text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex size-6 shrink-0 items-center justify-center rounded-[3px] border ${
                            isSelected ? 'border-edge bg-sunk text-ink' : 'border-line text-muted'
                          }`}
                        >
                          {tool.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-medium text-ink">
                              {tool.title}
                            </span>
                            <span className="rounded-[2px] bg-sunk px-1.5 py-0.2 text-[10px] text-faint border border-line">
                              {tool.category}
                            </span>
                            {tool.badge && (
                              <span className="rounded-[2px] bg-warn-soft px-1.5 py-0.2 text-[10px] text-warn border border-line">
                                {tool.badge}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 pl-2">
                        {isSelected && (
                          <span className="font-mono text-[10px] text-faint">↵ Open</span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-faint">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-line bg-sunk px-1 font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="rounded border border-line bg-sunk px-1 font-mono text-[10px]">↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded border border-line bg-sunk px-1 font-mono text-[10px]">↵</kbd> select
            </span>
          </div>
          <span className="font-mono text-[10px]">
            {filtered.length} {filtered.length === 1 ? 'tool' : 'tools'}
          </span>
        </div>
      </div>
    </div>
  )
}
