import { zipSync } from 'fflate'

/**
 * Hand a Blob to the browser as a download. The file never leaves the machine.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Revoking straight away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Read every file into memory and hand the browser one zip archive. */
export async function downloadZip(
  entries: { name: string; file: File }[],
  zipName = 'files.zip',
): Promise<void> {
  const contents: Record<string, Uint8Array> = {}

  for (const { name, file } of entries) {
    contents[name] = new Uint8Array(await file.arrayBuffer())
  }

  const archive = zipSync(contents)
  downloadBlob(new Blob([archive], { type: 'application/zip' }), zipName)
}
