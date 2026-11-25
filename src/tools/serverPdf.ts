export type ServerPdfToolId =
  | 'unlockPdf'
  | 'protectPdf'
  | 'signPdf'
  | 'repairPdf'
  | 'redactPdf'
  | 'pdfToPowerPoint'
  | 'pdfToExcel'

const ENDPOINT_BY_TOOL: Record<ServerPdfToolId, string> = {
  unlockPdf: '/api/pdf/unlock',
  protectPdf: '/api/pdf/protect',
  signPdf: '/api/pdf/sign',
  repairPdf: '/api/pdf/repair',
  redactPdf: '/api/pdf/redact',
  pdfToPowerPoint: '/api/pdf/to-pptx',
  pdfToExcel: '/api/pdf/to-xlsx',
}

export async function runServerPdfTool(
  toolId: ServerPdfToolId,
  file: File,
  fields: Record<string, string> = {},
): Promise<Blob> {
  const form = new FormData()
  form.append('file', file, file.name)
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value)
  }

  const response = await fetch(ENDPOINT_BY_TOOL[toolId], {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    let message = `Server error (${response.status})`
    try {
      const data = (await response.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(message)
  }

  return response.blob()
}
