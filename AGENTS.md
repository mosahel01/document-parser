# Project notes

This file records what we decided and why. It is for whoever works on this
project next, human or AI. Keep it current.

## What we are building

A website that handles everyday document chores: converting between formats,
renaming files in bulk, merging and splitting PDFs, compressing, and reading
Word documents.

**The product rule: process in the browser whenever possible.** A server is the
exception, used only where the browser genuinely cannot do the job.

### File first, then options

The Home tab is the entry point. You drop a file and its extension decides which
operations appear: an image offers conversion, a lone PDF offers split and PDF to
Word, several PDFs offer merge, a `.docx` offers reading and Word to PDF, text
offers find and replace, a zip or `.gz` offers unpacking. Rename, zip, and
compress always take the whole drop. Nothing is silently ignored: single-file
operations are offered only when that kind appears once, and a note says so.

`src/tools/fileKind.ts` makes that decision in one table, and each button hands
its files to an existing tool through `initialFiles` and `initialMode`. The tabs
stay as direct shortcuts; they are derived from the same tool object, so a tab
can never point at a tool that is not there.

### Rename semantics

Renaming means *setting the target name*: `abc.pdf` becomes `xyz.pdf` because the
user typed it. One name applies to the whole batch, numbered automatically
(`report-1.pdf`, `report-2.pdf`). A second, optional box replaces the extension
for every file; empty keeps each file's own. There are no find-and-replace rules
and no prefix or suffix options; rewording text inside a file is the find and
replace tool's job.

**Changing the extension converts the contents when the browser can.** An image
asked to be `.jpg` is redrawn as a JPEG, not just relabelled. The browser can
only write images (PNG, JPG, WebP) and a one-page PDF from an image, so any other
requested extension is refused with a reason and the file keeps its real one.
Shipping a PNG named `.docx` would be a lie, and worse than a refusal.

### Downloads

Every download button saves the real file under its own name and type. There is
no "download all as zip" wrapper: a batch saves one file at a time, spaced out
so browsers accept them. Zipping is a separate tool the user chooses on purpose.

Outputs made from several sources take a name that says where they came from
(`january-and-february.pdf`, `a-and-4-more.zip`); outputs from one source keep
its base name (`report-01.pdf`, `report.pdf.gz`). See `joinedBaseName`.

### Previews

Show what a file is before it is processed: `FilePreview` renders an image
thumbnail, the first lines of text, or a type badge. It never reads more than a
slice of the file, and refuses to treat an untyped SVG as a raster image.
`PdfPreview` shows a finished PDF in a frame, so merge, extract, and Word to PDF
can be checked before anything is saved. Find and replace shows the first match
in context twice, "now" and "after", instead of only counting matches.

### Look

The theme is a class on `<html>`, flipped by `ThemeToggle` and remembered in
`localStorage` under `document-toolkit-theme`; the inline script in `index.html`
sets it before the first paint, so a dark-mode visitor never sees a flash of
white. Every colour comes from a token in `index.css` (`paper`, `surface`,
`sunk`, `hover`, `line`, `edge`, `ink`, `muted`, `faint`, `accent`, `good`,
`bad`, `warn`). Components therefore carry no `dark:` variants: swapping the
token values under `.dark` restyles the whole app. Ubuntu and Ubuntu Mono are
bundled through `@fontsource`, so the page looks the same on a machine that has
never installed them. The column is `max-w-5xl`; the old narrow measure was
right for mono but wasted a wide screen.

## Who it is for

More than a handful of people, but not a large public product. Designed for many
concurrent visitors without accounts to start. Usage limits, storage, and
billing are deliberately deferred.

## Decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Language | TypeScript everywhere | One language; the owner is most comfortable in TS |
| Framework | React + Vite | Explicit and inspectable; no hidden conventions |
| Styling | Tailwind CSS v4 | Fast to write, readable in markup, nothing to architect yet |
| Colour and fonts | CSS tokens, Ubuntu bundled | One token set drives both themes; a bundled font looks the same everywhere |
| Backend later | Node + Fastify | Small, well documented, TypeScript friendly |
| Heavy jobs later | CLI tools in a container | Do not reimplement LibreOffice or Tesseract |
| Database | None for now | Add when there is real data worth keeping |
| Queue (Redis) | None for now | Add when in-process jobs actually hurt |
| File handling | Process, return, delete | No accounts and no storage means no privacy liability |
| Zip creation | `fflate` | Tiny, zero-dependency, browser-friendly. Needed for "download all" and reused by the zip tool |
| Tests | `vitest` | Reuses `vite.config.ts`, so imports and TypeScript resolve the same way as the app |
| PDF work | `pdf-lib` | Merge, split, and copy pages in plain JavaScript, no server |
| PDF preview | `pdfjs-dist` | Renders real page thumbnails; loaded only when the PDF tab opens |
| Image conversion | Canvas, no library | `drawImage` plus `toBlob` covers PNG, JPG, and WebP. A library would add weight for nothing |
| gzip | `CompressionStream`, no library | Built into every current browser; also works in Node, so the round trip is unit tested |
| DOCX reading | `fflate` plus string matching on `word/document.xml` | No new dependency and no DOM, so the parser is unit tested in Node. Styles beyond headings and lists are not needed for text output |
| DOCX writing | `fflate`, three-part package | Content types, one relationship, one body part. Small enough to be obviously correct, and Word, LibreOffice, and Google Docs open it |

## Known constraints

- **DOCX to HTML/Markdown is fine in the browser.** A DOCX is a zip of XML
  files, so it can be read with a zip library and an HTML parser.
- **Word to PDF and PDF to Word work in the browser, as text only.** Both
  directions move the words: headings, paragraphs, and lists, rendered in
  Helvetica on A4. Images, tables, columns, and the original fonts are dropped,
  and the UI says so instead of pretending the result is a facsimile.
- **Faithful page layout still needs a server.** LibreOffice is the only honest
  way to reproduce a Word document's pages, so that remains the Phase 2 job.
  Do not promise it client-side.
- **Browser work costs the visitor's CPU, not ours.** Long jobs should still
  report progress and be cancellable.
- **PDF limits are deliberate.** Thumbnails stop at 60 pages, a single-file
  split stops at 200, and a file over 100 MB is refused outright, because all of
  it runs synchronously on the main thread. Raise them only with a worker, not by
  deleting the check.
- **A PDF error names the file and the reason.** `npm test` checks that a broken
  file says so by name; the old catch-all hid which file failed and why. Some
  files parse and only break while pages are read, so the guard wraps the whole
  read, not just `PDFDocument.load`.
- **Find and replace only touches UTF-8 text.** Rewriting a Windows-1252 CSV or
  a binary as UTF-8 would corrupt it, so non-UTF-8 files are refused rather than
  guessed at. The cap is 20 MB per file.
- **Decompression is capped at 200 MB of output.** A small `.gz` can expand
  without limit; the reader counts bytes and stops.
- **OCR, office formats other than DOCX, and faithful DOCX to PDF remain server
  work.** They are refused in the UI with a reason, not attempted.

## Roadmap

- **Phase 0** — repository, build, one page that runs. *Done.*
- **Phase 1** — browser tools: file-first Home *(done)*, rename *(done, converts
  images)*, zip/unzip *(done)*, PDF merge/split *(done)*, image conversion
  *(done)*, find and replace *(done)*, gzip compress/decompress *(done)*, DOCX to
  HTML, Markdown, and text *(done)*, Word to PDF and PDF to Word as text *(done,
  basic)*.
- **Phase 2** — server and container for faithful DOCX to PDF and OCR.
- **Phase 3** — accounts, history, limits, expiry and cleanup.
- **Phase 4** — remaining features, decided later. An image editor (crop, resize,
  rotate) belongs here; it is a project of its own, not a tab.

## Conventions

- TypeScript strict mode is on. Do not weaken it to silence an error.
- One tool per file under `src/tools/`, each exporting a plain function that
  takes a `File` and returns a `Blob` or a result object. Keep them free of
  React so they can be tested on their own.
- UI components go in `src/components/`. `App.tsx` composes, it does not
  implement.
- No new dependency without a short note in this file explaining why it is
  needed and what it replaces.
- Run `npm run build` and `npm run lint` before calling work finished.

## Commands

```sh
npm run dev     # local server
npm run build   # type-check + production build
npm run lint    # oxlint
npm test        # unit tests
```
