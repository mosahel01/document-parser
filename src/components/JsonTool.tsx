import { useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { downloadBlob } from '../tools/download'
import { formatJson, type JsonFormatOptions } from '../tools/json'
import { formatSize } from '../lib/format'

export function JsonTool({ initialFiles }: { initialFiles?: File[] }) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('formatted.json')
  const [indent, setIndent] = useState<JsonFormatOptions['indent']>(2)
  const [sortKeys, setSortKeys] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{
    formatted: string
    originalBytes: number
    formattedBytes: number
    lines: number
  } | null>(null)
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null)

  // Load from initial files if provided
  useState(() => {
    if (initialFiles && initialFiles.length > 0) {
      const file = initialFiles[0]
      setFileName(file.name.endsWith('.json') ? file.name : `${file.name}.json`)
      file.text().then((content) => {
        setText(content)
      }).catch(() => {})
    }
  })

  function handleFileDrop(files: File[]) {
    if (files.length === 0) return
    const file = files[0]
    setFileName(file.name.endsWith('.json') ? file.name : `${file.name}.json`)
    file.text().then((content) => {
      setText(content)
      setResult(null)
      setError(null)
    }).catch(() => {
      setError({ message: 'Failed to read file.' })
    })
  }

  function handleProcess() {
    if (!text.trim()) {
      setError({ message: 'Please enter or upload JSON text first.' })
      return
    }

    const originalBytes = new TextEncoder().encode(text).length
    const res = formatJson(text, { indent, sortKeys })

    if (res.success) {
      setResult({
        formatted: res.formatted,
        originalBytes,
        formattedBytes: res.bytes,
        lines: res.lines,
      })
      setError(null)
    } else {
      setError(res.error)
      setResult(null)
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.formatted).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  function handleDownload() {
    if (!result) return
    const blob = new Blob([result.formatted], { type: 'application/json' })
    downloadBlob(blob, fileName)
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone & Manual Paste */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <FileDrop
            onFiles={handleFileDrop}
            accept=".json,.txt,application/json,text/plain"
            multiple={false}
            label="Drop a JSON file"
            hint=".json or .txt with JSON contents"
          />
        </div>

        <div className="flex flex-col rounded-[5px] border border-line bg-surface p-4">
          <label htmlFor="json-input" className="mb-2 text-xs font-medium text-ink">
            Or paste raw JSON:
          </label>
          <textarea
            id="json-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setResult(null)
              setError(null)
            }}
            placeholder='{"hello": "world", "status": true}'
            rows={6}
            className="flex-1 w-full rounded-[4px] border border-line bg-sunk p-3 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none placeholder:text-faint"
          />
        </div>
      </div>

      {/* Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[5px] border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted">Indentation:</span>
            <div className="inline-flex rounded-[4px] border border-line bg-sunk p-0.5">
              {(
                [
                  [2, '2 spaces'],
                  [4, '4 spaces'],
                  ['tab', 'Tab'],
                  ['minify', 'Minify'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setIndent(val)}
                  className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    indent === val
                      ? 'bg-hover text-ink shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sortKeys}
              onChange={(e) => setSortKeys(e.target.checked)}
              className="rounded-[2px] border-edge bg-sunk text-accent focus:ring-accent"
            />
            <span>Sort object keys alphabetically</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleProcess}
          className="rounded-[4px] bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover cursor-pointer"
        >
          Format &amp; Validate
        </button>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="rounded-[5px] border border-bad/30 bg-bad-soft p-4 text-xs text-bad">
          <div className="flex items-center gap-2 font-medium">
            <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Syntax Error</span>
            {error.line && error.column && (
              <span className="font-mono text-[11px]">
                (Line {error.line}, Column {error.column})
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[11px] opacity-90">{error.message}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="rounded-[5px] border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-medium text-good">Valid JSON</span>
              <span className="text-faint">&bull;</span>
              <span className="font-mono text-faint">
                {result.lines} {result.lines === 1 ? 'line' : 'lines'}
              </span>
              <span className="text-faint">&bull;</span>
              <span className="font-mono text-faint">
                {formatSize(result.formattedBytes)}
                {result.formattedBytes !== result.originalBytes && (
                  <span className="ml-1 text-[10px]">
                    ({result.formattedBytes < result.originalBytes ? 'reduced by ' : 'expanded to '}
                    {Math.abs(Math.round(((result.formattedBytes - result.originalBytes) / result.originalBytes) * 100))}%)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-[3px] border border-line bg-sunk px-2.5 py-1 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
            </div>
          </div>

          <pre className="max-h-96 overflow-auto p-4 font-mono text-xs text-ink bg-sunk/60">
            {result.formatted}
          </pre>
        </div>
      )}

      {/* Persistent Bottom Download Bar */}
      {result && (
        <DownloadBar
          note={`Formatted into ${result.lines} lines (${formatSize(result.formattedBytes)})`}
        >
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-[4px] border border-line bg-surface px-4 py-2 text-xs font-medium text-ink hover:bg-hover cursor-pointer"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-[4px] bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover cursor-pointer"
          >
            Download {fileName}
          </button>
        </DownloadBar>
      )}
    </div>
  )
}

