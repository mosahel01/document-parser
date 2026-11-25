/** A rectangle in PDF points, measured from the bottom-left of the page. */
export type Box = { x: number; y: number; width: number; height: number }

/** How much to take off each side, as a percentage of the visible page. */
export type CropMargins = {
  top: number
  right: number
  bottom: number
  left: number
}

export type CropBox = Box

/**
 * The crop box a page would get. The margins are read against the page as it is
 * seen, so 10% off the top of a sideways scan still takes the visible top.
 */
export function cropBoxFor(
  base: Box,
  margins: CropMargins,
  rotation = 0,
): CropBox {
  const sideways = rotation === 90 || rotation === 270
  const visibleWidth = sideways ? base.height : base.width
  const visibleHeight = sideways ? base.width : base.height

  const top = (margins.top / 100) * visibleHeight
  const right = (margins.right / 100) * visibleWidth
  const bottom = (margins.bottom / 100) * visibleHeight
  const left = (margins.left / 100) * visibleWidth

  let boxLeft: number
  let boxRight: number
  let boxTop: number
  let boxBottom: number

  switch (rotation) {
    case 90:
      // The visible top is the page's left edge, and so on clockwise.
      boxLeft = top
      boxTop = right
      boxRight = bottom
      boxBottom = left
      break
    case 180:
      boxLeft = right
      boxTop = bottom
      boxRight = left
      boxBottom = top
      break
    case 270:
      boxLeft = bottom
      boxTop = left
      boxRight = top
      boxBottom = right
      break
    default:
      boxLeft = left
      boxTop = top
      boxRight = right
      boxBottom = bottom
  }

  return {
    x: base.x + boxLeft,
    y: base.y + boxBottom,
    width: base.width - boxLeft - boxRight,
    height: base.height - boxTop - boxBottom,
  }
}

/** True when the margins are valid and leave a page with some area. */
export function cropMarginsAreValid(margins: CropMargins): boolean {
  const values = [margins.top, margins.right, margins.bottom, margins.left]
  return (
    values.every((value) => Number.isFinite(value) && value >= 0) &&
    margins.left + margins.right < 100 &&
    margins.top + margins.bottom < 100
  )
}
