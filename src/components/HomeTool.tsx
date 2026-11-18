import { useState } from 'react'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import {
  batchOperationsFor,
  groupFiles,
  missingActionNote,
  operationsFor,
  type HomeOperation,
} from '../tools/fileKind'

type HomeToolProps = {
  onStart: (operation: HomeOperation) => void
}

const SUPPORTED = [
  ['PDF', 'Merge several, split or extract pages, save pages as images, compress, crop, number, or watermark.'],
  ['Word', 'Convert a .docx to PDF, HTML, Markdown, or text.'],
  ['Images', 'Convert to PNG, JPG, WebP, or a PDF, or crop, resize, and rotate one at a time.'],
  ['Text', 'Find and replace across a batch, or turn a file into a PDF or Word document.'],
  ['Zip and .gz', 'Unpack what is inside, or pack anything into one archive.'],
]

function OperationButton({
  operation,
  onStart,
}: {
  operation: HomeOperation
  onStart: (operation: HomeOperation) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onStart(operation)}
      className="w-full rounded-lg border border-edge bg-surface px-4 py-2.5 text-left hover:border-accent hover:bg-hover"
    >
      <span className="block text-sm font-medium text-ink">
        {operation.label}
      </span>
      <span className="mt-0.5 block text-sm text-muted">
        {operation.hint}
      </span>
    </button>
  )
}

/**
 * The entry point: files first, options second. Every button hands its files to
 * an existing tool, so this screen holds no processing of its own.
 */
export function HomeTool({ onStart }: HomeToolProps) {
  const [files, setFiles] = useState<File[]>([])

  const groups = groupFiles(files)
  const batch = batchOperationsFor(files)

  return (
    <div className="space-y-8">
      <FileDrop
        onFiles={(incoming) => setFiles([...files, ...incoming])}
        label="Drop a file to see what it can do"
        hint="Any type. Its extension decides the options, and nothing is uploaded."
      />

      {files.length === 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-sm font-medium text-ink">
            What this handles
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            {SUPPORTED.map(([name, line]) => (
              <div key={name} className="flex gap-3">
                <dt className="w-24 shrink-0 font-medium text-ink">
                  {name}
                </dt>
                <dd className="text-muted">{line}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted">
            Other file types can still be renamed, zipped, and compressed.
          </p>
        </section>
      )}

      <FileList
        files={files}
        onRemove={(index) =>
          setFiles(files.filter((_, position) => position !== index))
        }
        onClear={() => setFiles([])}
      />

      {groups.map((group) => {
        const operations = operationsFor(group)
        const note = missingActionNote(group)

        return (
          <section
            key={group.kind}
            className="rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="text-sm font-medium text-ink">{group.label}</h2>

            {operations.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {operations.map((operation) => (
                  <OperationButton
                    key={`${operation.tool}-${'mode' in operation ? operation.mode : 'only'}`}
                    operation={operation}
                    onStart={onStart}
                  />
                ))}
              </div>
            )}

            {note && <p className="mt-3 text-sm text-muted">{note}</p>}
          </section>
        )
      })}

      {groups.length > 1 && (
        <p className="text-sm text-muted">
          Mixed types are handled one kind at a time. The actions below take the
          whole batch.
        </p>
      )}

      {batch.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-sm font-medium text-ink">
            The whole batch
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {batch.map((operation) => (
              <OperationButton
                key={operation.tool}
                operation={operation}
                onStart={onStart}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
