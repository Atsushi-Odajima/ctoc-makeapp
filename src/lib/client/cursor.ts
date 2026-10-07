// Same encoding as the server (base64url of "<ISO time>|<id>").
export function encodeCursorClient(iso: string, id: string): string {
  const raw = `${new Date(iso).toISOString()}|${id}`
  const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(raw))) : Buffer.from(raw).toString("base64")
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
