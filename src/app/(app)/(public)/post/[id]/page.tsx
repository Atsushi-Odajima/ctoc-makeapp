import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { visiblePostWhere } from "@/lib/policies/posts"
import { PostDetail } from "@/components/post/PostDetail"

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string; posted?: string }> }

// OGP is computed as an ANONYMOUS viewer: only public posts get a title/description; restricted
// or missing posts expose nothing but the brand name and the generic brand image.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = /^[A-Za-z0-9_-]{1,64}$/.test(id)
    ? await prisma.post.findFirst({ where: { AND: [visiblePostWhere(null), { id }] }, select: { caption: true, user: { select: { name: true } } } })
    : null
  if (!post) return { title: { absolute: "DayNet" }, robots: { index: false }, openGraph: { title: "DayNet", description: undefined } }
  const excerpt = (post.caption ?? "").replace(/\s+/g, " ").slice(0, 80)
  const title = `${post.user.name}さんの投稿`
  return { title, description: excerpt || undefined, openGraph: { title: `${title} | DayNet`, description: excerpt || undefined } }
}

export default async function PostPage({ params, searchParams }: Props) {
  const { id } = await params
  const { edit, posted } = await searchParams
  return <PostDetail id={id} startEditing={edit === "1"} justPosted={posted === "1"} />
}
