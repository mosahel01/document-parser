type Tool = {
  name: string
  description: string
  status: 'planned' | 'needs-server'
}

const tools: Tool[] = [
  {
    name: 'Rename files',
    description: 'Batch rename with patterns and numbering.',
    status: 'planned',
  },
  {
    name: 'Zip and unzip',
    description: 'Pack or unpack archives in the browser.',
    status: 'planned',
  },
  {
    name: 'Merge and split PDFs',
    description: 'Combine several PDFs, or pull out page ranges.',
    status: 'planned',
  },
  {
    name: 'Convert images',
    description: 'PNG, JPEG, and WebP with quality control.',
    status: 'planned',
  },
  {
    name: 'DOCX to HTML or Markdown',
    description: 'Read Word documents and keep the structure.',
    status: 'planned',
  },
  {
    name: 'DOCX to PDF',
    description: 'Faithful page layout. Requires a server.',
    status: 'needs-server',
  },
]

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-semibold tracking-tight">Document Toolkit</span>
          <span className="text-sm text-slate-500">Phase 0: skeleton</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance">
          Work with documents without handing them to someone else.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Every tool here runs in your browser unless it says otherwise. Nothing
          is uploaded, and nothing is stored.
        </p>

        <h2 className="mt-16 text-sm font-medium tracking-wide text-slate-500 uppercase">
          Planned tools
        </h2>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <li
              key={tool.name}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium">{tool.name}</h3>
                <span
                  className={
                    tool.status === 'planned'
                      ? 'shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600'
                      : 'shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800'
                  }
                >
                  {tool.status === 'planned' ? 'in browser' : 'needs server'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{tool.description}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-12 text-sm text-slate-500">
        Nothing here works yet. This page exists so we can see the app run.
      </footer>
    </div>
  )
}

export default App
