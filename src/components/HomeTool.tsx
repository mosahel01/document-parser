import { useState } from 'react'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { ToolCard } from './ToolCard'
import { CategorySection, type CategoryToolItem } from './CategorySection'
import {
  batchOperationsFor,
  groupFiles,
  missingActionNote,
  operationsFor,
  type HomeOperation,
} from '../tools/fileKind'

type HomeToolProps = {
  onStart: (operation: HomeOperation) => void
  onSelectTool?: (toolId: string) => void
  onOpenSearch?: () => void
}

const RECENT_KEY = 'document-toolkit-recent'

export function HomeTool({ onStart, onSelectTool, onOpenSearch }: HomeToolProps) {
  const [files, setFiles] = useState<File[]>([])
  const [recentToolIds, setRecentToolIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 4)
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return []
  })

  function handleSelect(id: string) {
    // Record in recently used
    try {
      const next = [id, ...recentToolIds.filter((t) => t !== id)].slice(0, 6)
      setRecentToolIds(next.slice(0, 4))
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      // Ignore storage errors
    }

    if (onSelectTool) {
      onSelectTool(id)
    } else {
      // Fallback for standalone render
      onStart({
        tool: id as any,
        label: id,
        hint: '',
        files: [],
      })
    }
  }

  const groups = groupFiles(files)
  const batch = batchOperationsFor(files)

  // Popular Tools definition (strictly functional)
  const popularTools: CategoryToolItem[] = [
    {
      id: 'compressPdf',
      title: 'Compress PDF',
      description: 'Shrink scanned PDFs with page rasterization.',
      category: 'PDF',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 14h6m-6-4h6m4-6v16m4-10-4-4-4 4" />
        </svg>
      ),
    },
    {
      id: 'merge',
      title: 'Merge PDF',
      description: 'Combine multiple PDF files into one document.',
      category: 'PDF',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M8 7v10M12 4v16M16 9v6" />
        </svg>
      ),
    },
    {
      id: 'word',
      title: 'PDF to Word',
      description: 'Extract words from a PDF into a clean Word .docx.',
      category: 'Documents',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M9 15l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'imagesToPdf',
      title: 'Images to PDF',
      description: 'Convert multiple photos into a single PDF document.',
      category: 'PDF',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3-3a2 2 0 0 0-3 0L6 21" />
        </svg>
      ),
    },
    {
      id: 'image',
      title: 'Crop & Resize Image',
      description: 'Crop, resize, straighten, and rotate photos.',
      category: 'Images',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />
        </svg>
      ),
    },
    {
      id: 'convert',
      title: 'Image Converter',
      description: 'Convert between PNG, JPG, WebP, and PDF.',
      category: 'Images',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M20 7h-9m0 0 3-3m-3 3 3 3M4 17h9m0 0-3-3m3 3-3 3" />
        </svg>
      ),
    },
    {
      id: 'zip',
      title: 'ZIP Creator & Extractor',
      description: 'Create zip archives or inspect and extract contents.',
      category: 'Archive',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
          <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
          <rect x="3" y="8" width="18" height="8" rx="1" />
          <path d="M10 12h4" />
        </svg>
      ),
    },
    {
      id: 'extractText',
      title: 'Extract Text',
      description: 'Pull pure text from PDF, DOCX, or text files.',
      category: 'Extract',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 6h16M4 12h10M4 18h14" />
        </svg>
      ),
    },
    {
      id: 'jsonFormatter',
      title: 'JSON Formatter',
      description: 'Validate, format, indent, minify, and sort keys.',
      category: 'Developer',
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M8 3H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-1" />
        </svg>
      ),
    },
  ]

  // Category: PDF Tools
  const pdfTools: CategoryToolItem[] = [
    {
      id: 'merge',
      title: 'Merge PDF',
      description: 'Combine multiple PDF files into one ordered document.',
      category: 'PDF',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 7v10M12 4v16M16 9v6" /></svg>,
    },
    {
      id: 'extract',
      title: 'Split & Extract',
      description: 'Pick pages to keep or split each page into its own file.',
      category: 'PDF',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>,
    },
    {
      id: 'organize',
      title: 'Organize Pages',
      description: 'Rotate, reorder, delete, copy, or combine pages from other PDFs.',
      category: 'PDF',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
    },
    {
      id: 'compressPdf',
      title: 'Compress PDF',
      description: 'Shrink scanned PDFs by re-encoding pages at target DPI and quality.',
      category: 'PDF',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 14h6m-6-4h6m4-6v16m4-10-4-4-4 4" /></svg>,
    },
    {
      id: 'crop',
      title: 'Crop Margins',
      description: 'Trim page margins as percentage without altering contents.',
      category: 'PDF',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" /></svg>,
    },
    {
      id: 'number',
      title: 'Page Numbers',
      description: 'Add header or footer page numbers with rotation compensation.',
      category: 'PDF',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4v16h16V4H4Zm6 12V8l-2 2" /></svg>,
    },
    {
      id: 'watermark',
      title: 'Watermark',
      description: 'Stamp custom diagonal text watermark across every page.',
      category: 'PDF',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m3 21 18-18M7 3h14v14" /></svg>,
    },
    {
      id: 'toImages',
      title: 'PDF to Images',
      description: 'Render each page as high-resolution JPG or PNG images.',
      category: 'PDF',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
    },
  ]

  // Category: Image Tools
  const imageTools: CategoryToolItem[] = [
    {
      id: 'image',
      title: 'Crop & Straighten',
      description: 'Drag crop rectangle, free rotate, and resize dimensions.',
      category: 'Images',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" /></svg>,
    },
    {
      id: 'convert',
      title: 'Convert Format',
      description: 'Convert between PNG, JPG, WebP, and single-page A4 PDF.',
      category: 'Images',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 7h-9m0 0 3-3m-3 3 3 3M4 17h9m0 0-3-3m3 3-3 3" /></svg>,
    },
    {
      id: 'imagesToPdf',
      title: 'Photos to PDF',
      description: 'Collate several photos into a structured multi-page PDF.',
      category: 'Images',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m21 15-3-3a2 2 0 0 0-3 0L6 21" /></svg>,
    },
  ]

  // Category: Document Tools
  const documentTools: CategoryToolItem[] = [
    {
      id: 'word',
      title: 'Word (.docx)',
      description: 'Read as HTML/Markdown/Text, convert DOCX to PDF or PDF to DOCX.',
      category: 'Documents',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2Z" /><path d="M14 2v6h6M9 13h6M9 17h3" /></svg>,
    },
    {
      id: 'convert',
      title: 'Convert Documents',
      description: 'Multi-directional conversion between PDF, DOCX, HTML, Markdown, and TXT.',
      category: 'Documents',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 7h-9m0 0 3-3m-3 3 3 3M4 17h9m0 0-3-3m3 3-3 3" /></svg>,
    },
    {
      id: 'extractText',
      title: 'Extract Text',
      description: 'Extract raw text paragraphs from PDF, Word, and text documents.',
      category: 'Documents',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16M4 12h10M4 18h14" /></svg>,
    },
    {
      id: 'replace',
      title: 'Find & Replace',
      description: 'Batch search and replace text or regex patterns across files.',
      category: 'Documents',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2-8h4" /></svg>,
    },
  ]

  // Category: Archive Tools
  const archiveTools: CategoryToolItem[] = [
    {
      id: 'zip',
      title: 'ZIP Creator & Extractor',
      description: 'Pack files into zip archives or inspect and selectively extract entries.',
      category: 'Archive',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 4v16M14 4v16M3 10h18M3 14h18" /></svg>,
    },
    {
      id: 'gzip',
      title: 'GZIP Compressor (.gz)',
      description: 'Compress individual files or decompress .gz archives using RFC 1952.',
      category: 'Archive',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>,
    },
    {
      id: 'rename',
      title: 'Batch Rename',
      description: 'Rename batches with numbering sequences and optional extension conversion.',
      category: 'Archive',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>,
    },
  ]

  // Category: Extraction & OCR
  const extractTools: CategoryToolItem[] = [
    {
      id: 'extractText',
      title: 'Extract Text',
      description: 'Extract all words from PDF, DOCX, and text documents into plain text.',
      category: 'Extract',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16M4 12h10M4 18h14" /></svg>,
    },
    {
      id: 'extract',
      title: 'Extract PDF Pages',
      description: 'Extract specific page selections from a PDF file.',
      category: 'Extract',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>,
    },
    {
      id: 'toImages',
      title: 'Extract PDF as Images',
      description: 'Extract every PDF page as individual JPG or PNG image files.',
      category: 'Extract',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
    },
    {
      id: 'zip',
      title: 'Extract ZIP Archive',
      description: 'Unpack and extract all or selected files from a ZIP archive.',
      category: 'Extract',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" /><rect x="3" y="8" width="18" height="8" rx="1" /></svg>,
    },
  ]

  // Category: Developer Utilities
  const devTools: CategoryToolItem[] = [
    {
      id: 'jsonFormatter',
      title: 'JSON Formatter',
      description: 'Validate syntax, format indent (2/4/tab), minify, and sort keys.',
      category: 'Developer',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 3H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-1" /></svg>,
    },
    {
      id: 'replace',
      title: 'Find & Replace',
      description: 'Batch string and regular expression replacement across code and text files.',
      category: 'Developer',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2-8h4" /></svg>,
    },
    {
      id: 'gzip',
      title: 'GZIP (.gz)',
      description: 'Compress or decompress files using browser CompressionStream.',
      category: 'Developer',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>,
    },
    {
      id: 'rename',
      title: 'Batch Renamer',
      description: 'Rule-based bulk renaming and extension switching.',
      category: 'Developer',
      icon: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>,
    },
  ]

  // Find recently used tools
  const recentTools: CategoryToolItem[] = recentToolIds
    .map((id) => popularTools.find((t) => t.id === id) || pdfTools.find((t) => t.id === id) || devTools.find((t) => t.id === id))
    .filter((t): t is CategoryToolItem => Boolean(t))

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Everything you need to work with files.
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-xs text-muted sm:text-sm">
          Convert, compress, edit and extract files with powerful tools in one place.
        </p>

        {/* Global Search Field Bar */}
        <div className="mx-auto mt-6 max-w-lg">
          <button
            type="button"
            onClick={() => onOpenSearch && onOpenSearch()}
            className="flex w-full items-center justify-between rounded-[5px] border border-line bg-surface px-3.5 py-2.5 text-xs text-muted transition-colors hover:border-edge hover:bg-hover/50 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="size-3.5 text-faint" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Search for any tool or format (e.g. merge, compress, word, json)...
            </span>
            <kbd className="rounded-[2px] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[10px] text-faint">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      {/* Main Drag-and-Drop Area with Privacy Note */}
      <div className="space-y-3">
        <FileDrop
          onFiles={(incoming) => setFiles([...files, ...incoming])}
          label="Drop any file to see available actions"
          hint="Any file type. Its extension decides the options, and nothing is uploaded."
        />

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted">
          <span className="size-1.5 rounded-full bg-good" aria-hidden="true" />
          <span>Local processing: all files stay securely inside your browser.</span>
        </div>
      </div>

      {/* When files are dropped, display contextual operations */}
      {files.length > 0 && (
        <div className="space-y-6 rounded-[5px] border border-line bg-surface/50 p-5">
          <FileList
            files={files}
            onRemove={(index) =>
              setFiles(files.filter((_, position) => position !== index))
            }
            onClear={() => setFiles([])}
          />

          {groups.map((group) => {
            const operations = operationsFor(group)
            const note = missingActionNote(group)

            return (
              <section key={group.kind} className="space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                    Actions for {group.label}
                  </span>
                </div>

                {operations.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {operations.map((operation) => (
                      <button
                        key={`${operation.tool}-${'mode' in operation ? operation.mode : 'only'}`}
                        type="button"
                        onClick={() => onStart(operation)}
                        className="rounded-[4px] border border-edge bg-surface px-4 py-2.5 text-left hover:border-accent hover:bg-hover cursor-pointer"
                      >
                        <span className="block text-xs font-medium text-ink">
                          {operation.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {operation.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {note && <p className="text-xs text-muted">{note}</p>}
              </section>
            )
          })}

          {groups.length > 1 && (
            <p className="text-xs text-muted">
              Mixed types are handled one kind at a time. The actions below take the whole batch.
            </p>
          )}

          {batch.length > 0 && (
            <section className="space-y-3 border-t border-line pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                Actions for Whole Batch
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {batch.map((operation) => (
                  <button
                    key={operation.tool}
                    type="button"
                    onClick={() => onStart(operation)}
                    className="rounded-[4px] border border-edge bg-surface px-4 py-2.5 text-left hover:border-accent hover:bg-hover cursor-pointer"
                  >
                    <span className="block text-xs font-medium text-ink">
                      {operation.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {operation.hint}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Recently Used Tools (if available) */}
      {recentTools.length > 0 && files.length === 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">
              Recently Used
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
            {recentTools.map((tool) => (
              <ToolCard
                key={`recent-${tool.id}`}
                id={tool.id}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                category={tool.category}
                onClick={() => handleSelect(tool.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Popular Tools Grid */}
      {files.length === 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">
              Popular Utilities
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            {popularTools.map((tool) => (
              <ToolCard
                key={`popular-${tool.id}`}
                id={tool.id}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                category={tool.category}
                onClick={() => handleSelect(tool.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Categories Sections */}
      {files.length === 0 && (
        <div className="space-y-10 pt-2">
          {/* PDF Tools */}
          <CategorySection
            title="PDF Tools"
            description="Merge, split, organize, compress, crop, and watermark PDF documents."
            tools={pdfTools}
            onSelectTool={handleSelect}
          />

          {/* Image Tools */}
          <CategorySection
            title="Image Tools"
            description="Edit, crop, resize, convert, and collate photos into PDFs."
            tools={imageTools}
            onSelectTool={handleSelect}
          />

          {/* Document Tools */}
          <CategorySection
            title="Document Tools"
            description="Word DOCX reading and conversion, text extraction, and find & replace."
            tools={documentTools}
            onSelectTool={handleSelect}
          />

          {/* Archive Tools */}
          <CategorySection
            title="Archive Tools"
            description="ZIP archiving and selective inspection, GZIP compression, and batch renaming."
            tools={archiveTools}
            onSelectTool={handleSelect}
          />

          {/* Extraction and OCR */}
          <CategorySection
            title="Extraction & OCR"
            description="Extract text paragraphs, pages, images, and archive contents."
            tools={extractTools}
            onSelectTool={handleSelect}
          />

          {/* Developer Utilities */}
          <CategorySection
            title="Developer Utilities"
            description="JSON validation and formatting, regex find & replace, and file transforms."
            tools={devTools}
            onSelectTool={handleSelect}
          />
        </div>
      )}
    </div>
  )
}
