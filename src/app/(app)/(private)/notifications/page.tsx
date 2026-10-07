import type { Metadata } from "next"
import { NotificationsView } from "@/components/settings/NotificationsView"

export const metadata: Metadata = { title: "お知らせ" }

export default function NotificationsPage() {
  return <NotificationsView />
}
