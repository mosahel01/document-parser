import { useState, type ReactElement } from 'react'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { ToolCard } from './ToolCard'
import { BrandMark } from './Brand'
import {
  batchOperationsFor,
  groupFiles,
  missingActionNote,
  operationsFor,
  type HomeOperation,
} from '../tools/fileKind'

type HomeToolProps = {
  onStart: (operation: HomeOperation) => void
  onSelectTool: (toolId: string) => void
  onOpenSearch?: () => void
  initialFilter?: string
}

type ToolTag =
  | 'pdf'
  | 'images'
  | 'documents'
  | 'archive'
  | 'extract'
  | 'developer'

type HomeToolItem = {
  id: string
  title: string
  description: string
  category: string
  tags: ToolTag[]
  icon: ReactElement
  color: string
  backgroundColor: string
  popular?: boolean
  soon?: boolean
  badge?: string
}

const filters = [
  { id: 'all', label: 'All tools' },
  { id: 'popular', label: 'Popular' },
  { id: 'pdf', label: 'PDF' },
  { id: 'images', label: 'Images' },
  { id: 'documents', label: 'Documents' },
  { id: 'archive', label: 'Archive' },
  { id: 'extract', label: 'Extract' },
  { id: 'developer', label: 'Developer' },
  { id: 'soon', label: 'Coming soon' },
] as const

type FilterId = (typeof filters)[number]['id']

/**
 * One card per tool. Cross-listed tools carry several tags so the filter row
 * can offer the same grouping the old category sections did without repeating
 * the same card in the default view.
 */
