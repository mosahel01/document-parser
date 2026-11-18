import { describe, expect, it } from 'vitest'
import { MIN_CROP_SIDE, clampRect, matchingSide, rotatedSize } from './image'

describe('rotatedSize', () => {
  it('swaps the sides for a quarter turn', () => {
    expect(rotatedSize(1200, 800, 90)).toEqual({ width: 800, height: 1200 })
    expect(rotatedSize(1200, 800, 270)).toEqual({ width: 800, height: 1200 })
  })

  it('leaves the sides alone for a half turn or none', () => {
    expect(rotatedSize(1200, 800, 180)).toEqual({ width: 1200, height: 800 })
    expect(rotatedSize(1200, 800, 0)).toEqual({ width: 1200, height: 800 })
  })
})

describe('clampRect', () => {
  const bounds = { width: 1000, height: 600 }

  it('keeps a crop that already fits', () => {
    expect(clampRect({ x: 100, y: 50, width: 300, height: 200 }, bounds)).toEqual(
      { x: 100, y: 50, width: 300, height: 200 },
    )
  })

  it('pulls a crop that runs off the edge back inside', () => {
    expect(
      clampRect({ x: 900, y: -20, width: 300, height: 200 }, bounds),
    ).toEqual({ x: 700, y: 0, width: 300, height: 200 })
  })

  it('refuses to collapse to a point', () => {
    const rect = clampRect({ x: 10, y: 10, width: 0, height: -5 }, bounds)

    expect(rect.width).toBe(MIN_CROP_SIDE)
    expect(rect.height).toBe(MIN_CROP_SIDE)
  })

  it('never returns a crop bigger than the picture', () => {
    const rect = clampRect({ x: 0, y: 0, width: 4000, height: 4000 }, bounds)

    expect(rect).toEqual({ x: 0, y: 0, width: 1000, height: 600 })
  })
})

describe('matchingSide', () => {
  const natural = { width: 1600, height: 900 }

  it('keeps the shape when a width is typed', () => {
    expect(matchingSide(natural, 'width', 800)).toEqual({
      width: 800,
      height: 450,
    })
  })

  it('keeps the shape when a height is typed', () => {
    expect(matchingSide(natural, 'height', 300)).toEqual({
      width: 533,
      height: 300,
    })
  })

  it('never asks for a side below one pixel', () => {
    expect(matchingSide({ width: 100, height: 2000 }, 'height', 1)).toEqual({
      width: 1,
      height: 1,
    })
  })
})
