import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getViewer } from "@/lib/api/viewer"
import { Onboarding } from "@/components/profile/Onboarding"

export const metadata: Metadata = { title: "プロフィールの3項目" }

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const viewer = await getViewer()
  if (!viewer) redirect("/login?callbackUrl=/onboarding")
  const { next } = await searchParams
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: viewer.id },
    select: { strengthOptionId: true, weaknessOptionId: true, hobbies: { orderBy: { position: "asc" }, select: { optionId: true } } },
  })
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/feed"
  return (
    <Onboarding
      userId={viewer.id}
      editing={viewer.profileComplete}
      next={safeNext}
      initial={{ strength: user.strengthOptionId, weakness: user.weaknessOptionId, hobbies: user.hobbies.map(h => h.optionId) }}
    />
  )
}
