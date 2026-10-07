import { redirect } from "next/navigation"
import { getViewer } from "@/lib/api/viewer"

// Pages that only make sense signed in. Authorization of data is still enforced by the APIs.
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (!viewer) redirect("/login")
  return children
}
