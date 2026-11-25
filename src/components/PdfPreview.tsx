import { useEffect, useMemo } from 'react'

type PdfPreviewProps = {
  blob: Blob
  title?: string
}

/**
 * Show a PDF without leaving the page. Renderers live in the browser, so this
 * costs nothing until the preview is opened. A tab that refuses frames (mobile
 * Safari) still shows the download button next to this panel.
 */
export function PdfPreview({ blob, title = 'Preview' }: PdfPreviewProps) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])

  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div className="relative w-full" style={{ aspectRatio: '210 / 297' }}>
      <iframe
        src={url}
        title={title}
        className="absolute inset-0 h-full w-full border border-line bg-surface"
      />
    </div>
  )
}
