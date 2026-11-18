import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { HomeTool } from "./components/HomeTool";
import { ThemeToggle } from "./components/ThemeToggle";
import { RenameTool } from "./components/RenameTool";
import { ZipTool } from "./components/ZipTool";
import { ReplaceTool } from "./components/ReplaceTool";
import { ConvertTool } from "./components/ConvertTool";
import { ImageTool } from "./components/ImageTool";
import { CompressTool } from "./components/CompressTool";
import { WordTool } from "./components/WordTool";
import type { HomeOperation } from "./tools/fileKind";

// pdf-lib and pdf.js together are about a megabyte. Each PDF tab is split into
// its own chunk so the Home screen and the light tools never pay for them.
const PdfTool = lazy(() =>
  import("./components/PdfTool").then((module) => ({ default: module.PdfTool })),
);
const PdfPageManager = lazy(() =>
  import("./components/PdfPageManager").then((module) => ({
    default: module.PdfPageManager,
  })),
);
const PdfCompressTool = lazy(() =>
  import("./components/PdfCompressTool").then((module) => ({
    default: module.PdfCompressTool,
  })),
);
const PdfCropTool = lazy(() =>
  import("./components/PdfCropTool").then((module) => ({
    default: module.PdfCropTool,
  })),
);
const PdfNumberTool = lazy(() =>
  import("./components/PdfNumberTool").then((module) => ({
    default: module.PdfNumberTool,
  })),
);
const PdfWatermarkTool = lazy(() =>
  import("./components/PdfWatermarkTool").then((module) => ({
    default: module.PdfWatermarkTool,
  })),
);
const PdfToImagesTool = lazy(() =>
  import("./components/PdfImagesTool").then((module) => ({
    default: module.PdfToImagesTool,
  })),
);
const ImagesToPdfTool = lazy(() =>
  import("./components/PdfImagesTool").then((module) => ({
    default: module.ImagesToPdfTool,
  })),
);

type Tool = {
  label: string;
  title: string;
  blurb: string;
};

/**
 * The full list of tools in the app. Ids and labels come from one object, so a
 * tab can never point at a tool that is not there.
 */
const tools = {
  home: {
    label: "Home",
    title: "Start with a file",
    blurb:
      "Drop any file and the options follow from what it is. A PDF can be merged, split, or read as Word; a photo can be converted; a Word file can be read or made into a PDF.",
  },
  convert: {
    label: "Convert",
    title: "Convert files",
    blurb:
      "Photos become PNG, JPG, WebP, or PDF; PDFs and Word files trade places; text becomes either. Each result is previewed before you save it.",
  },
  merge: {
    label: "Merge PDFs",
    title: "Merge PDFs",
    blurb:
      "Drop several PDFs and put them in one document, in the order you choose. Each file keeps its own pages, text, and links.",
  },
  extract: {
    label: "Extract pages",
    title: "Extract pages or split a PDF",
    blurb:
      "See every page, keep the ones you type, or save each page as its own PDF. The original file is never changed.",
  },
  organize: {
    label: "Organize pages",
    title: "Organize PDF pages",
    blurb:
      "Turn, delete, copy, and drag pages into a new order, or pull pages in from another PDF. Saving builds a fresh document.",
  },
  compressPdf: {
    label: "Compress PDF",
    title: "Compress a PDF",
    blurb:
      "Pages are redrawn as JPEGs at a lower resolution, which shrinks scans. Text stops being selectable, so use it on scans rather than documents you need to search.",
  },
  crop: {
    label: "Crop margins",
    title: "Crop PDF margins",
    blurb:
      "Trim a percentage from each side of every page. The hidden area stays in the file; every viewer honours the smaller page.",
  },
  number: {
    label: "Page numbers",
    title: "Add page numbers",
    blurb:
      "Put a number in a corner or the centre, in one of three formats, starting wherever you like. Numbers stay upright on rotated pages.",
  },
  watermark: {
    label: "Watermark",
    title: "Watermark a PDF",
    blurb:
      "One line of text across each page. Long text is shrunk to fit, and the mark stays upright on rotated pages.",
  },
  toImages: {
    label: "PDF to images",
    title: "PDF to JPG or PNG",
    blurb:
      "Draw each page as an image at 150, 200, or 300 dpi. Rotated and cropped pages look as they do in a viewer.",
  },
  imagesToPdf: {
    label: "Images to PDF",
    title: "Make a PDF from photos",
    blurb:
      "One photo per page, on A4, Letter, or a page that follows the photo's shape, with the margin you pick.",
  },
  image: {
    label: "Edit photo",
    title: "Crop, resize, and rotate photos",
    blurb:
      "Drag a box over the part you want, turn the picture, and set the size. The original file is never changed.",
  },
  word: {
    label: "Word",
    title: "Word documents and PDFs",
    blurb:
      "Read a .docx as HTML, Markdown, or text, or move the words between Word and PDF. Layout stays basic; images stay behind.",
  },
  zip: {
    label: "Zip / unzip",
    title: "Zip and unzip",
    blurb: "Pack files into one archive, or open a zip and take out what you need.",
  },
  gzip: {
    label: "Gzip",
    title: "Compress and decompress files",
    blurb:
      "Shrink a file into a .gz archive, or expand one back. The name inside the archive is reused. This is the gzip format, not PDF compression.",
  },
  rename: {
    label: "Rename",
    title: "Rename files",
    blurb:
      "Type one name for the whole batch, numbered automatically. Change the extension to convert an image on the way out.",
  },
  replace: {
    label: "Find & replace",
    title: "Find and replace in files",
    blurb: "Change text inside many files at once. Plain text, or a pattern when you need one.",
  },
} satisfies Record<string, Tool>;

