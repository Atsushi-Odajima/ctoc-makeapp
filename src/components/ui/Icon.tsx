// One outline icon family: 24-unit grid, 20-unit live area, 1.75 stroke, round caps and joins,
// currentColor. Filled variants (heart, bookmark, home…) reuse the same outline so selected and
// unselected states keep the same visual size. Decorative unless a label is passed.
import type { SVGProps } from "react"

const PATHS = {
  arrow: <path d="M4.5 12h15m-6-6 6 6-6 6" />,
  back: <path d="M19.5 12h-15m6-6-6 6 6 6" />,
  bell: <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5Zm3.5 2.5a2 2 0 0 0 4 0" />,
  bookmark: <path d="M6.5 3.75h11v16.5L12 16.25l-5.5 4Z" />,
  camera: <><path d="M3.5 8.25A1.75 1.75 0 0 1 5.25 6.5H8l1.5-2.25h5L16 6.5h2.75a1.75 1.75 0 0 1 1.75 1.75v9.5a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75Z" /><circle cx="12" cy="12.75" r="3.5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  community: <><circle cx="9" cy="8.5" r="3.25" /><path d="M3.25 19.5a5.75 5.75 0 0 1 11.5 0" /><path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8M17.5 14.2a5.75 5.75 0 0 1 3.25 5.3" /></>,
  empathy: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14.25a4.25 4.25 0 0 0 7 0M9 9.75h.01M15 9.75h.01" /></>,
  heart: <path d="M12 19.75s-7.75-4.5-7.75-10A4.25 4.25 0 0 1 12 7.3a4.25 4.25 0 0 1 7.75 2.45c0 5.5-7.75 10-7.75 10Z" />,
  home: <path d="M4 10.25 12 4l8 6.25V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" />,
  lock: <><rect x="5.5" y="10.5" width="13" height="9.5" rx="1.75" /><path d="M8.5 10.5V7.75a3.5 3.5 0 0 1 7 0v2.75" /></>,
  message: <path d="M20 11.6a7.8 7.8 0 0 1-11.2 7l-4.55 1.15 1.2-4.2A7.8 7.8 0 1 1 20 11.6Z" />,
  send: <path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4Z" />,
  more: <><circle cx="5.5" cy="12" r="1.25" /><circle cx="12" cy="12" r="1.25" /><circle cx="18.5" cy="12" r="1.25" /></>,
  play: <path d="M8 5.5v13l10.5-6.5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  create: <><rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4" /><path d="M12 8v8M8 12h8" /></>,
  search: <><circle cx="10.75" cy="10.75" r="6.5" /><path d="m15.5 15.5 4.75 4.75" /></>,
  share: <path d="M12 15V3.75m-4 4 4-4 4 4M8 10.5H6.25A1.25 1.25 0 0 0 5 11.75v7A1.25 1.25 0 0 0 6.25 20h11.5A1.25 1.25 0 0 0 19 18.75v-7a1.25 1.25 0 0 0-1.25-1.25H16" />,
  user: <><circle cx="12" cy="8.25" r="3.75" /><path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" /></>,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  up: <path d="m6.5 14.5 5.5-5.5 5.5 5.5" />,
  down: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.25m0 12.5v2.25M3.5 12h2.25m12.5 0h2.25M6 6l1.6 1.6m8.8 8.8L18 18M6 18l1.6-1.6m8.8-8.8L18 6" /></>,
  image: <><rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2" /><circle cx="9" cy="10" r="1.75" /><path d="m4 17 5-4.25 3.5 3 2.75-2 4.75 3.75" /></>,
  video: <><rect x="3.5" y="6" width="12.5" height="12" rx="2" /><path d="m16 10.25 4.5-2.5v8.5l-4.5-2.5" /></>,
  stack: <><rect x="7.5" y="7.5" width="12.5" height="12.5" rx="1.5" /><path d="M4 16.5V5.5A1.5 1.5 0 0 1 5.5 4h11" /></>,
  grid: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" /></>,
  note: <><path d="M6.5 3.75h8l3 3v13.5h-11Z" /><path d="M9 11h6M9 14.5h6M9 7.75h3" /></>,
  flag: <path d="M5.5 20.5v-16m0 0h11l-2 4 2 4h-11" />,
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7m-8 0 .9 12.25a1 1 0 0 0 1 .75h7.2a1 1 0 0 0 1-.75L17.5 7" />,
  edit: <path d="M4.5 19.5 5.4 15.8 15.6 5.6a1.8 1.8 0 0 1 2.55 0l.25.25a1.8 1.8 0 0 1 0 2.55L8.2 18.6Z" />,
  eye: <><path d="M2.75 12S6 5.75 12 5.75 21.25 12 21.25 12 18 18.25 12 18.25 2.75 12 2.75 12Z" /><circle cx="12" cy="12" r="2.75" /></>,
  mute: <><path d="M2.75 12S6 5.75 12 5.75c1.6 0 3 .45 4.25 1.1M21.25 12S18 18.25 12 18.25c-1.6 0-3-.45-4.25-1.1" /><path d="m4 20 16-16" /></>,
  expand: <path d="M4.5 9V4.5H9M19.5 9V4.5H15M4.5 15v4.5H9m10.5-4.5v4.5H15" />,
  download: <path d="M12 3.75V15m-4.5-4.5L12 15l4.5-4.5M4.5 19.5h15" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.75v.01" /></>,
  alert: <><path d="M12 4 21 19.5H3Z" /><path d="M12 10v4.25M12 17v.01" /></>,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.25h-4.25" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5S9.6 5.9 12 3.5Z" /></>,
} as const

export type IconName = keyof typeof PATHS

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName
  size?: number
  label?: string
  filled?: boolean
}

export function Icon({ name, size = 24, label, filled = false, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
