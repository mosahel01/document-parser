import { RenameTool } from './components/RenameTool'

const upcoming = [
  'Zip and unzip',
  'Merge and split PDFs',
  'Convert images',
  'DOCX to HTML or Markdown',
]

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="font-semibold tracking-tight">Document Toolkit</span>
          <span className="text-sm text-slate-500">Phase 1</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Rename files</h1>
        <p className="mt-2 text-slate-600">
          Type the new name for each file, or rename a whole batch at once with
          a prefix, suffix, or numbering.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          <span className="size-1.5 rounded-full bg-emerald-600" />
          Runs in your browser. Nothing is uploaded.
        </p>

        <div className="mt-8">
          <RenameTool />
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
  )
}

export default App
