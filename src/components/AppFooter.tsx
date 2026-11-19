const upcoming = [
  'LibreOffice server backend for exact DOCX pagination',
  'Tesseract OCR server container for scanned files',
  'Password-protected PDF unlocking',
  'Cryptographic digital signatures',
]

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface py-10 text-xs text-muted">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Privacy & Architecture */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
              Client-First Processing
            </h2>
            <p className="mt-2 text-muted leading-relaxed">
              Every operation runs locally in your browser using WebAssembly and HTML5 APIs.
              Your files and documents are never uploaded to any remote server or third-party cloud.
            </p>
          </div>

          {/* Technical Specs */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
              Core Capabilities
            </h2>
            <ul className="mt-2 space-y-1 text-muted">
              <li>PDF manipulation: <span className="font-mono text-[11px] text-faint">pdf-lib</span> + <span className="font-mono text-[11px] text-faint">pdf.js</span></li>
              <li>Archives & DOCX: <span className="font-mono text-[11px] text-faint">fflate</span> + XML stream processing</li>
              <li>Compression: <span className="font-mono text-[11px] text-faint">CompressionStream</span> (RFC 1952)</li>
              <li>Raster graphics: HTML5 2D Canvas Engine</li>
            </ul>
          </div>

          {/* Planned Extensions */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
              Phase 2 Roadmap
            </h2>
            <ul className="mt-2 space-y-1 text-muted">
              {upcoming.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-faint" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-[11px] text-faint sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="size-4" />
            <span className="font-medium text-ink">Document Toolkit</span>
            <span>&bull;</span>
            <span>Professional file-processing utility</span>
          </div>
          <div className="font-mono">
            Zero telemetry &bull; Zero tracking
          </div>
        </div>
      </div>
    </footer>
  )
}

