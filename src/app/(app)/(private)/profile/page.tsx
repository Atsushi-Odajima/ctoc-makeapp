import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getViewer } from "@/lib/api/viewer"
import { ProfileView } from "@/components/profile/ProfileView"

export const metadata: Metadata = { title: "自分" }

export default async function MyProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await getViewer()
  if (!viewer) redirect("/login")
  const { tab } = await searchParams
  const initial = tab === "drafts" || tab === "notes" || tab === "communities" ? tab : "posts"
  return <ProfileView username={viewer.username} self initialTab={initial} />
}
