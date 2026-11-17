import { useState } from 'react'
import { FileDrop } from './FileDrop'
import { FilePreview } from './FilePreview'
import { PdfPreview } from './PdfPreview'
import { downloadBlob } from '../tools/download'
import {
  docxToHtml,
  docxToMarkdown,
  docxToText,
  readDocx,
  type DocxBlock,
} from '../tools/docx'
import { docxToPdf } from '../tools/docxToPdf'
import { pdfToDocx } from '../tools/pdfToDocx'
import { replaceExtension } from '../tools/rename'
import { formatSize } from '../lib/format'

type Mode = 'read' | 'toPdf' | 'fromPdf'
type Format = 'html' | 'md' | 'txt'

const DOCX_ACCEPT =
  '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const MODES: { id: Mode; label: string }[] = [
  { id: 'read', label: 'Word to HTML, Markdown, or text' },
  { id: 'toPdf', label: 'Word to PDF' },
  { id: 'fromPdf', label: 'PDF to Word' },
]

const FORMATS: { id: Format; label: string; mime: string }[] = [
  { id: 'html', label: 'HTML', mime: 'text/html' },
  { id: 'md', label: 'Markdown', mime: 'text/markdown' },
  { id: 'txt', label: 'Text', mime: 'text/plain' },
]

const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
  }`

const PREVIEW_CHARACTERS = 3000

function TextSample({ text }: { text: string }) {
  const shown = text.slice(0, PREVIEW_CHARACTERS)

  return (
    <div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
        {shown}
      </pre>
      {text.length > shown.length && (
        <p className="mt-1 text-xs text-slate-400">
          Showing the first {PREVIEW_CHARACTERS} characters. The download is the
          whole document.
        </p>
      )}
    </div>
  )
}

export function WordTool() {
  const [mode, setMode] = useState<Mode>('read')

  const [source, setSource] = useState<File | null>(null)
  const [blocks, setBlocks] = useState<DocxBlock[] | null>(null)
  const [format, setFormat] = useState<Format>('html')

  const [pdf, setPdf] = useState<Blob | null>(null)
  const [docx, setDocx] = useState<{ blob: Blob; paragraphs: string[] } | null>(
    null,
  )

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset(next: Mode) {
    setMode(next)
    setSource(null)
    setBlocks(null)
    setPdf(null)
    setDocx(null)
    setError(null)
    setBusy(false)
  }

  async function open(file: File) {
    setBusy(true)
    setError(null)
    setSource(file)
    setBlocks(null)
    setPdf(null)
    setDocx(null)

    try {
      if (mode === 'read') {
        setBlocks(await readDocx(file))
      } else if (mode === 'toPdf') {
        setPdf(await docxToPdf(file))
      } else {
        setDocx(await pdfToDocx(file))
      }
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'That file could not be converted.',
      )
    } finally {
      setBusy(false)
    }
  }

  function convertedText(fileName: string): { text: string; mime: string } {
    if (!blocks) return { text: '', mime: 'text/plain' }
    const mime =
      FORMATS.find((option) => option.id === format)?.mime ?? 'text/plain'

    if (format === 'html') return { text: docxToHtml(blocks, fileName), mime }
    if (format === 'md') return { text: docxToMarkdown(blocks), mime }
    return { text: docxToText(blocks), mime }
  }

  function outputName(file: File, current: Mode): string {
    if (current === 'read') return replaceExtension(file.name, format)
    if (current === 'toPdf') return replaceExtension(file.name, 'pdf')
    return replaceExtension(file.name, 'docx')
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => reset(option.id)}
            className={tabClass(mode === option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <FileDrop
        onFiles={(incoming) => {
          const chosen = incoming[0]
          if (chosen) void open(chosen)
        }}
        accept={mode === 'fromPdf' ? '.pdf,application/pdf' : DOCX_ACCEPT}
        multiple={false}
        label={
          mode === 'fromPdf' ? 'Drop the PDF to read' : 'Drop the Word file'
        }
        hint={
          mode === 'toPdf'
            ? 'Text only: paragraphs and headings, on A4. Images and exact layout need a server, so they are left out.'
            : mode === 'fromPdf'
              ? 'The words come across in reading order. Images and layout do not.'
              : 'A .docx file. Older .doc files need to be saved as .docx first.'
        }
      />

      {busy && <p className="text-sm text-slate-500">Working…</p>}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {source && (
        <section className="rounded-xl border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FilePreview name={source.name} blob={source} />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-medium text-slate-700">
                  {outputName(source, mode)}
                </h2>
                <p className="text-sm text-slate-500">
                  {source.name} · {formatSize(source.size)}
                </p>
              </div>
            </div>

            {mode !== 'read' && (
              <button
                type="button"
                onClick={() => {
                  if (mode === 'toPdf' && pdf) {
                    downloadBlob(pdf, replaceExtension(source.name, 'pdf'))
                  }
                  if (mode === 'fromPdf' && docx) {
                    downloadBlob(docx.blob, replaceExtension(source.name, 'docx'))
                  }
                }}
                disabled={(mode === 'toPdf' && !pdf) || (mode === 'fromPdf' && !docx)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Download
              </button>
            )}
          </header>

          <div className="p-5">
            {mode === 'read' && blocks && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex gap-1 rounded-lg border border-slate-300 p-1">
                    {FORMATS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFormat(option.id)}
                        className={tabClass(format === option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const { text, mime } = convertedText(source.name)
                      downloadBlob(
                        new Blob([text], { type: `${mime};charset=utf-8` }),
                        replaceExtension(source.name, format),
                      )
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Download
                  </button>
                </div>

                <TextSample text={convertedText(source.name).text} />
              </div>
            )}

            {mode === 'read' && blocks && blocks.length === 0 && (
              <p className="text-sm text-slate-500">
                This document has no text, so there is nothing to convert.
              </p>
            )}

            {mode === 'toPdf' && pdf && (
              <PdfPreview blob={pdf} title="The PDF this Word file becomes" />
            )}

            {mode === 'fromPdf' && docx && (
              <div className="space-y-2">
                <TextSample text={docx.paragraphs.join('\n\n')} />
                <p className="text-xs text-slate-400">
                  {docx.paragraphs.length}{' '}
                  {docx.paragraphs.length === 1 ? 'paragraph' : 'paragraphs'} found.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
