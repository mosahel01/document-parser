import { describe, expect, it } from 'vitest'
import {
  decodeXml,
  docxToHtml,
  docxToMarkdown,
  docxToText,
  parseDocument,
  readDocx,
  type DocxBlock,
} from './docx'
import { docxFromParagraphs } from './docxWriter'

const paragraph = (body: string, style?: string) => {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''
  return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${body}</w:t></w:r></w:p>`
}

describe('decodeXml', () => {
  it('decodes named and numeric escapes', () => {
    expect(decodeXml('a &amp; b &lt;c&gt; &#65; &#x42;')).toBe('a & b <c> A B')
  })

  it('leaves an unknown escape alone', () => {
    expect(decodeXml('&bogus;')).toBe('&bogus;')
  })
})

describe('parseDocument', () => {
  it('reads headings, body text, and list items', () => {
    const xml = `<w:body>
      ${paragraph('Report', 'Heading1')}
      ${paragraph('Some body text')}
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>First point</w:t></w:r></w:p>
      ${paragraph('Two')}
    </w:body>`

    expect(parseDocument(xml)).toEqual<DocxBlock[]>([
      { text: 'Report', level: 1, list: false },
      { text: 'Some body text', level: 0, list: false },
      { text: 'First point', level: 0, list: true },
      { text: 'Two', level: 0, list: false },
    ])
  })

  it('joins the runs of one paragraph and keeps their spacing', () => {
    const xml =
      '<w:p><w:r><w:t>Hello</w:t></w:r><w:r><w:t xml:space="preserve"> world</w:t></w:r></w:p>'

    expect(parseDocument(xml)[0].text).toBe('Hello world')
  })

  it('skips empty paragraphs', () => {
    expect(parseDocument('<w:p><w:pPr/><w:r><w:t></w:t></w:r></w:p>')).toEqual([])
  })

  it('ignores a heading name this tool does not know', () => {
    expect(parseDocument(paragraph('Note', 'Quote'))[0].level).toBe(0)
  })
})

describe('converted output', () => {
  const blocks: DocxBlock[] = [
    { text: 'Report', level: 1, list: false },
    { text: 'Intro', level: 0, list: false },
    { text: 'One', level: 0, list: true },
    { text: 'Two <&>', level: 0, list: true },
  ]

  it('writes plain text with list markers', () => {
    expect(docxToText(blocks)).toBe('Report\n\nIntro\n\n- One\n\n- Two <&>')
  })

  it('writes markdown headings and bullets', () => {
    expect(docxToMarkdown(blocks)).toBe(
      '# Report\n\nIntro\n\n- One\n\n- Two <&>',
    )
  })

  it('writes a complete HTML page with escaped text', () => {
    const html = docxToHtml(blocks, 'Report')

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<h1>Report</h1>')
    expect(html).toContain('<ul>\n<li>One</li>\n<li>Two &lt;&amp;&gt;</li>\n</ul>')
    expect(html).toContain('<title>Report</title>')
  })
})

describe('docx round trip', () => {
  it('writes a document it can read back, entities included', async () => {
    const blob = docxFromParagraphs(['Report', 'Fish & chips <today>', 'Last'])
    const blocks = await readDocx(new File([blob], 'report.docx'))

    expect(blocks.map((block) => block.text)).toEqual([
      'Report',
      'Fish & chips <today>',
      'Last',
    ])
  })

  it('refuses something that is not a zip', async () => {
    await expect(readDocx(new File(['not a docx'], 'notes.docx'))).rejects.toThrow(
      'could not be opened as a Word document',
    )
  })

  it('says so when the archive has no body part', async () => {
    const { zipSync } = await import('fflate')
    const other = zipSync({ 'word/styles.xml': new TextEncoder().encode('<x/>') })

    await expect(
      readDocx(
        new File([other as Uint8Array<ArrayBuffer>], 'empty.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ),
    ).rejects.toThrow('no document body')
  })
})
