import {
  Suspense,
  lazy,
  useEffect,
  useState,
  type ReactElement,
} from 'react'
import { HomeTool } from './components/HomeTool'
import { AppHeader } from './components/AppHeader'
import { AppFooter } from './components/AppFooter'
import { GlobalSearch, type SearchableTool } from './components/GlobalSearch'
import { ToolHeader } from './components/ToolHeader'
import type { NavCategory } from './components/NavigationMenu'
import { RenameTool } from './components/RenameTool'
import { ZipTool } from './components/ZipTool'
import { ReplaceTool } from './components/ReplaceTool'
import { ConvertTool } from './components/ConvertTool'
import { ImageTool } from './components/ImageTool'
import { CompressTool } from './components/CompressTool'
import { WordTool } from './components/WordTool'
import { JsonTool } from './components/JsonTool'
import { ExtractTextTool } from './components/ExtractTextTool'
import type { HomeOperation } from './tools/fileKind'

// Lazy-loaded PDF tools to keep initial bundle light
const PdfTool = lazy(() =>
  import('./components/PdfTool').then((module) => ({ default: module.PdfTool })),
)
const PdfPageManager = lazy(() =>
  import('./components/PdfPageManager').then((module) => ({
    default: module.PdfPageManager,
  })),
)
const PdfCompressTool = lazy(() =>
  import('./components/PdfCompressTool').then((module) => ({
    default: module.PdfCompressTool,
  })),
)
const PdfCropTool = lazy(() =>
  import('./components/PdfCropTool').then((module) => ({
    default: module.PdfCropTool,
  })),
)
const PdfNumberTool = lazy(() =>
  import('./components/PdfNumberTool').then((module) => ({
    default: module.PdfNumberTool,
  })),
)
const PdfWatermarkTool = lazy(() =>
  import('./components/PdfWatermarkTool').then((module) => ({
    default: module.PdfWatermarkTool,
  })),
)
const PdfToImagesTool = lazy(() =>
  import('./components/PdfImagesTool').then((module) => ({
    default: module.PdfToImagesTool,
  })),
)
const ImagesToPdfTool = lazy(() =>
  import('./components/PdfImagesTool').then((module) => ({
    default: module.ImagesToPdfTool,
  })),
)

type Tool = {
  label: string
  title: string
  blurb: string
  category: string
  icon: ReactElement
}

/**
 * The master tools registry.
 */
