import { useEffect, useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { downloadBlob } from '../tools/download'
import { extractTextFromFile, type ExtractedText } from '../tools/extractText'
import { replaceExtension } from '../tools/rename'

export function ExtractTextTool({ initialFiles }: { initialFiles?: File[] }) {
  const [file, setFile] = useState<File | null>(initialFiles?.[0] ?? null)
  const [busy, setBusy] = useState(Boolean(initialFiles && initialFiles.length > 0))
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<ExtractedText | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Run automatically if initial file was provided
  useEffect(() => {
    let mounted = true
    if (initialFiles && initialFiles.length > 0) {
      const target = initialFiles[0]
      extractTextFromFile(target)
        .then((extracted) => {
          if (mounted) {
            setResult(extracted)
            setBusy(false)
          }
        })
        .catch((err) => {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Failed to extract text from document.')
            setBusy(false)
          }
        })
    }
    return () => {
      mounted = false
    }
  }, [initialFiles])

  async function runExtraction(target: File) {
    setFile(target)
    setBusy(true)
    setError(null)
    setResult(null)

    try {
      const extracted = await extractTextFromFile(target)
      setResult(extracted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from document.')
    } finally {
      setBusy(false)
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  function handleDownload() {
    if (!result || !file) return
    const txtName = replaceExtension(file.name, '.txt')
    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, txtName)
  }

  function handleReset() {
    setFile(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {!file && (
        <FileDrop
          onFiles={(files) => {
            if (files.length > 0) void runExtraction(files[0])
          }}
          multiple={false}
          accept=".pdf,.docx,.txt,.md,.html,.csv,.json"
          label="Drop a document to extract its text"
          hint="Supports PDF, DOCX, TXT, MD, and HTML documents. Everything runs in your browser."
        />
      )}

      {file && (
        <div className="flex items-center justify-between border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center border border-line bg-sunk text-ink font-mono text-xs uppercase">
              {file.name.split('.').pop() || 'doc'}
            </div>
            <div>
              <p className="text-xs font-medium text-ink">{file.name}</p>
              <p className="text-[11px] text-faint">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="border border-line bg-sunk px-2.5 py-1 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
          >
            Change file
          </button>
        </div>
      )}

      {busy && (
        <div className="border border-line bg-surface p-8 text-center">
          <p className="text-xs text-muted">Reading document content and extracting text...</p>
        </div>
      )}

      {error && (
        <div className="border border-bad/30 bg-bad-soft p-4 text-xs text-bad">
          <p className="font-medium">Extraction error</p>
          <p className="mt-1 font-mono text-[11px] opacity-90">{error}</p>
        </div>
      )}

      {result && (
        <div className="border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-xs">
            <div className="flex items-center gap-3 font-mono text-muted">
              <span>{result.wordCount.toLocaleString()} words</span>
              <span className="text-faint">&bull;</span>
              <span>{result.characterCount.toLocaleString()} characters</span>
              <span className="text-faint">&bull;</span>
              <span>{result.lineCount.toLocaleString()} lines</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="border border-line bg-sunk px-2.5 py-1 text-xs text-muted hover:border-edge hover:text-ink cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy text'}
              </button>
            </div>
          </div>

          <div className="p-4">
            <textarea
              readOnly
              value={result.text}
              rows={16}
              className="w-full border border-line bg-sunk p-3 font-mono text-xs text-ink outline-none resize-y"
            />
          </div>
        </div>
      )}

      {result && file && (
        <DownloadBar
          note={`Extracted ${result.wordCount.toLocaleString()} words from ${file.name}`}
        >
          <button
            type="button"
            onClick={handleCopy}
            className="border border-line bg-surface px-4 py-2 text-xs font-medium text-ink hover:bg-hover cursor-pointer"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover cursor-pointer"
          >
            Download as .txt
          </button>
        </DownloadBar>
      )}
    </div>
  )
}
