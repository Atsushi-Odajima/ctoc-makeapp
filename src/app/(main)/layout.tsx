import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InstagramNav } from "@/components/layout/InstagramNav"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const onboardingDone = (session.user as { onboardingDone?: boolean }).onboardingDone
  if (!onboardingDone) redirect("/onboarding")
  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col border-x border-[#dfe3e8] bg-white">
      <main className="flex-1 overflow-hidden">{children}</main>
      <InstagramNav />
    </div>
  )
}