const tools = {
  home: {
    label: 'Home',
    title: 'Everything you need to work with files.',
    blurb:
      'Convert, compress, edit and extract files with powerful tools in one place. Runs locally in your browser.',
    category: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  merge: {
    label: 'Merge PDFs',
    title: 'Merge PDFs',
    blurb:
      'Drop several PDFs and combine them into one document in your chosen order. Each file keeps its pages, text, and vector content.',
    category: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M8 7v10M12 4v16M16 9v6" />
      </svg>
    ),
  },
  extract: {
    label: 'Extract pages',
    title: 'Extract pages or split a PDF',
    blurb:
      'Select specific page numbers or ranges to keep, or burst each page into an individual PDF file. Original files remain untouched.',
    category: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </svg>
    ),
  },
  organize: {
    label: 'Organize pages',
    title: 'Organize PDF pages',
    blurb:
      'Turn, reorder, delete, copy, or drag pages into a new sequence, or pull pages from another PDF. Saving builds a fresh document.',
    category: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  compressPdf: {
    label: 'Compress PDF',
    title: 'Compress a PDF',
    blurb:
      'Shrinks scanned PDFs by re-encoding pages as JPEGs at lower resolution. Best for scanned records and oversized printouts.',
    category: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 14h6m-6-4h6m4-6v16m4-10-4-4-4 4" />
      </svg>
    ),
  },
  crop: {
    label: 'Crop margins',
    title: 'Crop PDF margins',
    blurb:
      'Trim percentage margins from each side of every page. The hidden area stays in the file; all viewers respect the smaller crop box.',
    category: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
  },
  number: {
    label: 'Page numbers',
    title: 'Add page numbers',
    blurb:
      'Stamp page numbers in any corner or center position. Numbers automatically stay upright on rotated or landscape pages.',
    category: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 4v16h16V4H4Zm6 12V8l-2 2" />
      </svg>
    ),
  },
  watermark: {
    label: 'Watermark',
    title: 'Watermark a PDF',
    blurb:
      'Stamp custom diagonal text across every page with adjustable opacity and rotation compensation.',
    category: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="m3 21 18-18M7 3h14v14" />
      </svg>
    ),
  },
  toImages: {
    label: 'PDF to images',
    title: 'PDF to JPG or PNG',
    blurb:
      'Render each page as an image at 150, 200, or 300 DPI. Rotated and cropped pages look exactly as they appear in a PDF reader.',
    category: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
  },
  imagesToPdf: {
    label: 'Images to PDF',
    title: 'Make a PDF from photos',
    blurb:
      'Combine photos into a clean document, one photo per page, on A4, Letter, or natural shape with configurable margins.',
    category: 'Images',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="m21 15-3-3a2 2 0 0 0-3 0L6 21" />
      </svg>
    ),
  },
  image: {
    label: 'Edit photo',
    title: 'Crop, resize, and rotate photos',
    blurb:
      'Drag a crop box, straighten crooked scans with fine tilt controls, and resize dimensions. The original file is never changed.',
    category: 'Images',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
  },
  convert: {
    label: 'Convert',
    title: 'Convert files',
    blurb:
      'Convert between PNG, JPG, WebP, and PDF; convert Word .docx to HTML/Markdown/Text or PDF; and render text files.',
    category: 'Documents',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M20 7h-9m0 0 3-3m-3 3 3 3M4 17h9m0 0-3-3m3 3-3 3" />
      </svg>
    ),
  },
  word: {
    label: 'Word',
    title: 'Word documents and PDFs',
    blurb:
      'Read a .docx as HTML, Markdown, or text, or move text between Word and PDF.',
    category: 'Documents',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2Z" />
        <path d="M14 2v6h6M9 13h6M9 17h3" />
      </svg>
    ),
  },
  extractText: {
    label: 'Extract text',
    title: 'Extract text from document',
    blurb:
      'Extract plain text paragraphs from PDF, DOCX, or text files with word and character statistics.',
    category: 'Extract & OCR',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 6h16M4 12h10M4 18h14" />
      </svg>
    ),
  },
  zip: {
    label: 'Zip / unzip',
    title: 'Zip and unzip',
    blurb:
      'Pack files and directories into one zip archive, or inspect and extract contents from an existing archive.',
    category: 'Archive',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M10 4v16M14 4v16M3 10h18M3 14h18" />
      </svg>
    ),
  },
  gzip: {
    label: 'Gzip',
    title: 'Compress and decompress files (.gz)',
    blurb:
      'Compress single files into RFC 1952 .gz archives, or unpack existing .gz archives directly in your browser.',
    category: 'Archive',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    ),
  },
  rename: {
    label: 'Rename',
    title: 'Rename files',
    blurb:
      'Batch rename files with auto-numbering and change extensions with content conversion where supported.',
    category: 'Archive',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
  replace: {
    label: 'Find & replace',
    title: 'Find and replace in files',
    blurb:
      'Search and replace text or regular expression patterns across multiple text files simultaneously.',
    category: 'Documents',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2-8h4" />
      </svg>
    ),
  },
  jsonFormatter: {
    label: 'JSON Formatter',
    title: 'Format & validate JSON',
    blurb:
      'Validate JSON syntax, format indentation (2/4/tab), minify, and sort keys with instant error location.',
    category: 'Developer Tools',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M8 3H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-1" />
      </svg>
    ),
  },
} satisfies Record<string, Tool>

type ToolId = keyof typeof tools

