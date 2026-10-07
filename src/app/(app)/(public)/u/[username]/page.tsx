import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { ProfileView } from "@/components/profile/ProfileView"

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findFirst({
    where: { username: { equals: decodeURIComponent(username), mode: "insensitive" }, status: "ACTIVE" },
    select: { name: true, username: true },
  })
  // Display name is public profile information; nothing else goes into metadata.
  return user ? { title: `${user.name}（@${user.username}）` } : { title: { absolute: "DayNet" }, robots: { index: false } }
}

export default async function UserPage({ params }: Props) {
  const { username } = await params
  return <ProfileView username={decodeURIComponent(username)} self={false} />
}