const catalog: HomeToolItem[] = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine PDFs in the order you want with the easiest PDF merger available.',
    category: 'PDF',
    tags: ['pdf'],
    popular: true,
    color: '#e2173a',
    backgroundColor: '#fff0f2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M9 3v6h12M9 3l6 6" />
      </svg>
    ),
  },
  {
    id: 'extract',
    title: 'Split PDF',
    description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
    category: 'PDF',
    tags: ['pdf', 'extract'],
    popular: true,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M2 12h20" />
      </svg>
    ),
  },
  {
    id: 'organize',
    title: 'Organize PDF',
    description: 'Sort, rotate, delete and reorder PDF pages with drag-and-drop ease.',
    category: 'PDF',
    tags: ['pdf'],
    color: '#8b5cf6',
    backgroundColor: '#ede9fe',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="6" height="4" rx="1" />
        <rect x="2" y="10" width="6" height="4" rx="1" />
        <rect x="2" y="17" width="6" height="4" rx="1" />
        <path d="M10 5h12M10 12h12M10 19h12" />
      </svg>
    ),
  },
  {
    id: 'compressPdf',
    title: 'Compress PDF',
    description: 'Reduce file size while optimizing for maximal PDF quality.',
    category: 'PDF',
    tags: ['pdf'],
    popular: true,
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8M7 3v5h8" />
      </svg>
    ),
  },
  {
    id: 'crop',
    title: 'Crop PDF',
    description: 'Trim margins from every page without altering the contents.',
    category: 'PDF',
    tags: ['pdf'],
    color: '#10b981',
    backgroundColor: '#d1fae5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
  },
  {
    id: 'number',
    title: 'Add Page Numbers',
    description: 'Add page numbers into PDFs with ease. Choose your position and typography.',
    category: 'PDF',
    tags: ['pdf'],
    color: '#e2173a',
    backgroundColor: '#fff0f2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 10h.01M15 10h.01M12 10h.01M12 14h.01M6 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h.01M15 14h.01" />
        <rect x="3" y="4" width="18" height="16" rx="2" />
      </svg>
    ),
  },
  {
    id: 'watermark',
    title: 'Watermark PDF',
    description: 'Stamp text over your PDF in seconds. Choose the typography, transparency and position.',
    category: 'PDF',
    tags: ['pdf'],
    color: '#06b6d4',
    backgroundColor: '#ecfeff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: 'toImages',
    title: 'PDF to JPG',
    description: 'Convert each PDF page into a JPG or extract all images from a PDF.',
    category: 'PDF',
    tags: ['pdf', 'extract'],
    color: '#e2173a',
    backgroundColor: '#fff0f2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    id: 'imagesToPdf',
    title: 'JPG to PDF',
    description: 'Convert images to PDF in seconds. Easily adjust orientation and margins.',
    category: 'Images',
    tags: ['pdf', 'images'],
    popular: true,
    color: '#10b981',
    backgroundColor: '#d1fae5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    id: 'image',
    title: 'Crop Image',
    description: 'Drag a crop box, straighten, rotate, and resize photos with precision.',
    category: 'Images',
    tags: ['images'],
    popular: true,
    color: '#8b5cf6',
    backgroundColor: '#ede9fe',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
  },
  {
    id: 'convert',
    title: 'Convert Files',
    description: 'Convert between PNG, JPG, WebP, PDF, Word, HTML, Markdown, and text.',
    category: 'Documents',
    tags: ['images', 'documents'],
    popular: true,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7h-9m0 0 3-3m-3 3 3 3M4 17h9m0 0-3-3m3 3-3 3" />
      </svg>
    ),
  },
  {
    id: 'word',
    title: 'Word to PDF',
    description: 'Read DOCX files, or move the words between Word and PDF in either direction.',
    category: 'Documents',
    tags: ['documents'],
    popular: true,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    id: 'extractText',
    title: 'Extract Text',
    description: 'Pull text paragraphs from PDF, DOCX, and text files in one click.',
    category: 'Documents',
    tags: ['documents', 'extract'],
    color: '#06b6d4',
    backgroundColor: '#ecfeff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h10M4 18h14" />
      </svg>
    ),
  },
  {
    id: 'replace',
    title: 'Find & Replace',
    description: 'Search and replace text or regular expressions across several files.',
    category: 'Documents',
    tags: ['documents', 'developer'],
    color: '#8b5cf6',
    backgroundColor: '#ede9fe',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2-8h4" />
      </svg>
    ),
  },
  {
    id: 'zip',
    title: 'Zip / Unzip',
    description: 'Pack files into a zip archive or inspect and extract its contents.',
    category: 'Archive',
    tags: ['archive', 'extract'],
    popular: true,
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
        <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
        <rect x="3" y="8" width="18" height="8" rx="1" />
        <path d="M10 12h4" />
      </svg>
    ),
  },
  {
    id: 'gzip',
    title: 'Gzip',
    description: 'Compress single files into .gz archives, or unpack existing ones.',
    category: 'Archive',
    tags: ['archive', 'developer'],
    color: '#10b981',
    backgroundColor: '#d1fae5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    ),
  },
  {
    id: 'rename',
    title: 'Batch Rename',
    description: 'Rename files with numbering and optional extension conversion.',
    category: 'Archive',
    tags: ['archive', 'developer'],
    color: '#e2173a',
    backgroundColor: '#fff0f2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
  {
    id: 'jsonFormatter',
    title: 'JSON Formatter',
    description: 'Validate, format, indent (2/4/tab), minify, and sort keys in JSON.',
    category: 'Developer',
    tags: ['developer'],
    color: '#374151',
    backgroundColor: '#f3f4f6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-1" />
      </svg>
    ),
  },
  {
    id: 'unlockPdf',
    title: 'Unlock PDF',
    description: 'Remove PDF password security, giving you the freedom to use your PDFs as you want.',
    category: 'PDF',
    tags: ['pdf'],
    soon: true,
    badge: 'Soon',
    color: '#e2173a',
    backgroundColor: '#fff0f2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    ),
  },
  {
    id: 'protectPdf',
    title: 'Protect PDF',
    description: 'Protect PDF files with a password. Encrypt documents to prevent unauthorized access.',
    category: 'PDF',
    tags: ['pdf'],
    soon: true,
    badge: 'Soon',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: 'ocrPdf',
    title: 'OCR PDF',
    description: 'Easily convert scanned PDF into searchable and selectable documents.',
    category: 'PDF',
    tags: ['pdf', 'extract'],
    soon: true,
    badge: 'Soon',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8h10M7 12h6M7 16h8" />
      </svg>
    ),
  },
  {
    id: 'signPdf',
    title: 'Sign PDF',
    description: 'Draw, type or upload your signature to electronically sign documents.',
    category: 'PDF',
    tags: ['pdf'],
    soon: true,
    badge: 'Soon',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    id: 'repairPdf',
    title: 'Repair PDF',
    description: 'Repair a damaged PDF and recover data from corrupt PDF files.',
    category: 'PDF',
    tags: ['pdf'],
    soon: true,
    badge: 'Soon',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5Z" />
      </svg>
    ),
  },
  {
    id: 'redactPdf',
    title: 'Redact PDF',
    description: 'Permanently remove sensitive text and images from a document.',
    category: 'PDF',
    tags: ['pdf'],
    soon: true,
    badge: 'Soon',
    color: '#e2173a',
    backgroundColor: '#fff0f2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a17.8 17.8 0 0 1-3.1 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3 7 10 7a10.4 10.4 0 0 0 4.2-.9" />
      </svg>
    ),
  },
  {
    id: 'pdfToPowerPoint',
    title: 'PDF to PowerPoint',
    description: 'Turn your PDF files into easy-to-edit PPT and PPTX slideshows.',
    category: 'Documents',
    tags: ['pdf', 'documents'],
    soon: true,
    badge: 'Soon',
    color: '#f97316',
    backgroundColor: '#fff7ed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    id: 'pdfToExcel',
    title: 'PDF to Excel',
    description: 'Pull data straight from PDFs into Excel spreadsheets in a few seconds.',
    category: 'Documents',
    tags: ['pdf', 'documents'],
    soon: true,
    badge: 'Soon',
    color: '#10b981',
    backgroundColor: '#d1fae5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
      </svg>
    ),
  },
  {
    id: 'scanToPdf',
    title: 'Scan to PDF',
    description: 'Capture documents with your phone camera and convert them to PDF.',
    category: 'PDF',
    tags: ['pdf', 'images'],
    soon: true,
    badge: 'Soon',
    color: '#10b981',
    backgroundColor: '#d1fae5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    id: 'htmlToPdf',
    title: 'HTML to PDF',
    description: 'Convert webpages in HTML to PDF. Copy and paste the URL of the page.',
    category: 'Documents',
    tags: ['documents'],
    soon: true,
    badge: 'Soon',
    color: '#8b5cf6',
    backgroundColor: '#ede9fe',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
]

