# Document Toolkit

A website for working with documents: converting formats, renaming, merging,
splitting, compressing, and reading Word files.

The guiding rule: **light work happens in the browser**. Only tasks that truly
need a real machine (like faithful DOCX to PDF) will ever touch a server. That
keeps the product private, cheap to run, and simple to reason about.

## Status

Phase 0: the skeleton runs. None of the tools work yet.

## Requirements

- Node.js 22 or newer (`node -v` to check)

## Commands

```sh
npm install     # install dependencies, run once after cloning
npm run dev     # start the dev server at http://localhost:5173
npm run build   # type-check and build for production
npm run lint    # check code for mistakes
```

## Layout

```
src/
  main.tsx      entry point, mounts React into index.html
  App.tsx       the page you see
  index.css     global styles (Tailwind)
public/         static files served as-is
```

See `AGENTS.md` for the decisions behind the code and the plan ahead.
