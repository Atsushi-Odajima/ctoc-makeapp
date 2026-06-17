import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InstagramNav } from "@/components/layout/InstagramNav"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const onboardingDone = (session.user as { onboardingDone?: boolean }).onboardingDone
  if (!onboardingDone) redirect("/onboarding")
  return (
    <div className="flex flex-col h-dvh bg-[#FAFAFA] max-w-lg mx-auto">
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <InstagramNav />
    </div>
  )
}