// Navigation categories hierarchy
const navCategories: NavCategory[] = [
  {
    id: 'pdf',
    label: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
      </svg>
    ),
    items: [
      { id: 'merge', label: 'Merge', desc: 'Combine several PDFs into one' },
      { id: 'extract', label: 'Extract / split', desc: 'Pick pages or split into files' },
      { id: 'organize', label: 'Organize pages', desc: 'Reorder, rotate, delete, copy' },
      { id: 'compressPdf', label: 'Compress', desc: 'Shrink scanned PDFs' },
      { id: 'crop', label: 'Crop margins', desc: 'Trim page edges' },
      { id: 'number', label: 'Page numbers', desc: 'Add numbers to pages' },
      { id: 'watermark', label: 'Watermark', desc: 'Stamp text on every page' },
      { id: 'toImages', label: 'PDF → images', desc: 'Export pages as JPG or PNG' },
      { id: 'imagesToPdf', label: 'Images → PDF', desc: 'Photos into a PDF document' },
    ],
  },
  {
    id: 'images',
    label: 'Images',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      </svg>
    ),
    items: [
      { id: 'image', label: 'Edit photo', desc: 'Crop, resize, rotate one image' },
      { id: 'convert', label: 'Convert', desc: 'PNG, JPG, WebP, or PDF' },
      { id: 'imagesToPdf', label: 'Images → PDF', desc: 'Several photos into one PDF' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2Z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h3" />
      </svg>
    ),
    items: [
      { id: 'word', label: 'Word (.docx)', desc: 'Read or convert .docx files' },
      { id: 'convert', label: 'Convert files', desc: 'Between PDF, Word, text, HTML' },
      { id: 'extractText', label: 'Extract text', desc: 'Extract words into plain text' },
      { id: 'replace', label: 'Find & replace', desc: 'Change text across many files' },
    ],
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
        <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
        <rect x="3" y="8" width="18" height="8" rx="1" />
        <path d="M10 12h4" />
      </svg>
    ),
    items: [
      { id: 'zip', label: 'Zip / unzip', desc: 'Pack or unpack zip archives' },
      { id: 'gzip', label: 'Gzip (.gz)', desc: 'Compress or decompress .gz files' },
      { id: 'rename', label: 'Batch rename', desc: 'Rename files in sequence' },
    ],
  },
  {
    id: 'extract-ocr',
    label: 'Extract & OCR',
    shortLabel: 'Extract',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h10M4 18h14" />
      </svg>
    ),
    items: [
      { id: 'extractText', label: 'Extract text', desc: 'Pull text from PDF, DOCX, TXT' },
      { id: 'extract', label: 'Extract pages', desc: 'Extract selected pages from PDF' },
      { id: 'toImages', label: 'PDF to images', desc: 'Render pages as JPG or PNG' },
      { id: 'zip', label: 'Extract zip', desc: 'Unpack files from archive' },
      { id: 'replace', label: 'Find & replace', desc: 'Search and replace in text files' },
    ],
  },
  {
    id: 'developer',
    label: 'Developer Tools',
    shortLabel: 'Developer',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    items: [
      { id: 'jsonFormatter', label: 'JSON Formatter', desc: 'Format, validate, minify JSON' },
      { id: 'replace', label: 'Find & replace', desc: 'Batch regex find and replace' },
      { id: 'gzip', label: 'Gzip compressor', desc: 'RFC 1952 stream compression' },
      { id: 'rename', label: 'Batch renamer', desc: 'Sequence numbering & extension conversion' },
    ],
  },
]

