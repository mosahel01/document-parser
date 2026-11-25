import { useEffect, useState } from 'react'
import { DownloadBar } from './DownloadBar'
import { FileDrop } from './FileDrop'
import { PdfPreview } from './PdfPreview'
import { ToolHeader } from './ToolHeader'
import { runServerPdfTool, type ServerPdfToolId } from '../tools/serverPdf'

type ServerPdfToolProps = {
  toolId: ServerPdfToolId
  title: string
  description: string
  category: string
}

const OUTPUT_META: Record<ServerPdfToolId, { suffix: string; ext: string; isPdf: boolean; action: string }> = {
  unlockPdf: { suffix: '-unlocked', ext: 'pdf', isPdf: true, action: 'Unlock PDF' },
  protectPdf: { suffix: '-protected', ext: 'pdf', isPdf: true, action: 'Protect PDF' },
  signPdf: { suffix: '-signed', ext: 'pdf', isPdf: true, action: 'Sign PDF' },
  repairPdf: { suffix: '-repaired', ext: 'pdf', isPdf: true, action: 'Repair PDF' },
  redactPdf: { suffix: '-redacted', ext: 'pdf', isPdf: true, action: 'Redact PDF' },
  pdfToPowerPoint: { suffix: '', ext: 'pptx', isPdf: false, action: 'Convert to PowerPoint' },
  pdfToExcel: { suffix: '', ext: 'xlsx', isPdf: false, action: 'Convert to Excel' },
}

export function ServerPdfTool({ toolId, title, description, category }: ServerPdfToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [signature, setSignature] = useState('')
  const [position, setPosition] = useState('bottom-right')
  const [page, setPage] = useState('1')
  const [redactBox, setRedactBox] = useState({ x: '10', y: '10', width: '35', height: '8' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ blob: Blob; filename: string; url: string } | null>(null)

  const meta = OUTPUT_META[toolId]

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url)
    }
  }, [result])

  async function handleRun() {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)

    try {
      const fields: Record<string, string> = {}
      if (toolId === 'unlockPdf' || toolId === 'protectPdf') {
        fields.password = password
      } else if (toolId === 'signPdf') {
        fields.signature = signature || 'Signed'
        fields.position = position
        fields.page = page
      } else if (toolId === 'redactPdf') {
        fields.page = page
        fields.x = redactBox.x
        fields.y = redactBox.y
        fields.width = redactBox.width
        fields.height = redactBox.height
      }

      const blob = await runServerPdfTool(toolId, file, fields)
      const stem = file.name.replace(/\.[^.]+$/, '') || 'document'
      const filename = `${stem}${meta.suffix}.${meta.ext}`
      const url = URL.createObjectURL(blob)
      setResult({ blob, filename, url })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <ToolHeader title={title} description={description} category={category} />

      <FileDrop
        accept=".pdf,application/pdf"
        multiple={false}
        onFiles={(files) => {
          setFile(files[0] ?? null)
          setResult(null)
          setError(null)
        }}
        label={file ? file.name : 'Drop a PDF file here'}
        hint="Processed on the MergePDF server"
      />

      {file && (
        <div className="space-y-4 rounded-xl border border-line bg-paper p-5">
          {(toolId === 'unlockPdf' || toolId === 'protectPdf') && (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-ink">
                {toolId === 'unlockPdf' ? 'PDF Password (if required)' : 'Password to set'}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={toolId === 'unlockPdf' ? 'Enter current password' : 'Enter a strong password'}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
          )}

          {toolId === 'signPdf' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-ink">Signature text</span>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-ink">Position</span>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-ink">Page</span>
                <input
                  type="number"
                  min={1}
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
              </label>
            </div>
          )}

          {toolId === 'redactPdf' && (
            <div className="grid gap-3 sm:grid-cols-5">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-ink">Page</span>
                <input
                  type="number"
                  min={1}
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
              </label>
              {(['x', 'y', 'width', 'height'] as const).map((field) => (
                <label key={field} className="block space-y-1">
                  <span className="text-xs font-semibold capitalize text-ink">{field} (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={redactBox[field]}
                    onChange={(e) =>
                      setRedactBox((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={handleRun}
            className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Processing…' : meta.action}
          </button>

          {error && (
            <p className="rounded-lg border border-bad/30 bg-bad-soft px-3.5 py-2.5 text-xs font-medium text-bad">
              {error}
            </p>
          )}
        </div>
      )}

      {result && meta.isPdf && <PdfPreview blob={result.blob} />}

      {result && (
        <DownloadBar>
          <a
            href={result.url}
            download={result.filename}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Download {result.filename}
          </a>
        </DownloadBar>
      )}
    </div>
  )
}
