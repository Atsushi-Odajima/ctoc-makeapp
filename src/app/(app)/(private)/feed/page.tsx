import type { Metadata } from "next"
import { FeedView } from "@/components/feed/FeedView"

export const metadata: Metadata = { title: "ホーム" }

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const value = tab === "communities" || tab === "discover" ? tab : "following"
  return <FeedView tab={value} />
}
