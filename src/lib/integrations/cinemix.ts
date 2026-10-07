// CinemiX (sibling app) — FUTURE boundary only.
// Nothing here is wired to an API route: there is no shared login, no account matching, no
// automatic posting and no data transfer in v4. Any future import must be (1) explicitly
// requested by the user (consent), (2) verified on the server (checksum + media re-validated
// through MediaProvider), and (3) go through the normal post creation path (ACL, rate limits).
export const FEATURE_CINEMIX_IMPORT = false as const

export interface CinemixDraft {
  version: 1
  source: "cinemix"
  externalId: string
  mediaRef: string
  caption?: string
  checksum: string
}

export function cinemixImportEnabled(): boolean {
  return FEATURE_CINEMIX_IMPORT
}