// Search index
const searchableTools: SearchableTool[] = [
  {
    id: 'compressPdf',
    title: 'Compress PDF',
    category: 'PDF',
    description: 'Shrink scanned PDFs by re-encoding pages at target resolution and quality.',
    keywords: ['compress', 'shrink', 'pdf', 'reduce', 'size', 'dpi', 'rasterize'],
    icon: tools.compressPdf.icon,
  },
  {
    id: 'merge',
    title: 'Merge PDF',
    category: 'PDF',
    description: 'Combine multiple PDF files into one ordered document.',
    keywords: ['merge', 'combine', 'join', 'pdf', 'concatenate'],
    icon: tools.merge.icon,
  },
  {
    id: 'extract',
    title: 'Split & Extract PDF',
    category: 'PDF',
    description: 'Pick pages to keep or split each page into an individual PDF file.',
    keywords: ['split', 'extract', 'pages', 'pdf', 'separate', 'burst'],
    icon: tools.extract.icon,
  },
  {
    id: 'organize',
    title: 'Organize PDF Pages',
    category: 'PDF',
    description: 'Reorder, rotate, delete, or copy pages in a PDF document.',
    keywords: ['organize', 'pages', 'rotate', 'reorder', 'turn', 'delete', 'pdf'],
    icon: tools.organize.icon,
  },
  {
    id: 'crop',
    title: 'Crop Margins',
    category: 'PDF',
    description: 'Trim percentage margins from all sides of a PDF.',
    keywords: ['crop', 'margin', 'trim', 'pdf', 'cut', 'box'],
    icon: tools.crop.icon,
  },
  {
    id: 'number',
    title: 'Add Page Numbers',
    category: 'PDF',
    description: 'Stamp page numbers with rotation compensation.',
    keywords: ['page numbers', 'number', 'stamp', 'footer', 'header', 'pdf'],
    icon: tools.number.icon,
  },
  {
    id: 'watermark',
    title: 'Watermark PDF',
    category: 'PDF',
    description: 'Stamp diagonal text watermark across every page.',
    keywords: ['watermark', 'stamp', 'text', 'pdf', 'overlay'],
    icon: tools.watermark.icon,
  },
  {
    id: 'toImages',
    title: 'PDF to Images',
    category: 'PDF',
    description: 'Export PDF pages as JPG or PNG images.',
    keywords: ['pdf to images', 'pdf to jpg', 'pdf to png', 'render', 'export'],
    icon: tools.toImages.icon,
  },
  {
    id: 'imagesToPdf',
    title: 'Images to PDF',
    category: 'Images',
    description: 'Convert multiple photos into a single PDF document.',
    keywords: ['images to pdf', 'photos to pdf', 'jpg to pdf', 'png to pdf'],
    icon: tools.imagesToPdf.icon,
  },
  {
    id: 'image',
    title: 'Crop & Resize Image',
    category: 'Images',
    description: 'Crop, resize, straighten, and rotate single photos.',
    keywords: ['crop image', 'resize image', 'photo', 'straighten', 'rotate', 'dimensions'],
    icon: tools.image.icon,
  },
  {
    id: 'convert',
    title: 'Convert Files',
    category: 'Documents',
    description: 'Convert between images, PDF, Word, HTML, and text formats.',
    keywords: ['convert', 'format', 'png', 'jpg', 'webp', 'docx', 'pdf', 'html', 'markdown'],
    icon: tools.convert.icon,
  },
  {
    id: 'word',
    title: 'Word (.docx) & PDF',
    category: 'Documents',
    description: 'Read or convert DOCX files, convert Word to PDF or PDF to Word.',
    keywords: ['word', 'docx', 'pdf to word', 'word to pdf', 'convert word'],
    icon: tools.word.icon,
  },
  {
    id: 'extractText',
    title: 'Extract Text (OCR / Digital)',
    category: 'Extract & OCR',
    description: 'Extract raw text paragraphs from PDF, DOCX, and text files. (Scanned OCR server container in Phase 2 roadmap).',
    keywords: ['extract text', 'ocr', 'text', 'read pdf', 'pdf text', 'docx text'],
    icon: tools.extractText.icon,
  },
  {
    id: 'zip',
    title: 'ZIP Files & Unzip',
    category: 'Archive',
    description: 'Create zip archives or inspect and extract files from a zip.',
    keywords: ['zip', 'unzip', 'archive', 'compress', 'unpack', 'extract zip'],
    icon: tools.zip.icon,
  },
  {
    id: 'gzip',
    title: 'GZIP Compressor & Decompressor',
    category: 'Archive',
    description: 'Compress individual files or decompress .gz archives.',
    keywords: ['gzip', 'gunzip', 'gz', 'compress', 'decompress', 'rfc1952'],
    icon: tools.gzip.icon,
  },
  {
    id: 'rename',
    title: 'Batch Rename Files',
    category: 'Archive',
    description: 'Bulk rename files with sequential numbers and extension switching.',
    keywords: ['rename', 'batch rename', 'numbering', 'bulk rename'],
    icon: tools.rename.icon,
  },
  {
    id: 'replace',
    title: 'Find & Replace',
    category: 'Documents',
    description: 'Search and replace text or regular expressions across files.',
    keywords: ['find', 'replace', 'regex', 'text', 'substitute', 'search'],
    icon: tools.replace.icon,
  },
  {
    id: 'jsonFormatter',
    title: 'JSON Formatter',
    category: 'Developer Tools',
    description: 'Validate, format, indent (2/4/tab), minify, and sort keys in JSON.',
    keywords: ['json', 'formatter', 'beautify', 'minify', 'validate', 'syntax', 'sort keys'],
    icon: tools.jsonFormatter.icon,
  },
]

