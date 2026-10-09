// The DayNet mark: two outlined triangles at different angles; the overlap is the shared place.
// Geometry is the canonical one from design/DayNet/assets/logo_mark.svg (viewBox 0 0 108 100).
// Do not regularise the triangles, mirror them, or turn them into a play button / letter.
// In-app colours follow the UI tokens (ink + accent).
interface Props {
  size?: number
  variant?: "default" | "reverse" | "mono"
  title?: string // omit for decorative use (alt="" semantics)
  className?: string
}

export function DayNetMark({ size = 24, variant = "default", title, className }: Props) {
  const back = variant === "reverse" ? "#F7F6F2" : "#20211F"
  const front = variant === "mono" ? "#20211F" : "#B84432"
  return (
    <svg
      viewBox="0 0 108 100"
      width={(size * 108) / 100}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <path d="M18 20L79 38L35 88Z" fill="none" stroke={back} strokeWidth="9" strokeLinejoin="round" />
      <path d="M58 10L90 75L20 62Z" fill="none" stroke={front} strokeWidth="9" strokeLinejoin="round" />
    </svg>
  )
}
