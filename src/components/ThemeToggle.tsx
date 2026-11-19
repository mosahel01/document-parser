import { useEffect, useState } from 'react'

const KEY = 'document-toolkit-theme'

type Theme = 'light' | 'dark' | 'system'

/**
 * Which concrete theme is applied to the page right now.
 */
function appliedTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * What the user chose, or 'system' if they never stored a preference. The
 * inline script in `index.html` already applied the first paint, so this only
 * reads that decision back.
 */
function storedPreference(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // A blocked localStorage only means the choice is not remembered.
  }
  return 'system'
}

function prefersDark(): boolean {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function applyTheme(choice: Theme) {
  const dark = choice === 'dark' || (choice === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * A three-state theme toggle: light → dark → system → light. Clicking cycles
 * through them and pressing the icon always works. When set to "system" the
 * page follows `prefers-color-scheme` and updates live if the OS changes.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Theme>(storedPreference)
  const dark = appliedTheme() === 'dark'

  // Follow OS changes when the choice is "system".
  useEffect(() => {
    if (choice !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    function sync() {
      applyTheme('system')
      // Force a re-render so the icon updates.
      setChoice('system')
    }
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [choice])

  function cycle() {
    const order: Theme[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(choice) + 1) % order.length]
    setChoice(next)
    applyTheme(next)
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      // A blocked localStorage only means the choice is not remembered.
    }
  }

  const labels: Record<Theme, string> = {
    light: 'Light — click for dark',
    dark: 'Dark — click for system',
    system: `System (${dark ? 'dark' : 'light'}) — click for light`,
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={labels[choice]}
      title={labels[choice]}
      className="relative flex items-center gap-1.5 rounded-[4px] border border-line bg-surface px-2.5 py-1.5 text-xs text-muted hover:border-edge hover:bg-hover hover:text-ink cursor-pointer"
    >
      {choice === 'system' ? (
        /* monitor icon */
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ) : dark ? (
        /* sun icon */
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      ) : (
        /* moon icon */
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
        </svg>
      )}
      <span className="text-xs font-medium">
        {choice === 'system' ? 'Auto' : choice === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  )
}
