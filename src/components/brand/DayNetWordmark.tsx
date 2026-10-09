import { DayNetMark } from "./DayNetMark"

// Header lockup: the DayNet mark + the brand name set in Barlow Condensed SemiBold. The name is
// tracked slightly open and sized against the mark (cap height ≈ mark height × 0.7) so it reads as
// a logotype rather than body text. Height is driven by `size` (mark height in px).
interface Props {
  size?: number
  reverse?: boolean
  decorative?: boolean
  className?: string
}

export function DayNetWordmark({ size = 22, reverse = false, decorative = false, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-[0.32em] ${reverse ? "text-canvas" : "text-ink"} ${className}`} style={{ fontSize: size * 1.18 }} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : "DayNet"}>
      <DayNetMark size={size} variant={reverse ? "reverse" : "default"} />
      <span aria-hidden className="font-[family-name:var(--font-label)] font-semibold leading-none tracking-[0.035em]">DayNet</span>
    </span>
  )
}
