// 24-unit icons from design/DayNet/assets/icons (stroke 1.7, currentColor). Decorative by default.
import type { SVGProps } from "react"

const PATHS = {
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  bell: <path d="M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3zm4 12h4" />,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v14H3z" /><circle cx="12" cy="13" r="4" /></>,
  check: <path d="m4 12 5 5L20 6" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  community: <><circle cx="8" cy="8" r="3" /><path d="M2 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 1 1 0 6m2 4a5 5 0 0 1 4 5" /></>,
  empathy: <><circle cx="12" cy="12" r="9" /><path d="M7 10h2m6 0h2m-9 5q4 3 8 0" /></>,
  heart: <path d="M12 21 3.7 13A5.5 5.5 0 0 1 12 5.8 5.5 5.5 0 0 1 20.3 13Z" />,
  home: <path d="m3 10 9-7 9 7v10H4V10m5 10v-7h6v7" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4" /></>,
  message: <path d="M3 4h18v13H9l-6 4z" />,
  more: <><circle cx="4" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="20" cy="12" r="1" /></>,
  play: <path d="m8 4 12 8-12 8z" />,
  plus: <path d="M12 4v16M4 12h16" />,
  search: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></>,
  share: <path d="M12 16V3m-5 5 5-5 5 5M5 12H3v9h18v-9h-2" />,
  user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m3 18 6-5 4 3 3-2 5 4" /></>,
  video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  trash: <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" />,
  edit: <path d="m4 20 1-4L16 5l3 3L8 19zM14 7l3 3" />,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5" />,
  download: <path d="M12 3v13m-5-5 5 5 5-5M4 20h16" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v1" /></>,
} as const

export type IconName = keyof typeof PATHS

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName
  size?: number
  label?: string
  filled?: boolean
}

export function Icon({ name, size = 23, label, filled = false, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
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
