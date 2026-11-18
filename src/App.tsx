import { Suspense, lazy, useEffect, useState, type ReactElement } from "react";
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

// pdf-lib and pdf.js are about a megabyte. Only fetch them when the PDF tab is
// opened, so renaming a file does not pay for them.
const PdfTool = lazy(() =>
  import("./components/PdfTool").then((module) => ({ default: module.PdfTool })),
);

type Tool = {
  label: string;
  title: string;
  blurb: string;
};

/**
 * The tab order, and the only list of tools in the app. Ids and labels come
 * from one object, so a tab can never point at a tool that is not there.
 */
const tools = {
  home: {
    label: "Home",
    title: "Start with a file",
    blurb:
      "Drop any file and the options follow from what it is. A PDF can be merged, split, or read as Word; a photo can be converted; a Word file can be read or made into a PDF.",
  },
  pdf: {
    label: "PDF",
    title: "Merge, split, and finish PDFs",
    blurb:
      "Combine several PDFs, pull out pages, or reorder them. Save pages as images, compress a scan, crop margins, and add page numbers or a watermark, all in the browser.",
  },
  word: {
    label: "Word",
    title: "Word documents and PDFs",
    blurb:
      "Read a .docx as HTML, Markdown, or text, or move the words between Word and PDF. Layout stays basic; images stay behind.",
  },
  zip: {
    label: "Zip",
    title: "Zip and unzip",
    blurb: "Pack files into one archive, or open a zip and take out what you need.",
  },
  replace: {
    label: "Replace",
    title: "Find and replace in files",
    blurb: "Change text inside many files at once. Plain text, or a pattern when you need one.",
  },
  convert: {
    label: "Convert",
    title: "Convert files",
    blurb:
      "Photos become PNG, JPG, WebP, or PDF; PDFs and Word files trade places; text becomes either. Each result is previewed before you save it.",
  },
  image: {
    label: "Photos",
    title: "Crop, resize, and rotate photos",
    blurb:
      "Drag a box over the part you want, turn the picture, and set the size. The original file is never changed.",
  },
  compress: {
    label: "Compress",
    title: "Compress and decompress",
    blurb:
      "Shrink a file into a .gz archive, or expand one back. The name inside the archive is reused.",
  },
  rename: {
    label: "Rename",
    title: "Rename files",
    blurb:
      "Type one name for the whole batch, numbered automatically. Change the extension to convert an image on the way out.",
  },
} satisfies Record<string, Tool>;

type ToolId = keyof typeof tools;

const TOOL_IDS = Object.keys(tools) as ToolId[];

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

  // The PDF tab carries pdf-lib and pdf.js, about 1.8 MB of JavaScript. Fetching
  // it while the page sits idle means the first click on the tab is instant
  // instead of showing "Loading the tool…" over a slow connection.
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
      case "pdf":
        return (
          <PdfTool
            initialFiles={files}
            initialMode={pending?.tool === "pdf" ? pending.mode : undefined}
          />
        );
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
      case "compress":
        return (
          <CompressTool
            initialFiles={files}
            initialMode={pending?.tool === "compress" ? pending.mode : undefined}
          />
        );
      case "replace":
        return <ReplaceTool initialFiles={files} />;
      case "convert":
        return <ConvertTool initialFiles={files} />;
      case "image":
        return <ImageTool initialFiles={files} />;
      case "rename":
        return <RenameTool initialFiles={files} />;
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-3 pt-4">
            <span className="text-lg font-semibold tracking-tight">
              Document Toolkit
            </span>
            <ThemeToggle />
          </div>

          <nav className="nav-scroll -mx-2 flex flex-nowrap gap-1 overflow-x-auto px-2 pb-3 pt-1">
            {TOOL_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => select(id)}
                aria-current={id === active ? "page" : undefined}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${id === active
                    ? "bg-hover text-ink"
                    : "text-muted hover:text-ink"
                  }`}
              >
                {tools[id].label}
              </button>
            ))}
          </nav>
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

export default App;
