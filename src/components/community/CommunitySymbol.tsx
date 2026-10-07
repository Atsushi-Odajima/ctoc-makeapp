// Geometric community symbol (decorative). Same family of shapes as the brand, no letters.
function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function CommunitySymbol({ seed, size = 50 }: { seed: string; size?: number }) {
  const v = hash(seed) % 3
  const bg = ["#E2DDF0", "#F8D5CC", "#ECE7F3"][hash(seed + "b") % 3]
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: bg }}>
      <svg viewBox="0 0 40 40" width={size * 0.62} height={size * 0.62} focusable="false">
        {v === 0 && <><path d="m3 33 17-29 17 29Z" fill="#EF7C68" /><circle cx="21" cy="25" r="10" fill="#302B38" /></>}
        {v === 1 && <><path d="M6 6h22v22H6z" fill="#302B38" /><circle cx="27" cy="27" r="12" fill="#EF7C68" /></>}
        {v === 2 && <><circle cx="15" cy="15" r="11" fill="#EF7C68" /><path d="m18 36 10-17 10 17Z" fill="#302B38" /></>}
      </svg>
    </span>
  )
}
