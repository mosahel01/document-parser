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
    <div className="sticky bottom-0 z-10 border-t border-line bg-paper/95 backdrop-blur">
      <div className="flex flex-wrap items-center justify-end gap-3 py-3">
        {note && <p className="mr-auto text-sm text-muted">{note}</p>}
        {children}
      </div>
    </div>
  )
}
