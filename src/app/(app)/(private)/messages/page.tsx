import type { Metadata } from "next"
import { ConversationList } from "@/components/dm/ConversationList"

export const metadata: Metadata = { title: "DM" }

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ box?: string }> }) {
  const { box } = await searchParams
  return <ConversationList box={box === "requests" ? "requests" : "inbox"} />
}
