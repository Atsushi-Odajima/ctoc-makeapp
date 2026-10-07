// Which OAuth providers are enabled is decided only by the presence of their credentials.
// Variable names are unchanged from the previous auth.ts / .env.example.
export type OAuthProviderId = "google" | "facebook" | "line"

export function enabledOAuthProviders(): OAuthProviderId[] {
  const out: OAuthProviderId[] = []
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) out.push("google")
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) out.push("facebook")
  if (process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET) out.push("line")
  return out
}
