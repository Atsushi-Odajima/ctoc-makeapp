import { AppShell } from "@/components/layout/AppShell"
import { ViewerProvider } from "@/components/layout/ViewerContext"
import { getShellViewer } from "@/lib/shell-viewer"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getShellViewer()
  return (
    <ViewerProvider viewer={viewer}>
      <AppShell>{children}</AppShell>
    </ViewerProvider>
  )
}
