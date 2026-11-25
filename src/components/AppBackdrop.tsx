/**
 * The decorative layer behind the whole app. Oversized translucent shapes
 * fade from the accent colour into the paper colour, in the spirit of the
 * printed-watermark background the reference layout uses. It is fixed and inert, so it
 * never intercepts a click or moves when the page scrolls.
 */
export function AppBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 1300"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="backdrop-a" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--paper)" />
          </linearGradient>
          <linearGradient id="backdrop-b" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--paper)" />
          </linearGradient>
          <linearGradient id="backdrop-c" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--paper)" />
            <stop offset="0.55" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--paper)" />
          </linearGradient>
        </defs>

        <g className="backdrop-shapes">
          {/* large circle bleeding off the top right */}
          <circle cx="1190" cy="210" r="260" fill="url(#backdrop-a)" />
          {/* soft ellipse low on the left */}
          <ellipse cx="120" cy="1010" rx="300" ry="300" fill="url(#backdrop-b)" />
          {/* rotated square, upper left */}
          <rect
            x="-120"
            y="250"
            width="430"
            height="430"
            transform="rotate(-45 95 465)"
            fill="url(#backdrop-c)"
          />
          {/* long rotated slab, lower right */}
          <rect
            x="820"
            y="1010"
            width="820"
            height="500"
            transform="rotate(-45 1230 1260)"
            fill="url(#backdrop-a)"
          />
          {/* circle clipped by the right edge */}
          <circle cx="1480" cy="600" r="250" fill="url(#backdrop-c)" />
          {/* small circle, bottom right */}
          <circle cx="1180" cy="1200" r="120" fill="url(#backdrop-b)" />
        </g>
      </svg>

      <div className="backdrop-wash absolute inset-0" />
    </div>
  )
}
