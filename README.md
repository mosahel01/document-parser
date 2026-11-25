# MergePDF

A website for working with documents: converting formats, renaming, merging,
splitting, compressing, cropping, numbering, watermarking, and making PDFs from
photos, plus reading Word files.

The guiding rule: **light work happens in the browser**. Only tasks that truly
need a real machine (like faithful DOCX to PDF) will ever touch a server. That
keeps the product private, cheap to run, and simple to reason about.

## Status

Phase 1, browser-only: merge and split PDFs, edit their pages (rotate, delete,
copy, reorder, pull pages in from another file), compress a PDF by redrawing its
pages, crop margins, add page numbers or a watermark, save pages as JPG or PNG,
and make one PDF from several photos. Also zip and unzip, find and replace, gzip
compression, photo crop/resize/straighten, and renaming (which converts the
contents when the new extension asks for it).

One Convert tab moves a file between formats: photos to PNG, JPG, WebP, or PDF;
PDFs and Word files to each other; any of them to HTML, Markdown, or text; text
to PDF or Word. It offers only the formats every dropped file can reach, and
each result is previewed before you save it.

PDF compression and PDF-to-image work redraw each page, so the UI says plainly
when text stops being selectable. Cropping changes the page's visible box without
rewriting its contents. Every finished PDF is previewed before it is saved.

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
  App.tsx         the page you see: tabs, titles, and which tool is open
  index.css       global styles and design tokens (Tailwind)
  components/     React UI pieces, Home included
  tools/          plain functions that do the actual document work
  lib/            small shared helpers with no domain logic
public/           static files served as-is
```

The split matters: nothing in `tools/` imports React, so the logic can be tested
and reused without a browser render.

Start at Home: drop any file and its type decides the buttons. Each button hands
the files to the matching tool, and every tab still opens the same tool directly.
The light/dark switch sits in the header and remembers the choice.

See `AGENTS.md` for the decisions behind the code and the plan ahead.
