import type { Metadata } from "next"
import { enabledOAuthProviders } from "@/lib/auth-providers"
import { LoginForm } from "@/components/auth/LoginForm"

export const metadata: Metadata = { title: "ログイン" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; deleted?: string; error?: string }> }) {
  const { callbackUrl, deleted, error } = await searchParams
  const safe = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/feed"
  return <LoginForm providers={enabledOAuthProviders()} callbackUrl={safe} deleted={deleted === "1"} oauthError={!!error} />
}
