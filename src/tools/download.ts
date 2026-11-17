export type DownloadItem = { blob: Blob; name: string }

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

/**
 * Save several files as themselves, one download each. Browsers ignore a burst
 * of clicks, so they are spaced out. The browser may ask once to allow
 * multiple downloads.
 */
export async function downloadEach(items: DownloadItem[]): Promise<void> {
  for (const item of items) {
    downloadBlob(item.blob, item.name)
    await new Promise((resolve) => window.setTimeout(resolve, 250))
  }
}
