import { Suspense, lazy, useState, type ReactElement } from "react";
import { RenameTool } from "./components/RenameTool";
import { ZipTool } from "./components/ZipTool";
import { ReplaceTool } from "./components/ReplaceTool";
import { ConvertTool } from "./components/ConvertTool";
import { CompressTool } from "./components/CompressTool";
import { WordTool } from "./components/WordTool";

// pdf-lib and pdf.js are about a megabyte. Only fetch them when the PDF tab is
// opened, so renaming a file does not pay for them.
const PdfTool = lazy(() =>
  import("./components/PdfTool").then((module) => ({ default: module.PdfTool })),
);

const TOOL_IDS = [
  "pdf",
  "word",
  "zip",
  "replace",
  "convert",
  "compress",
  "rename",
] as const;
type ToolId = (typeof TOOL_IDS)[number];

type Tool = {
  label: string;
  title: string;
  blurb: string;
  element: ReactElement;
};

const tools: Record<ToolId, Tool> = {
  pdf: {
    label: "PDF",
    title: "Merge and split PDFs",
    blurb:
      "Combine several PDFs into one, or pull out single pages and ranges. Every page is previewed first.",
    element: <PdfTool />,
  },
  word: {
    label: "Word",
    title: "Word documents and PDFs",
    blurb:
      "Read a .docx as HTML, Markdown, or text, or move the words between Word and PDF. Layout stays basic; images stay behind.",
    element: <WordTool />,
  },
  zip: {
    label: "Zip / unzip",
    title: "Zip and unzip",
    blurb: "Pack files into one archive, or open a zip and take out what you need.",
    element: <ZipTool />,
  },
  replace: {
    label: "Find & replace",
    title: "Find and replace in files",
    blurb: "Change text inside many files at once. Plain text, or a pattern when you need one.",
    element: <ReplaceTool />,
  },
  convert: {
    label: "Convert images",
    title: "Convert images",
    blurb:
      "Turn images into PNG, JPG, WebP, or a one-page PDF, with the result previewed before you save.",
    element: <ConvertTool />,
  },
  compress: {
    label: "Compress",
    title: "Compress and decompress",
    blurb:
      "Shrink a file into a .gz archive, or expand one back. The name inside the archive is reused.",
    element: <CompressTool />,
  },
  rename: {
    label: "Rename",
    title: "Rename files",
    blurb:
      "Type one name for the whole batch, numbered automatically. Change the extension to convert an image on the way out.",
    element: <RenameTool />,
  },
};

const upcoming = ["OCR for scanned PDFs", "Exact Word layout in PDF"];

function App() {
  const [active, setActive] = useState<ToolId>("pdf");
  const tool = tools[active];

  function select(id: ToolId) {
    setActive(id);
    // Otherwise a long page clamps the scroll and the whole layout jumps.
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="font-semibold tracking-tight">Document Toolkit</span>

          <nav className="flex flex-wrap gap-1">
            {TOOL_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => select(id)}
                aria-current={id === active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${id === active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                {tools[id].label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{tool.title}</h1>
        <p className="mt-2 text-slate-600">{tool.blurb}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          <span className="size-1.5 rounded-full bg-emerald-600" />
          Runs in your browser. Nothing is uploaded.
        </p>

        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading the tool…</p>}>
            {tool.element}
          </Suspense>
        </div>
      </main>

      <footer className="mx-auto max-w-3xl px-6 pb-16">
        <h2 className="text-sm font-medium text-slate-500">Coming next</h2>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          {upcoming.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

export default App;
