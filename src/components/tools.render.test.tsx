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
      renderToString(
        <HomeTool onStart={() => {}} onSelectTool={() => {}} />,
      ).length,
    ).toBeGreaterThan(100)

    // The app crashed once because a tab existed without a tool behind it.
    // Nav categories are now grouped into dropdowns: check that the category
    // labels and the brand name appear.
    const page = renderToString(<App />)
    for (const label of [
      'MergePDF',
      'PDF',
      'Images',
      'Documents',
      'Archive',
    ]) {
      expect(page).toContain(label)
    }
  })

  it('shows the tool directory, planned heavy tools, and footer links', () => {
    const page = renderToString(<App />)

    // The directory is one grid with filters, so the default view must carry
    // both the tools that work today and the ones still waiting on a server.
    for (const label of [
      'All tools',
      'Popular',
      'Coming soon',
      'Unlock PDF',
      'Protect PDF',
      'OCR PDF',
    ]) {
      expect(page).toContain(label)
    }

    // The footer links are icons only, but keep real destinations and names
    // for screen readers. It must not bring back the old "Why us" block.
    expect(page).toContain('https://github.com/mosahel01/mergepdf')
    expect(page).toContain('https://x.com/mo1sahilkhan')
    expect(page).toContain('aria-label="Source on GitHub"')
    expect(page).toContain('aria-label="Mo Sahil Khan on X"')
    expect(page).not.toContain('Why us')
  })
})
