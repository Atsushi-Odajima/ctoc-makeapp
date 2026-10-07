import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getViewer } from "@/lib/api/viewer"
import { ModerationQueue } from "@/components/settings/ModerationQueue"

export const metadata: Metadata = { title: "通報の確認", robots: { index: false } }

// Role-checked on the server. The APIs check the role again on every call.
export default async function ReportsPage() {
  const viewer = await getViewer()
  if (!viewer || (viewer.role !== "MODERATOR" && viewer.role !== "ADMIN")) notFound()
  return <ModerationQueue />
}
