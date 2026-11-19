import type { ReactNode } from 'react'

/**
 * The save control for a tool, pinned to the bottom of the window while the
 * tool is on screen. A long list of results must never scroll the download out
 * of reach, so every tool puts its main download here instead of in a header.
 */
export function DownloadBar({
  note,
  children,
}: {
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 -mb-8 mt-8 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-xs sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted">
          {note}
        </div>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  )
}
