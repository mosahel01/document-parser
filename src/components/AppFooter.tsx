import type { NavCategory } from './NavigationMenu'
import { BrandMark, BrandWordmark } from './Brand'

type AppFooterProps = {
  categories: NavCategory[]
  onSelectTool: (id: string) => void
}

const githubIcon = (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.4 9.4 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
  </svg>
)

const xIcon = (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
    <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.23l-4.88-6.38L6.5 22H3.4l7.24-8.28L2.8 2h6.39l4.41 5.83L18.9 2Zm-1.09 17.84h1.72L8.28 3.6H6.43l11.38 16.24Z" />
  </svg>
)

function FooterLinks({
  title,
  items,
  onSelectTool,
}: {
  title: string
  items: { id: string; label: string }[]
  onSelectTool: (id: string) => void
}) {
  return (
    <div className="min-w-0">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
        {title}
      </h2>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={`${title}-${item.id}`}>
            <button
              type="button"
              onClick={() => onSelectTool(item.id)}
              className="cursor-pointer text-left text-[13px] text-[#9ca3af] transition-colors hover:text-white"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AppFooter({ categories, onSelectTool }: AppFooterProps) {
  const pdf = categories.find((category) => category.id === 'pdf')?.items ?? []
  const documents =
    categories.find((category) => category.id === 'documents')?.items ?? []
  const images = categories.find((category) => category.id === 'images')?.items ?? []
  const archive = categories.find((category) => category.id === 'archive')?.items ?? []

  return (
    <footer className="mt-16 bg-[#111827] pb-8 pt-14 text-[#9ca3af]">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="mb-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(4,1fr)]">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2.5">
              <BrandMark className="size-8" />
              <BrandWordmark inverse className="text-xl" />
            </div>
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-white">
              About Us
            </h3>
            <p className="mb-5 max-w-xs text-[13px] leading-relaxed">
              MergePDF is a fast, everyday document toolkit for PDFs, Word
              files, images, and archives — built to handle common file chores
              cleanly in your browser and on our server.
            </p>
            <div className="flex gap-2.5">
              <a
                href="https://github.com/mosahel01/mergepdf"
                target="_blank"
                rel="noreferrer"
                aria-label="Source on GitHub"
                title="Source on GitHub"
                className="flex size-9 items-center justify-center rounded-lg bg-white/[0.08] text-[#9ca3af] transition-colors hover:bg-accent hover:text-white"
              >
                {githubIcon}
              </a>
              <a
                href="https://x.com/mo1sahilkhan"
                target="_blank"
                rel="noreferrer"
                aria-label="Mo Sahil Khan on X"
                title="Mo Sahil Khan on X"
                className="flex size-9 items-center justify-center rounded-lg bg-white/[0.08] text-[#9ca3af] transition-colors hover:bg-accent hover:text-white"
              >
                {xIcon}
              </a>
            </div>
          </div>

          <FooterLinks title="PDF Tools" items={pdf} onSelectTool={onSelectTool} />
          <FooterLinks
            title="Documents"
            items={documents}
            onSelectTool={onSelectTool}
          />
          <FooterLinks
            title="Images & Archive"
            items={[...images, ...archive]}
            onSelectTool={onSelectTool}
          />

          <div className="min-w-0">
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
              MergePDF
            </h2>
            <ul className="space-y-2.5 text-[13px]">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTool('home')}
                  className="cursor-pointer text-left transition-colors hover:text-white"
                >
                  All tools
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/mosahel01/mergepdf"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  Source code
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTool('jsonFormatter')}
                  className="cursor-pointer text-left transition-colors hover:text-white"
                >
                  Developer tools
                </button>
              </li>
              <li>
                <a
                  href="https://x.com/mo1sahilkhan"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/[0.08] pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 MergePDF · mergepdf.com · All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 rounded-md bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              No uploads
            </span>
            <span className="flex items-center gap-1.5 rounded-md bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              100% in-browser
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
