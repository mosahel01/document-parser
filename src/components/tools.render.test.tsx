import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import App from '../App'
import { HomeTool } from './HomeTool'
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

  it('renders the home screen with a tab for every tool', () => {
    expect(
      renderToString(<HomeTool onStart={() => {}} />).length,
    ).toBeGreaterThan(100)

    // The app crashed once because a tab existed without a tool behind it.
    const page = renderToString(<App />)
    for (const label of [
      'Home',
      'PDF',
      'Word',
      'Zip',
      'Replace',
      'Images',
      'Compress',
      'Rename',
    ]) {
      expect(page).toContain(label)
    }
  })
})
