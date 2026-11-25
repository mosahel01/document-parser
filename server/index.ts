import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { zipSync, strToU8 } from 'fflate'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const execFileAsync = promisify(execFile)
const PORT = Number(process.env.PORT ?? 3001)
const MAX_FILE_BYTES = 100 * 1024 * 1024

const app = Fastify({
  logger: true,
  bodyLimit: MAX_FILE_BYTES,
})

await app.register(multipart, {
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1,
  },
})

type UploadedFile = {
  filename: string
  buffer: Buffer
  fields: Record<string, string>
}

async function readUpload(req: { parts: () => AsyncIterableIterator<any> }): Promise<UploadedFile> {
  let filename = 'document.pdf'
  let buffer: Buffer | null = null
  const fields: Record<string, string> = {}

  for await (const part of req.parts()) {
    if (part.type === 'file') {
      filename = part.filename || filename
      buffer = await part.toBuffer()
    } else {
      fields[part.fieldname] = String(part.value ?? '')
    }
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('No PDF file was uploaded.')
  }

  return { filename, buffer, fields }
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'mergepdf-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function runGs(args: string[]): Promise<void> {
  try {
    await execFileAsync('gs', args, { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 })
  } catch (err: any) {
    const stderr = err?.stderr ? String(err.stderr).trim() : ''
    throw new Error(stderr || err?.message || 'Ghostscript processing failed.')
  }
}

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function extractPagesText(pdfBuffer: Buffer): Promise<string[][]> {
  // Use pdfjs-dist in Node to extract text lines per page cleanly
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  })
  const doc = await loadingTask.promise
  const pages: string[][] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const lines: string[] = []
    let currentLine = ''
    let lastY: number | null = null

    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      if (!item.str) continue
      const y = item.transform ? Math.round(item.transform[5]) : null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) lines.push(currentLine.trim())
        currentLine = item.str
      } else {
        currentLine += (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str
      }
      if (y !== null) lastY = y
    }
    if (currentLine.trim()) lines.push(currentLine.trim())
    pages.push(lines.length > 0 ? lines : ['(Empty page)'])
  }

  return pages
}

function buildPptx(pages: string[][]): Uint8Array {
  const files: Record<string, Uint8Array> = {}

  const slideRels = pages
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
    )
    .join('')

  const slideIds = pages
    .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`)
    .join('')

  const slideOverrides = pages
    .map(
      (_, i) =>
        `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
    )
    .join('')

  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideOverrides}
</Types>`,
  )

  files['_rels/.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
  )

  files['ppt/presentation.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>${slideIds}</p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
  )

  files['ppt/_rels/presentation.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${slideRels}
</Relationships>`,
  )

  pages.forEach((lines, i) => {
    const paragraphs = lines
      .slice(0, 28)
      .map(
        (line) =>
          `<a:p><a:r><a:rPr lang="en-US" sz="1400"/><a:t>${xmlEscape(line)}</a:t></a:r></a:p>`,
      )
      .join('')

    files[`ppt/slides/slide${i + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Content"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="5943600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${paragraphs}</p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`,
    )
  })

  return zipSync(files, { level: 6 })
}