type ToolId = keyof typeof tools;

// ---------------------------------------------------------------------------
// Nav categories — each top-level item is either a single tool or a dropdown
// whose children are tool ids.
// ---------------------------------------------------------------------------

type NavCategory = {
  id: string;
  label: string;
  /** SVG icon path(s), drawn in a 24×24 viewBox with stroke. */
  icon: ReactElement;
  items: { id: ToolId; label: string; desc: string }[];
};

const navCategories: NavCategory[] = [
  {
    id: "pdf",
    label: "PDF",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
      </svg>
    ),
    items: [
      { id: "merge", label: "Merge", desc: "Combine several PDFs into one" },
      { id: "extract", label: "Extract / split", desc: "Pick pages or split into files" },
      { id: "organize", label: "Organize pages", desc: "Reorder, rotate, delete, copy" },
      { id: "compressPdf", label: "Compress", desc: "Shrink scanned PDFs" },
      { id: "crop", label: "Crop margins", desc: "Trim page edges" },
      { id: "number", label: "Page numbers", desc: "Add numbers to pages" },
      { id: "watermark", label: "Watermark", desc: "Stamp text on every page" },
      { id: "toImages", label: "PDF → images", desc: "Export pages as JPG or PNG" },
      { id: "imagesToPdf", label: "Images → PDF", desc: "Photos into a PDF document" },
    ],
  },
  {
    id: "images",
    label: "Images",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      </svg>
    ),
    items: [
      { id: "image", label: "Edit photo", desc: "Crop, resize, rotate one image" },
      { id: "convert", label: "Convert", desc: "PNG, JPG, WebP, or PDF" },
      { id: "imagesToPdf", label: "Images → PDF", desc: "Several photos into one PDF" },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2Z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h3" />
      </svg>
    ),
    items: [
      { id: "word", label: "Word", desc: "Read or convert .docx files" },
      { id: "convert", label: "Convert", desc: "Between PDF, Word, text, HTML" },
      { id: "replace", label: "Find & replace", desc: "Change text across many files" },
    ],
  },
  {
    id: "archive",
    label: "Archive",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
        <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
        <path d="M4 8h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
        <path d="M10 12h4" />
      </svg>
    ),
    items: [
      { id: "zip", label: "Zip / unzip", desc: "Pack or unpack zip archives" },
      { id: "gzip", label: "Gzip", desc: "Compress or decompress .gz files" },
      { id: "rename", label: "Rename", desc: "Rename files in batch" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Dropdown component — appears below each top-level category
// ---------------------------------------------------------------------------

function NavDropdown({
  category,
  active,
  onSelect,
}: {
  category: NavCategory;
  active: ToolId;
  onSelect: (id: ToolId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Any tool in this category is active.
  const isActive = category.items.some((item) => item.id === active);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-hover text-ink"
            : "text-muted hover:bg-hover/60 hover:text-ink"
        }`}
      >
        {category.icon}
        {category.label}
        <svg
          viewBox="0 0 24 24"
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-56 rounded-lg border border-line bg-surface py-1 shadow-lg">
          {category.items.map((item) => (
            <button
              key={`${category.id}-${item.id}`}
              type="button"
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
              }}
              className={`flex w-full flex-col px-3.5 py-2 text-left transition-colors ${
                item.id === active
                  ? "bg-hover text-ink"
                  : "text-muted hover:bg-hover/60 hover:text-ink"
              }`}
            >
              <span className="text-sm font-medium text-ink">{item.label}</span>
              <span className="text-xs text-faint">{item.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const upcoming = [
  "OCR for scanned PDFs",
  "Password-protected PDFs",
  "Signing and PDF forms",
  "Exact Word layout in PDF",
];

function App() {
  const [active, setActive] = useState<ToolId>("home");
  /** What the Home screen handed over, read once by the tool it opens. */
  const [pending, setPending] = useState<HomeOperation | null>(null);

  const tool = tools[active];
  const files = pending?.files ?? [];

  // Every PDF tab shares pdf-lib and pdf.js. Fetching one of them while the
  // page sits idle means the first PDF click is instant instead of showing
  // "Loading the tool…" over a slow connection.
  useEffect(() => {
    if (typeof window.requestIdleCallback !== "function") return;
    const id = window.requestIdleCallback(() => {
      void import("./components/PdfTool");
    });
    return () => window.cancelIdleCallback(id);
  }, []);

  function select(id: ToolId) {
    setActive(id);
    setPending(null);
    // Otherwise a long page clamps the scroll and the whole layout jumps.
    window.scrollTo({ top: 0 });
  }

  function start(operation: HomeOperation) {
    setPending(operation);
    setActive(operation.tool);
    window.scrollTo({ top: 0 });
  }

  function renderTool(): ReactElement {
    switch (active) {
      case "home":
        return <HomeTool onStart={start} />;
      case "convert":
        return <ConvertTool initialFiles={files} />;
      case "merge":
        return <PdfTool key="merge" mode="merge" initialFiles={files} />;
      case "extract":
        return <PdfTool key="extract" mode="extract" initialFiles={files} />;
      case "organize":
        return <PdfPageManager initialFiles={files} />;
      case "compressPdf":
        return <PdfCompressTool initialFiles={files} />;
      case "crop":
        return <PdfCropTool initialFiles={files} />;
      case "number":
        return <PdfNumberTool initialFiles={files} />;
      case "watermark":
        return <PdfWatermarkTool initialFiles={files} />;
      case "toImages":
        return <PdfToImagesTool initialFiles={files} />;
      case "imagesToPdf":
        return <ImagesToPdfTool initialFiles={files} />;
      case "image":
        return <ImageTool initialFiles={files} />;
      case "word":
        return (
          <WordTool
            initialFiles={files}
            initialMode={pending?.tool === "word" ? pending.mode : undefined}
          />
        );
      case "zip":
        return (
          <ZipTool
            initialFiles={files}
            initialMode={pending?.tool === "zip" ? pending.mode : undefined}
          />
        );
      case "gzip":
        return (
          <CompressTool
            initialFiles={files}
            initialMode={pending?.tool === "gzip" ? pending.mode : undefined}
          />
        );
      case "rename":
        return <RenameTool initialFiles={files} />;
      case "replace":
        return <ReplaceTool initialFiles={files} />;
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4 py-3">
            {/* Brand — the icon and name both go home */}
            <button
              type="button"
              onClick={() => select("home")}
              aria-current={active === "home" ? "page" : undefined}
              title="Start with a file"
              className="flex items-center gap-2.5 hover:opacity-80"
            >
              <img
                src="/favicon.svg"
                alt=""
                className="size-6"
              />
              <span className="text-lg font-semibold tracking-tight">
                Document Toolkit
              </span>
            </button>

            {/* Right side: nav categories + theme toggle */}
            <div className="flex items-center gap-1">
              <nav
                aria-label="Tools"
                className="nav-scroll hidden items-center gap-0.5 sm:flex"
              >
                {navCategories.map((cat) => (
                  <NavDropdown
                    key={cat.id}
                    category={cat}
                    active={active}
                    onSelect={select}
                  />
                ))}
              </nav>

              {/* Divider */}
              <span className="mx-1.5 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

              <ThemeToggle />

              {/* Mobile menu button */}
              <MobileMenu active={active} onSelect={select} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{tool.title}</h1>
        <p className="mt-3 max-w-prose text-muted">{tool.blurb}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-good-soft px-3 py-1 text-xs font-medium text-good">
          <span className="size-1.5 rounded-full bg-good" />
          Runs in your browser. Nothing is uploaded.
        </p>

        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-muted">Loading the tool…</p>}>
            {renderTool()}
          </Suspense>
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-16 sm:px-8 lg:px-12">
        <h2 className="text-sm font-medium text-muted">Coming next</h2>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {upcoming.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile menu — a hamburger that expands a full list on small screens
// ---------------------------------------------------------------------------

function MobileMenu({
  active,
  onSelect,
}: {
  active: ToolId;
  onSelect: (id: ToolId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Open menu"
        className="rounded-md border border-line p-1.5 text-muted hover:border-edge hover:bg-hover hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          {open ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-line bg-surface py-2 shadow-lg">
          {navCategories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 px-3.5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-faint">
                {cat.icon}
                {cat.label}
              </div>
              {cat.items.map((item) => (
                <button
                  key={`mob-${cat.id}-${item.id}`}
                  type="button"
                  onClick={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full flex-col px-5 py-1.5 text-left transition-colors ${
                    item.id === active
                      ? "bg-hover text-ink"
                      : "text-muted hover:bg-hover/60 hover:text-ink"
                  }`}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
