import { NavigationMenu, type NavCategory } from './NavigationMenu'
import { MobileNavigation } from './MobileNavigation'
import { ThemeToggle } from './ThemeToggle'
import { BrandMark, BrandWordmark } from './Brand'

type AppHeaderProps = {
  categories: NavCategory[]
  activeToolId: string
  onSelectTool: (id: string) => void
  onOpenSearch: () => void
  onGoHome: () => void
}

const searchButton = (onOpenSearch: () => void) => (
  <button
    type="button"
    onClick={onOpenSearch}
    className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-edge hover:bg-surface hover:text-ink"
    title="Search tools (Ctrl+K or ⌘K)"
  >
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
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
    <span className="hidden lg:inline">Search</span>
  </button>
)

export function AppHeader({
  categories,
  activeToolId,
  onSelectTool,
  onOpenSearch,
  onGoHome,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1300px] items-center gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <MobileNavigation
              categories={categories}
              activeToolId={activeToolId}
              onSelectTool={onSelectTool}
              onOpenSearch={onOpenSearch}
            />

            <button
              type="button"
              onClick={onGoHome}
              className="flex cursor-pointer items-center gap-2.5 text-left"
              title="MergePDF home"
            >
              <BrandMark className="size-8 shrink-0" />
              <BrandWordmark className="text-xl" />
            </button>
          </div>

          <div className="ml-2 hidden md:block">
            <NavigationMenu
              categories={categories}
              activeToolId={activeToolId}
              onSelectTool={onSelectTool}
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">{searchButton(onOpenSearch)}</div>
            <ThemeToggle />
          </div>
        </div>
      </header>
  )
}
