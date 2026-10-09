import type { Metadata } from "next"
import { ExploreView } from "@/components/explore/ExploreView"

export const metadata: Metadata = { title: "さがす" }

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return <ExploreView initialQuery={typeof q === "string" ? q.slice(0, 100) : ""} />
}
