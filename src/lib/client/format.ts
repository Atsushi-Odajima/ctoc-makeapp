// Times are stored in UTC by the server and rendered in the viewer's own locale/time zone.
// We never rely on the device clock for stored values (only for relative labels).

export function formatDateTime(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
  return new Intl.DateTimeFormat(undefined, opts).format(new Date(iso))
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime()) / 1000
  if (diff < 60) return "たった今"
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`
  return formatDateTime(iso, { month: "short", day: "numeric" })
}

/** Japanese day heading for the feed — 「今日」「昨日」「10月7日（火）」 — in the viewer's time zone. */
export function dateLine(iso: string, now = new Date()): { label: string; key: string } {
  const d = new Date(iso)
  const keyOf = (x: Date) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(x)
  const key = keyOf(d)
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (key === keyOf(now)) return { label: "今日", key }
  if (key === keyOf(y)) return { label: "昨日", key }
  const sameYear = d.getFullYear() === now.getFullYear()
  const label = new Intl.DateTimeFormat("ja-JP", { ...(sameYear ? {} : { year: "numeric" }), month: "long", day: "numeric", weekday: "short" }).format(d)
  return { label: label.replace(/\((.)\)/, "（$1）"), key }
}

export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}万`
  return n.toLocaleString("ja-JP")
}
