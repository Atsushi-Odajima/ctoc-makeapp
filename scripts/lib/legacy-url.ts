// Parse a public Cloudinary delivery URL (legacy /image/upload/ assets) into its public id.
// e.g. https://res.cloudinary.com/<cloud>/image/upload/c_limit,w_1080/v1718600000/feeld/abc.jpg
export function parseCloudinaryUploadUrl(raw: string): { cloud: string; resourceType: string; publicId: string; version: string | null } | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.hostname !== "res.cloudinary.com") return null
  const parts = url.pathname.split("/").filter(Boolean)
  const [cloud, resourceType, type, ...rest] = parts
  if (!cloud || !resourceType || type !== "upload" || !rest.length) return null
  const versionIndex = rest.findIndex(p => /^v\d+$/.test(p))
  const afterVersion = versionIndex >= 0 ? rest.slice(versionIndex + 1) : rest.filter(p => !p.includes(","))
  if (!afterVersion.length) return null
  const publicId = decodeURIComponent(afterVersion.join("/")).replace(/\.[a-z0-9]+$/i, "")
  return { cloud, resourceType, publicId, version: versionIndex >= 0 ? rest[versionIndex]!.slice(1) : null }
}
