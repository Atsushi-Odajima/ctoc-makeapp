import { prisma } from "@/lib/db"

const STARTER_COMMUNITIES = [
  { slug: "morning-cafe", name: "朝カフェ部", description: "朝に立ち寄った店や、家で淹れた一杯を共有するコミュニティです。", category: "暮らし" },
  { slug: "weekend-walk", name: "週末さんぽ同好会", description: "近所の道から小旅行まで。歩いて見つけた景色を残します。", category: "おでかけ" },
  { slug: "oshikatsu", name: "ゆる推し活連絡網", description: "作品、音楽、スポーツなど、好きなものを穏やかに語る場所です。", category: "エンタメ" },
  { slug: "local-favorites", name: "地元の好き", description: "地元のお店、季節の風景、地域ニュースを持ち寄ります。", category: "地域" },
]

export async function ensureStarterCommunities() {
  await prisma.$transaction(STARTER_COMMUNITIES.map(community => prisma.community.upsert({
    where: { slug: community.slug },
    create: community,
    update: {},
  })))
}

export function makeCommunitySlug(name: string) {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
  return `${ascii || "community"}-${Date.now().toString(36)}`
}
