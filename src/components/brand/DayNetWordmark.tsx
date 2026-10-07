/* eslint-disable @next/next/no-img-element */
// Horizontal logo = the supplied outlined SVG (text already converted to paths), used as-is so
// it renders identically regardless of installed fonts. Never re-typeset the logotype.
interface Props {
  width?: number
  reverse?: boolean
  markOnly?: boolean
  decorative?: boolean
  className?: string
}

export function DayNetWordmark({ width = 165, reverse = false, decorative = false, className }: Props) {
  const src = reverse ? "/brand/logo_horizontal_reverse.svg" : "/brand/logo_horizontal.svg"
  // viewBox 4620 x 1170
  const height = Math.round((width * 1170) / 4620)
  return <img src={src} width={width} height={height} alt={decorative ? "" : "DayNet"} className={className} draggable={false} />
}
