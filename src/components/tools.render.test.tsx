import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RenameTool } from './RenameTool'
import { ZipTool } from './ZipTool'
import { ReplaceTool } from './ReplaceTool'
import { ConvertTool } from './ConvertTool'
import { CompressTool } from './CompressTool'
import { WordTool } from './WordTool'

// No DOM here, so this only proves the first paint of every tool survives an
// empty file list. That is the crash a visitor would meet before dropping
// anything, and it needs no browser to check.
describe('first paint', () => {
  it('renders every browser-only tool without files', () => {
    for (const Tool of [
      RenameTool,
      ZipTool,
      ReplaceTool,
      ConvertTool,
      CompressTool,
      WordTool,
    ]) {
      expect(renderToString(<Tool />).length).toBeGreaterThan(100)
    }
  })
})
