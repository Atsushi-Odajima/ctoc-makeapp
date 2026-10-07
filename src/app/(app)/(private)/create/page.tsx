import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getViewer } from "@/lib/api/viewer"
import { Composer } from "@/components/create/Composer"

export const metadata: Metadata = { title: "投稿" }

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ community?: string }> }) {
  const viewer = await getViewer()
  if (!viewer) redirect("/login?callbackUrl=/create")
  if (!viewer.profileComplete) redirect("/onboarding?next=/create")
  const { community } = await searchParams
  return <Composer userId={viewer.id} isPrivate={viewer.isPrivate} initialCommunity={community ?? null} />
}