export default function App() {
  const [active, setActive] = useState<ToolId>('home')
  const [pending, setPending] = useState<HomeOperation | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [homeFilter, setHomeFilter] = useState<string>('all')

  const tool = tools[active]
  const files = pending?.files ?? []

  // Pre-fetch PDF dependencies during idle time
  useEffect(() => {
    if (typeof window.requestIdleCallback !== 'function') return
    const id = window.requestIdleCallback(() => {
      void import('./components/PdfTool')
    })
    return () => window.cancelIdleCallback(id)
  }, [])

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function select(id: string) {
    if (id in tools) {
      setActive(id as ToolId)
      setPending(null)
      window.scrollTo({ top: 0 })
    }
  }

  function start(operation: HomeOperation) {
    setPending(operation)
    if (operation.tool in tools) {
      setActive(operation.tool as ToolId)
    }
    window.scrollTo({ top: 0 })
  }

  function renderTool(): ReactElement {
    switch (active) {
      case 'home':
        return (
          <HomeTool
            key={homeFilter}
            onStart={start}
            onSelectTool={select}
            onOpenSearch={() => setIsSearchOpen(true)}
            initialFilter={homeFilter}
          />
        )
      case 'convert':
        return <ConvertTool initialFiles={files} />
      case 'merge':
        return <PdfTool key="merge" mode="merge" initialFiles={files} />
      case 'extract':
        return <PdfTool key="extract" mode="extract" initialFiles={files} />
      case 'organize':
        return <PdfPageManager initialFiles={files} />
      case 'compressPdf':
        return <PdfCompressTool initialFiles={files} />
      case 'crop':
        return <PdfCropTool initialFiles={files} />
      case 'number':
        return <PdfNumberTool initialFiles={files} />
      case 'watermark':
        return <PdfWatermarkTool initialFiles={files} />
      case 'toImages':
        return <PdfToImagesTool initialFiles={files} />
      case 'imagesToPdf':
        return <ImagesToPdfTool initialFiles={files} />
      case 'image':
        return <ImageTool initialFiles={files} />
      case 'word':
        return (
          <WordTool
            initialFiles={files}
            initialMode={pending?.tool === 'word' ? pending.mode : undefined}
          />
        )
      case 'extractText':
        return <ExtractTextTool initialFiles={files} />
      case 'zip':
        return (
          <ZipTool
            initialFiles={files}
            initialMode={pending?.tool === 'zip' ? pending.mode : undefined}
          />
        )
      case 'gzip':
        return (
          <CompressTool
            initialFiles={files}
            initialMode={pending?.tool === 'gzip' ? pending.mode : undefined}
          />
        )
      case 'rename':
        return <RenameTool initialFiles={files} />
      case 'replace':
        return <ReplaceTool initialFiles={files} />
      case 'jsonFormatter':
        return <JsonTool initialFiles={files} />
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col text-ink">
      {/* App Header with Dropdowns, Brand, and Controls */}
      <AppHeader
        categories={navCategories}
        activeToolId={active}
        onSelectTool={select}
        onOpenSearch={() => setIsSearchOpen(true)}
        onGoHome={() => select('home')}
      />

      {/* Global Command Palette / Search Dialog */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTool={select}
        tools={searchableTools}
      />

      {/* Main Workspace */}
      {active === 'home' ? (
        <main className="flex-1">{renderTool()}</main>
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <ToolHeader
            title={tool.title}
            description={tool.blurb}
            category={tool.category}
            icon={tool.icon}
            onGoHome={() => select('home')}
            onGoCategory={() => {
              const categoryFilterMap: Record<string, string> = {
                'PDF': 'pdf',
                'Images': 'images',
                'Documents': 'documents',
                'Archive': 'archive',
                'Extract & OCR': 'extract',
                'Developer Tools': 'developer',
              }
              const filterId = categoryFilterMap[tool.category] ?? 'all'
              setHomeFilter(filterId)
              select('home')
            }}
          />

          <Suspense
            fallback={
              <p className="rounded-lg border border-line bg-paper px-4 py-3 text-xs text-muted">
                Loading tool…
              </p>
            }
          >
            {renderTool()}
          </Suspense>
        </main>
      )}

      {/* App Footer */}
      <AppFooter categories={navCategories} onSelectTool={select} />
    </div>
  )
}
