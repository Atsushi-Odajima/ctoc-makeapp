import type { Metadata } from "next"
import { CommunityList } from "@/components/community/CommunityList"

export const metadata: Metadata = { title: "集まり" }

export default function CommunitiesPage() {
  return <CommunityList />
}
