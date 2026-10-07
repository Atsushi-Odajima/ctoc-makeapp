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

/** "TODAY / 10.07 WED" style date line (Outfit), in the viewer's time zone. */
export function dateLine(iso: string, now = new Date()): { label: string; key: string } {
  const d = new Date(iso)
  const key = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
  const todayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  const yesterdayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(y)
  const md = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit" }).format(d).replace("/", ".")
  const wd = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d).toUpperCase()
  const prefix = key === todayKey ? "TODAY / " : key === yesterdayKey ? "YESTERDAY / " : ""
  return { label: `${prefix}${md} ${wd}`, key }
}

export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}万`
  return n.toLocaleString("ja-JP")
}
