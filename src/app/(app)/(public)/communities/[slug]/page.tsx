import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { CommunityDetail } from "@/components/community/CommunityDetail"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const c = await prisma.community.findUnique({ where: { slug }, select: { name: true, description: true, isPrivate: true } })
  if (!c) return { title: { absolute: "DayNet" } }
  return { title: c.name, description: c.description.slice(0, 120) }
}

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params
  return <CommunityDetail slug={slug} />
}
