import { zipSync } from 'fflate'

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function documentXml(paragraphs: string[]): string {
  const body = paragraphs
    .map((paragraph) => {
      if (paragraph.trim() === '') return '<w:p/>'
      return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body>
</w:document>`
}

/**
 * Build the smallest .docx that Word, LibreOffice, and Google Docs all open:
 * content types, the package relationship, and one body part. No styles,
 * headers, or fonts, because the text came out of a PDF without any of that.
 */
export function docxFromParagraphs(paragraphs: string[]): Blob {
  const encoder = new TextEncoder()

  const packed = zipSync({
    '[Content_Types].xml': encoder.encode(CONTENT_TYPES),
    '_rels/.rels': encoder.encode(RELATIONSHIPS),
    'word/document.xml': encoder.encode(documentXml(paragraphs)),
  })

  return new Blob([packed as Uint8Array<ArrayBuffer>], { type: DOCX_MIME })
}
