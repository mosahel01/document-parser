import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Without a worker, pdf.js decodes pages on the main thread and the UI freezes.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjs }
