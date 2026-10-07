import type { Metadata } from "next"
import { Conversation } from "@/components/dm/Conversation"

export const metadata: Metadata = { title: "DM" }

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <Conversation id={id} />
}
