# Project notes

This file records what we decided and why. It is for whoever works on this
project next, human or AI. Keep it current.

## What we are building

A website that handles everyday document chores: converting between formats,
renaming files in bulk, merging and splitting PDFs, compressing, and reading
Word documents.

**The product rule: process in the browser whenever possible.** A server is the
exception, used only where the browser genuinely cannot do the job.

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
| Backend later | Node + Fastify | Small, well documented, TypeScript friendly |
| Heavy jobs later | CLI tools in a container | Do not reimplement LibreOffice or Tesseract |
| Database | None for now | Add when there is real data worth keeping |
| Queue (Redis) | None for now | Add when in-process jobs actually hurt |
| File handling | Process, return, delete | No accounts and no storage means no privacy liability |

## Known constraints

- **DOCX to HTML/Markdown is fine in the browser.** A DOCX is a zip of XML
  files, so it can be read with a zip library and an HTML parser.
- **DOCX to PDF is not realistic in the browser.** Faithful page layout needs a
  real layout engine (LibreOffice). This is the first task that justifies a
  server. Do not promise it client-side.
- **Browser work costs the visitor's CPU, not ours.** Long jobs should still
  report progress and be cancellable.

## Roadmap

- **Phase 0** — repository, build, one page that runs. *Done.*
- **Phase 1** — browser tools: rename, zip/unzip, PDF merge/split, image
  conversion, DOCX to HTML/Markdown.
- **Phase 2** — server and container for DOCX to PDF and OCR.
- **Phase 3** — accounts, history, limits, expiry and cleanup.
- **Phase 4** — remaining features, decided later.

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
```
