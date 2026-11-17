# Document Toolkit

A website for working with documents: converting formats, renaming, merging,
splitting, compressing, and reading Word files.

The guiding rule: **light work happens in the browser**. Only tasks that truly
need a real machine (like faithful DOCX to PDF) will ever touch a server. That
keeps the product private, cheap to run, and simple to reason about.

## Status

Phase 1, browser-only: merge and split PDFs, zip and unzip, find and replace,
image and Word conversions, gzip compression, and renaming (which converts an
image when the extension changes).

Word files can be read as HTML, Markdown, or plain text, and the words can move
between Word and PDF in either direction. That transfer keeps paragraphs,
headings, and lists; it does not keep images, tables, fonts, or exact page
layout. A faithful Word to PDF needs LibreOffice, so that stays server work.

## Requirements

- Node.js 22 or newer (`node -v` to check)

## Commands

```sh
npm install     # install dependencies, run once after cloning
npm run dev     # start the dev server at http://localhost:5173
npm run build   # type-check and build for production
npm run lint    # check code for mistakes
npm test        # run the unit tests
```

## Layout

```
src/
  main.tsx        entry point, mounts React into index.html
  App.tsx         the page you see
  index.css       global styles (Tailwind)
  components/     React UI pieces
  tools/          plain functions that do the actual document work
  lib/            small shared helpers with no domain logic
public/           static files served as-is
```

The split matters: nothing in `tools/` imports React, so the logic can be tested
and reused without a browser render.

See `AGENTS.md` for the decisions behind the code and the plan ahead.
