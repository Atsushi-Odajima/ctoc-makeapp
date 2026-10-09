// Geometric community symbol (decorative). Same family of shapes as the brand, no letters,
// drawn in the UI tokens (ink + accent on a neutral tint).
function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const TINTS = ["#E4E2DA", "#E9DDD6", "#DCE2DA"]

export function CommunitySymbol({ seed, size = 48 }: { seed: string; size?: number }) {
  const v = hash(seed) % 3
  const bg = TINTS[hash(seed + "b") % TINTS.length]
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: size, height: size, borderRadius: Math.round(size * 0.2), background: bg }}>
      <svg viewBox="0 0 40 40" width={size * 0.56} height={size * 0.56} focusable="false">
        {v === 0 && <><path d="m3 33 17-29 17 29Z" fill="#B84432" /><circle cx="21" cy="25" r="10" fill="#20211F" /></>}
        {v === 1 && <><path d="M6 6h22v22H6z" fill="#20211F" /><circle cx="27" cy="27" r="12" fill="#B84432" /></>}
        {v === 2 && <><circle cx="15" cy="15" r="11" fill="#B84432" /><path d="m18 36 10-17 10 17Z" fill="#20211F" /></>}
      </svg>
    </span>
  )
}