function buildXlsx(pages: string[][]): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  const rows: string[] = []
  let rowIndex = 1

  pages.forEach((lines, pageIdx) => {
    rows.push(
      `<row r="${rowIndex}"><c r="A${rowIndex}" t="inlineStr"><is><t>Page ${pageIdx + 1}</t></is></c></row>`,
    )
    rowIndex++

    for (const line of lines) {
      const cells = line.split(/\s{2,}|\t+/).filter(Boolean)
      const cellXml = (cells.length > 0 ? cells : [line])
        .slice(0, 26)
        .map((cell, colIdx) => {
          const colLetter = String.fromCharCode(65 + colIdx)
          return `<c r="${colLetter}${rowIndex}" t="inlineStr"><is><t>${xmlEscape(cell)}</t></is></c>`
        })
        .join('')
      rows.push(`<row r="${rowIndex}">${cellXml}</row>`)
      rowIndex++
    }
  })

  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
  )

  files['_rels/.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  )

  files['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Extracted PDF" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
  )

  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
  )

  files['xl/worksheets/sheet1.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rows.join('')}</sheetData>
</worksheet>`,
  )

  return zipSync(files, { level: 6 })
}

app.get('/api/health', async () => ({ ok: true }))

app.post('/api/pdf/unlock', async (req, reply) => {
  const { buffer, fields } = await readUpload(req)
  const password = fields.password ?? ''

  const output = await withTempDir(async (dir) => {
    const inputPath = join(dir, 'input.pdf')
    const outputPath = join(dir, 'output.pdf')
    await writeFile(inputPath, buffer)

    const args = ['-q', '-dNOPAUSE', '-dBATCH', '-sDEVICE=pdfwrite']
    if (password) args.push(`-sPDFPassword=${password}`)
    args.push(`-sOutputFile=${outputPath}`, inputPath)

    await runGs(args)
    return readFile(outputPath)
  })

  return reply
    .type('application/pdf')
    .send(output)
})

app.post('/api/pdf/protect', async (req, reply) => {
  const { buffer, fields } = await readUpload(req)
  const userPassword = fields.password ?? ''
  const ownerPassword = fields.ownerPassword || userPassword

  if (!userPassword) {
    return reply.code(400).send({ error: 'A password is required to protect the PDF.' })
  }

  const output = await withTempDir(async (dir) => {
    const inputPath = join(dir, 'input.pdf')
    const outputPath = join(dir, 'output.pdf')
    await writeFile(inputPath, buffer)

    await runGs([
      '-q',
      '-dNOPAUSE',
      '-dBATCH',
      '-sDEVICE=pdfwrite',
      `-sOwnerPassword=${ownerPassword}`,
      `-sUserPassword=${userPassword}`,
      '-dEncryptionR=3',
      '-dKeyLength=128',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ])
    return readFile(outputPath)
  })

  return reply
    .type('application/pdf')
    .send(output)
})

app.post('/api/pdf/repair', async (req, reply) => {
  const { buffer } = await readUpload(req)

  const output = await withTempDir(async (dir) => {
    const inputPath = join(dir, 'input.pdf')
    const outputPath = join(dir, 'output.pdf')
    await writeFile(inputPath, buffer)

    await runGs([
      '-q',
      '-dNOPAUSE',
      '-dBATCH',
      '-sDEVICE=pdfwrite',
      '-dPDFSETTINGS=/default',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ])
    return readFile(outputPath)
  })

  return reply
    .type('application/pdf')
    .send(output)
})

app.post('/api/pdf/sign', async (req, reply) => {
  const { buffer, fields } = await readUpload(req)
  const signature = (fields.signature ?? '').trim() || 'Signed'
  const pageNumber = Math.max(1, Number(fields.page ?? 1) || 1)
  const position = fields.position ?? 'bottom-right'

  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pages = doc.getPages()
  const targetPage = pages[Math.min(pageNumber - 1, pages.length - 1)]
  const font = await doc.embedFont(StandardFonts.HelveticaBoldOblique)
  const { width, height } = targetPage.getSize()

  const fontSize = 18
  const textWidth = font.widthOfTextAtSize(signature, fontSize)
  const margin = 36

  let x = width - textWidth - margin
  let y = margin

  if (position === 'bottom-left') {
    x = margin
    y = margin
  } else if (position === 'top-right') {
    x = width - textWidth - margin
    y = height - margin - fontSize
  } else if (position === 'top-left') {
    x = margin
    y = height - margin - fontSize
  }

  targetPage.drawRectangle({
    x: x - 8,
    y: y - 6,
    width: textWidth + 16,
    height: fontSize + 14,
    borderColor: rgb(0.18, 0.42, 0.77),
    borderWidth: 1.5,
    color: rgb(0.95, 0.97, 1),
  })

  targetPage.drawText(signature, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0.11, 0.25, 0.5),
  })

  const bytes = await doc.save()
  return reply.type('application/pdf').send(Buffer.from(bytes))
})

app.post('/api/pdf/redact', async (req, reply) => {
  const { buffer, fields } = await readUpload(req)
  const xPct = Math.min(100, Math.max(0, Number(fields.x ?? 10) || 0))
  const yPct = Math.min(100, Math.max(0, Number(fields.y ?? 10) || 0))
  const wPct = Math.min(100, Math.max(1, Number(fields.width ?? 30) || 30))
  const hPct = Math.min(100, Math.max(1, Number(fields.height ?? 10) || 10))
  const pageNumber = Math.max(1, Number(fields.page ?? 1) || 1)

  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pages = doc.getPages()
  const targetPage = pages[Math.min(pageNumber - 1, pages.length - 1)]
  const { width, height } = targetPage.getSize()

  const rectW = (wPct / 100) * width
  const rectH = (hPct / 100) * height
  const rectX = (xPct / 100) * width
  const rectY = height - (yPct / 100) * height - rectH

  targetPage.drawRectangle({
    x: rectX,
    y: Math.max(0, rectY),
    width: rectW,
    height: rectH,
    color: rgb(0, 0, 0),
  })

  const bytes = await doc.save()
  return reply.type('application/pdf').send(Buffer.from(bytes))
})

app.post('/api/pdf/to-pptx', async (req, reply) => {
  const { buffer } = await readUpload(req)
  const pages = await extractPagesText(buffer)
  const pptx = buildPptx(pages)

  return reply
    .type('application/vnd.openxmlformats-officedocument.presentationml.presentation')
    .send(Buffer.from(pptx))
})

app.post('/api/pdf/to-xlsx', async (req, reply) => {
  const { buffer } = await readUpload(req)
  const pages = await extractPagesText(buffer)
  const xlsx = buildXlsx(pages)

  return reply
    .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .send(Buffer.from(xlsx))
})

app.setErrorHandler((error, _req, reply) => {
  const message = error instanceof Error ? error.message : 'Server processing failed.'
  reply.code(500).send({ error: message })
})

await app.listen({ port: PORT, host: '0.0.0.0' })