const steps = [
  {
    title: 'Drop your file',
    body: 'Pick a PDF, photo, Word document, text file, or archive. Nothing is uploaded.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    title: 'Choose an action',
    body: 'The file type decides which tools appear, so nothing is silently ignored.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    title: 'Download the result',
    body: 'Check the preview, then save the finished file. The original is never changed.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    title: 'Files stay with you',
    body: 'There is no server copy to delete. Close the tab and nothing remains.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
]

function ActionButton({
  operation,
  onStart,
}: {
  operation: HomeOperation
  onStart: (operation: HomeOperation) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onStart(operation)}
      className="group flex cursor-pointer flex-col rounded-xl border border-line bg-paper px-4 py-3 text-left transition-colors hover:border-accent hover:bg-accent-soft"
    >
      <span className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
        {operation.label}
        <svg
          viewBox="0 0 24 24"
          className="size-3.5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
      <span className="mt-1 text-[11px] leading-snug text-muted">
        {operation.hint}
      </span>
    </button>
  )
}

export function HomeTool({ onStart, onSelectTool, initialFilter }: HomeToolProps) {
  const [files, setFiles] = useState<File[]>([])
  const [filter, setFilter] = useState<FilterId>(() => {
    const valid = filters.find((f) => f.id === initialFilter)
    return valid ? valid.id : 'all'
  })

  const groups = groupFiles(files)
  const batch = batchOperationsFor(files)

  const visibleTools = catalog.filter((tool) => {
    if (filter === 'all') return true
    if (filter === 'popular') return tool.popular === true
    if (filter === 'soon') return tool.soon === true
    return tool.tags.includes(filter)
  })

  const availableCount = catalog.filter((tool) => !tool.soon).length

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * The main call to action should behave like the reference upload modal:
   * scroll the drop zone into view and open the file picker in the same click.
   */
  function openPicker() {
    const section = document.getElementById('drop-files')
    section?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      section?.querySelector<HTMLInputElement>('input[type="file"]')?.click()
    }, 250)
  }

  return (
    <div>
      {/* Hero */}
      <section className="hero-wash border-b border-line/60">
        <div className="mx-auto max-w-[900px] px-5 pb-10 pt-12 text-center sm:pb-12 sm:pt-16">
          <span className="mb-5 inline-block rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
            🔒 Private by design — no uploads
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[54px]">
            Every PDF tool you will
            <br />
            <span className="text-accent">ever need.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
            Merge, split, compress, convert, rotate, watermark and edit PDFs
            with just a few clicks — free, online, and entirely in your browser.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-7 py-3 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Start for free
            </button>
            <button
              type="button"
              onClick={() => scrollTo('tools')}
              className="inline-flex cursor-pointer items-center rounded-lg border-2 border-accent px-7 py-3 text-sm font-bold text-accent transition-colors hover:bg-accent-soft"
            >
              Browse all tools
            </button>
          </div>
        </div>
      </section>

      {/* File-first drop zone */}
      <section
        id="drop-files"
        className="scroll-mt-24 border-b border-line bg-surface py-6 sm:py-8"
      >
        <div className="mx-auto max-w-[1000px] px-5">
          <div className="rounded-2xl border border-line bg-paper p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:p-4">
            <FileDrop
              onFiles={(incoming) => setFiles([...files, ...incoming])}
              label="Drop a file to see what it can become"
              hint="PDFs, photos, Word documents, text files, or archives. Every action runs on your device."
            />

            {files.length > 0 && (
              <div className="mt-5 space-y-5">
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
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                          Actions for {group.label}
                        </span>
                      </div>

                      {operations.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {operations.map((operation) => (
                            <ActionButton
                              key={`${operation.tool}-${'mode' in operation ? operation.mode : 'only'}`}
                              operation={operation}
                              onStart={onStart}
                            />
                          ))}
                        </div>
                      )}

                      {note && <p className="text-xs text-muted">{note}</p>}
                    </section>
                  )
                })}

                {groups.length > 1 && (
                  <p className="text-xs text-muted">
                    Mixed types are handled one kind at a time. The actions below
                    take the whole batch.
                  </p>
                )}

                {batch.length > 0 && (
                  <section className="space-y-3 border-t border-line pt-5">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                      <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                      Actions for the whole batch
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {batch.map((operation) => (
                        <ActionButton
                          key={operation.tool}
                          operation={operation}
                          onStart={onStart}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tool directory */}
      <section id="tools" className="scroll-mt-24 pb-20 pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="mb-12 text-center">
            <h2 className="text-[clamp(24px,3.5vw,36px)] font-extrabold tracking-[-0.03em] text-ink">
              All PDF Tools
            </h2>
            <p className="mx-auto mt-3 max-w-[500px] text-base leading-relaxed text-muted">
              Everything you need to work with PDFs in one place. All tools are
              fast, reliable, and secure.
            </p>
          </div>

          <div className="mb-9 flex flex-wrap justify-center gap-2">
            {filters.map((item) => {
              const selected = item.id === filter
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={selected}
                  className={`cursor-pointer rounded-full border-[1.5px] px-[18px] py-[8px] text-[13px] font-semibold transition-colors ${
                    selected
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-line bg-paper text-muted hover:border-accent hover:text-accent'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
            {visibleTools.map((tool) => (
              <ToolCard
                key={tool.id}
                id={tool.id}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                category={tool.category}
                color={tool.color}
                backgroundColor={tool.backgroundColor}
                badge={tool.soon ? 'Soon' : 'Free'}
                comingSoon={tool.soon}
                onClick={tool.soon ? undefined : () => onSelectTool(tool.id)}
              />
            ))}
          </div>

          {visibleTools.some((tool) => tool.soon) && (
            <p className="mt-8 text-center text-xs leading-relaxed text-muted">
              <span className="font-semibold text-ink">Coming soon</span> means the
              browser cannot do it alone yet. These tools need a server or a
              heavier engine, and they are planned rather than available now.
            </p>
          )}
        </div>
      </section>

      {/* Feature banner */}
      <section className="bg-gradient-to-r from-accent to-[#ff5272] py-14 text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-8 px-5 text-center md:flex-row md:text-left">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">
              Work smarter with MergePDF
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/90">
              No account, no upload, no waiting in a queue. Your files are
              processed on your own device, which makes every task private and
              instant.
            </p>
          </div>
          <button
            type="button"
            onClick={openPicker}
            className="shrink-0 cursor-pointer rounded-lg bg-white px-7 py-3 text-sm font-bold text-accent transition-colors hover:bg-accent-soft"
          >
            Get started free
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
              Process any PDF in a few simple steps — no installation, no
              sign-up, and no upload.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-white [&>svg]:size-5">
                  {step.icon}
                </div>
                <div className="mx-auto mb-2 flex size-7 items-center justify-center rounded-full border border-line bg-paper text-xs font-extrabold text-accent">
                  {index + 1}
                </div>
                <h3 className="text-sm font-bold text-ink">{step.title}</h3>
                <p className="mx-auto mt-1.5 max-w-[230px] text-xs leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-line py-14">
        <div className="mx-auto grid max-w-[1000px] grid-cols-2 gap-8 px-5 text-center md:grid-cols-4">
          {[
            { value: String(availableCount), label: 'tools ready to use' },
            { value: '100%', label: 'processed on your device' },
            { value: '0', label: 'bytes uploaded' },
            { value: '$0', label: 'free, with no account' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-extrabold tracking-[-0.03em] text-accent sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-1.5 text-xs text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-12 px-5 lg:flex-row lg:gap-16">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">
              Your privacy and security come first
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              The safest file is the one that never leaves your device. Every
              tool here runs in the browser, so there is no server copy, no
              upload, and nothing left behind.
            </p>
            <div className="mt-7 flex flex-col gap-5">
              {[
                {
                  title: 'No upload',
                  body: 'Your files never travel over the network. The work happens in this tab.',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                },
                {
                  title: 'No account needed',
                  body: 'There is nothing to sign up for and no profile to maintain.',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ),
                },
                {
                  title: 'No storage',
                  body: 'Close the tab and the files are gone. There is no bucket to clean up.',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  ),
                },
                {
                  title: 'Open and inspectable',
                  body: 'The tools are plain browser code, so the handling is visible rather than promised.',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                    </svg>
                  ),
                },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent [&>svg]:size-5">
                    {feature.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{feature.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {feature.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl border-[1.5px] border-line bg-surface p-8">
            <div className="flex size-40 items-center justify-center rounded-full border-2 border-accent bg-gradient-to-br from-accent-soft to-paper">
              <svg
                viewBox="0 0 24 24"
                className="size-[72px] text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-5">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
              Start for free. There is no paid tier today, and the roadmap below
              is clearly marked as planned.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="relative rounded-2xl border-[1.5px] border-accent bg-paper px-7 py-8 shadow-[0_0_0_3px_rgba(226,23,58,0.08)]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-white">
                Free forever
              </span>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Free
              </div>
              <div className="mt-2 flex items-start gap-0.5">
                <span className="mt-2 text-xl font-bold text-ink">$</span>
                <span className="text-4xl font-extrabold tracking-[-0.03em] text-ink">0</span>
                <span className="mt-3 text-sm text-muted">/mo</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Every browser tool, every file. No credit card and no account.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  'All available PDF tools',
                  'Files up to 100 MB',
                  'Unlimited use',
                  'No uploads or accounts',
                  'Local processing',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-xs text-ink">
                    <span className="text-accent">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={openPicker}
                className="mt-7 w-full cursor-pointer rounded-lg bg-accent px-4 py-3 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-hover"
              >
                Start now
              </button>
            </div>

            <div className="rounded-2xl border-[1.5px] border-line bg-paper px-7 py-8 opacity-90">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Planned
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
                Not yet
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Server-backed extras that a browser cannot honestly do alone.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  'Faithful Word to PDF',
                  'OCR for scans',
                  'Unlock and protect',
                  'Repair and redact',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-xs text-faint">
                    <span className="text-faint">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                className="mt-7 w-full cursor-not-allowed rounded-lg border-2 border-line px-4 py-3 text-sm font-bold text-faint"
              >
                On the roadmap
              </button>
            </div>

            <div className="rounded-2xl border-[1.5px] border-line bg-paper px-7 py-8 opacity-90">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Planned
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
                Not yet
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Shared workspaces, history, and team settings, if they are ever
                worth the complexity.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  'Shared presets',
                  'Job history',
                  'Team limits',
                  'Usage reporting',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-xs text-faint">
                    <span className="text-faint">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                className="mt-7 w-full cursor-not-allowed rounded-lg border-2 border-line px-4 py-3 text-sm font-bold text-faint"
              >
                Not available
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-5">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">
              Made for the way you work
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
              No invented reviews, just the jobs MergePDF is built to handle
              well.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                initials: 'ST',
                name: 'Students & researchers',
                role: 'Reading, citing, and sharing papers',
                body: 'Merge readings, split a chapter out of a book, and pull the words into notes without sending anything to a server.',
                color: '#3b82f6',
              },
              {
                initials: 'SM',
                name: 'Small teams',
                role: 'Reports, invoices, and handovers',
                body: 'Compress a scan, number the pages, and watermark a draft before it goes out — all from the same tab.',
                color: '#10b981',
              },
              {
                initials: 'PV',
                name: 'Privacy-first work',
                role: 'Confidential and personal files',
                body: 'Contracts, medical letters, and identity documents stay on the device that opened them. There is no upload to trust.',
                color: '#8b5cf6',
              },
            ].map((item) => (
              <div
                key={item.name}
                className="rounded-2xl border-[1.5px] border-line bg-paper px-6 py-7 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              >
                <div
                  className="mb-4 flex size-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.initials}
                </div>
                <p className="text-sm italic leading-relaxed text-ink">
                  “{item.body}”
                </p>
                <div className="mt-5">
                  <div className="text-sm font-bold text-ink">{item.name}</div>
                  <div className="text-xs text-muted">{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browser CTA */}
      <section className="border-t border-line bg-surface py-16">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-12 px-5 lg:flex-row">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">
              MergePDF works wherever your browser does
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
              There is no app to install and no account to remember. Open the
              page on a laptop, tablet, or phone, and the toolbox is ready.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openPicker}
                className="cursor-pointer rounded-lg bg-[#111827] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#374151]"
              >
                Open the toolbox
              </button>
              <button
                type="button"
                onClick={() => scrollTo('tools')}
                className="cursor-pointer rounded-lg border border-line bg-paper px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                Browse all tools
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <div className="w-full max-w-[360px] rounded-2xl border-4 border-[#374151] bg-[#111827] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <div className="flex gap-1.5 px-2 py-2">
                <span className="size-2 rounded-full bg-[#ff5f57]" />
                <span className="size-2 rounded-full bg-[#febc2e]" />
                <span className="size-2 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-accent to-[#ff5272] px-6 py-12 text-center text-white">
                <BrandMark className="size-12" />
                <span className="text-lg font-bold">MergePDF</span>
                <small className="text-[11px] text-white/80">
                  Every PDF tool, in your browser
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
