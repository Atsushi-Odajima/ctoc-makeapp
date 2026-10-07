import { prisma } from "@/lib/db"

const STARTER_COMMUNITIES = [
  { slug: "morning-cafe", name: "朝カフェ部", description: "朝に立ち寄った店や、家で淹れた一杯を共有するコミュニティです。", category: "暮らし" },
  { slug: "weekend-walk", name: "週末さんぽ同好会", description: "近所の道から小旅行まで。歩いて見つけた景色を残します。", category: "おでかけ" },
  { slug: "oshikatsu", name: "ゆる推し活連絡網", description: "作品、音楽、スポーツなど、好きなものを穏やかに語る場所です。", category: "エンタメ" },
  { slug: "local-favorites", name: "地元の好き", description: "地元のお店、季節の風景、地域ニュースを持ち寄ります。", category: "地域" },
]

// Pre-existing behaviour: four starter communities (no members, no posts) are created on demand.
let ensured: Promise<unknown> | null = null

export async function ensureStarterCommunities() {
  if (ensured) return ensured
  ensured = prisma.$transaction(STARTER_COMMUNITIES.map(community => prisma.community.upsert({
    where: { slug: community.slug },
    create: community,
    update: {},
  }))).catch(error => {
    ensured = null
    throw error
  })
  return ensured
}
