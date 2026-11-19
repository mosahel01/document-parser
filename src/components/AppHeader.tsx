import { NavigationMenu, type NavCategory } from './NavigationMenu'
import { MobileNavigation } from './MobileNavigation'
import { ThemeToggle } from './ThemeToggle'

type AppHeaderProps = {
  categories: NavCategory[]
  activeToolId: string
  onSelectTool: (id: string) => void
  onOpenSearch: () => void
  onGoHome: () => void
}

const brandButton = (onGoHome: () => void) => (
  <button
    type="button"
    onClick={onGoHome}
    className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80 cursor-pointer"
    title="Document Toolkit Home"
  >
    <img src="/favicon.svg" alt="" className="size-6 shrink-0" />
    <span className="truncate text-sm font-semibold tracking-tight text-ink">
      Document Toolkit
    </span>
  </button>
)

const controls = (
  activeToolId: string,
  categories: NavCategory[],
  onSelectTool: (id: string) => void,
  onOpenSearch: () => void,
) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={onOpenSearch}
      className="flex items-center gap-2 rounded-[4px] border border-line bg-surface px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-edge hover:bg-hover hover:text-ink cursor-pointer"
      title="Search tools (Ctrl+K or ⌘K)"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline-block rounded-[2px] border border-line bg-sunk px-1 font-mono text-[10px] text-faint">
        ⌘K
      </kbd>
    </button>

    <span className="h-4 w-px bg-line" aria-hidden="true" />

    <ThemeToggle />

    <MobileNavigation
      categories={categories}
      activeToolId={activeToolId}
      onSelectTool={onSelectTool}
      onOpenSearch={onOpenSearch}
    />
  </div>
)

export function AppHeader({
  categories,
  activeToolId,
  onSelectTool,
  onOpenSearch,
  onGoHome,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-xs">
      <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Wide screens: everything on one straight bar */}
        <div className="hidden items-center justify-between gap-4 xl:flex">
          {brandButton(onGoHome)}
          <div className="flex items-center justify-center">
            <NavigationMenu
              categories={categories}
              activeToolId={activeToolId}
              onSelectTool={onSelectTool}
            />
          </div>
          {controls(activeToolId, categories, onSelectTool, onOpenSearch)}
        </div>

        {/* Narrower screens: brand + controls on top, nav folded below */}
        <div className="xl:hidden">
          <div className="flex items-center justify-between gap-3">
            {brandButton(onGoHome)}
            {controls(activeToolId, categories, onSelectTool, onOpenSearch)}
          </div>
          <div className="mt-2 hidden items-center justify-center md:flex">
            <NavigationMenu
              categories={categories}
              activeToolId={activeToolId}
              onSelectTool={onSelectTool}
            />
          </div>
        </div>
      </div>
    </header>
  )
}