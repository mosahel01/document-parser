import { useCallback, useEffect, useRef, useState } from 'react'
import { DownloadBar } from './DownloadBar'
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
  `rounded-[3px] px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
    active ? 'bg-hover text-ink shadow-xs' : 'text-muted hover:text-ink'
  }`

const PREVIEW_CHARACTERS = 3000

function TextSample({ text }: { text: string }) {
  const shown = text.slice(0, PREVIEW_CHARACTERS)

  return (
    <div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-[4px] bg-sunk p-3 font-mono text-xs text-ink">
        {shown}
      </pre>
      {text.length > shown.length && (
        <p className="mt-1 text-[11px] text-faint">
          Showing the first {PREVIEW_CHARACTERS} characters. The download is the
          whole document.
        </p>
      )}
    </div>
  )
}

export function WordTool({
  initialFiles,
  initialMode,
}: {
  initialFiles?: File[]
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'read')

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

  const open = useCallback(async (file: File, current: Mode) => {
    setBusy(true)
    setError(null)
    setSource(file)
    setBlocks(null)
    setPdf(null)
    setDocx(null)

    try {
      if (current === 'read') {
        setBlocks(await readDocx(file))
      } else if (current === 'toPdf') {
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
  }, [])

  // A file handed over by the Home screen is opened once, on arrival. The mode
  // travels with it, because state updates are not visible to this first run.
  const handedOver = useRef<{ file: File; mode: Mode } | null>(
    initialMode && initialFiles?.[0]
      ? { file: initialFiles[0], mode: initialMode }
      : null,
  )
  useEffect(() => {
    const started = handedOver.current
    if (!started) return
    handedOver.current = null
    void open(started.file, started.mode)
  }, [open])

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

  const ready =
    mode === 'read'
      ? Boolean(blocks && blocks.length > 0)
      : mode === 'toPdf'
        ? pdf !== null
        : docx !== null

  function save() {
    if (!source) return

    if (mode === 'read') {
      const { text, mime } = convertedText(source.name)
      downloadBlob(
        new Blob([text], { type: `${mime};charset=utf-8` }),
        replaceExtension(source.name, format),
      )
      return
    }

    if (mode === 'toPdf' && pdf) {
      downloadBlob(pdf, replaceExtension(source.name, 'pdf'))
      return
    }

    if (mode === 'fromPdf' && docx) {
      downloadBlob(docx.blob, replaceExtension(source.name, 'docx'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-[4px] border border-line bg-sunk p-0.5">
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
          if (chosen) void open(chosen, mode)
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

      {busy && <p className="text-xs text-muted">Reading document content...</p>}

      {error && (
        <p className="rounded-[5px] border border-bad/30 bg-bad-soft px-4 py-3 text-xs text-bad">
          {error}
        </p>
      )}

      {source && (
        <section className="rounded-[5px] border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <FilePreview name={source.name} blob={source} />
              <div className="min-w-0">
                <h2 className="truncate text-xs font-medium text-ink">
                  {outputName(source, mode)}
                </h2>
                <p className="font-mono text-[11px] text-faint">
                  {source.name} &bull; {formatSize(source.size)}
                </p>
              </div>
            </div>
          </header>

          <div className="p-4">
            {mode === 'read' && blocks && (
              <div className="space-y-3">
                <div className="inline-flex rounded-[4px] border border-line bg-sunk p-0.5">
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

                <TextSample text={convertedText(source.name).text} />
              </div>
            )}

            {mode === 'read' && blocks && blocks.length === 0 && (
              <p className="text-xs text-muted">
                This document has no text, so there is nothing to convert.
              </p>
            )}

            {mode === 'toPdf' && pdf && (
              <PdfPreview blob={pdf} title="The PDF this Word file becomes" />
            )}

            {mode === 'fromPdf' && docx && (
              <div className="space-y-2">
                <TextSample text={docx.paragraphs.join('\n\n')} />
                <p className="text-[11px] font-mono text-faint">
                  {docx.paragraphs.length}{' '}
                  {docx.paragraphs.length === 1 ? 'paragraph' : 'paragraphs'} found.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {source && ready && (
        <DownloadBar note={outputName(source, mode)}>
          <button
            type="button"
            onClick={save}
            className="rounded-[4px] bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-hover cursor-pointer"
          >
            Download {outputName(source, mode)}
          </button>
        </DownloadBar>
      )}
    </div>
  )
}
