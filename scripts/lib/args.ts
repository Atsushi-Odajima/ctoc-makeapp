export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return undefined
  const v = process.argv[i + 1]
  return v && !v.startsWith("--") ? v : "true"
}

export function redact(url: string | undefined): string {
  return (url ?? "").replace(/\/\/([^:@/]+)(:[^@/]*)?@/, "//$1:***@")
}
