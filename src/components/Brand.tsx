type BrandMarkProps = {
  className?: string
}

/** The red rounded-square mark used in the header, footer and empty states. */
export function BrandMark({ className = 'size-8' }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        d="M8 24V10l5-3 5 3 5-3v14l-5 3-5-3-5 3z"
        fill="#ffffff"
        fillOpacity=".92"
      />
      <rect x="13" y="10" width="2" height="12" rx="1" fill="var(--accent)" />
    </svg>
  )
}

type BrandWordmarkProps = {
  /** Footer uses a light wordmark on a dark background. */
  inverse?: boolean
  className?: string
}

export function BrandWordmark({
  inverse = false,
  className = '',
}: BrandWordmarkProps) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className={inverse ? 'text-accent' : 'text-accent'}>Merge</span>
      <span className={inverse ? 'text-white' : 'text-ink'}>PDF</span>
    </span>
  )
}
