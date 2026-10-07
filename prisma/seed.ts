import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

const USERS = [
  { email: "demo@example.com", name: "Keita Demo", username: "keita_demo", bio: "写真と日記が好き。東京のカフェと散歩多め。", avatar: "https://i.pravatar.cc/150?img=1", website: "https://example.com" },
  { email: "yuki@example.com", name: "Yuki Tanaka", username: "yuki_t", bio: "朝カフェ / 本屋 / 週末さんぽ。コメントはゆっくり返します。", avatar: "https://i.pravatar.cc/150?img=47" },
  { email: "haruka@example.com", name: "Haruka Sato", username: "haruka_s", bio: "ヨガと自然、やさしい暮らし。#平成っぽ日記", avatar: "https://i.pravatar.cc/150?img=25" },
  { email: "takeshi@example.com", name: "Takeshi Mori", username: "take_mori", bio: "海、写真、古い喫茶店。足あと歓迎です。", avatar: "https://i.pravatar.cc/150?img=11" },
  { email: "sakura@example.com", name: "Sakura Ito", username: "sakura_ito", bio: "イラストレーター。推し活と猫と甘いもの。", avatar: "https://i.pravatar.cc/150?img=30" },
  { email: "kenji@example.com", name: "Kenji Yamada", username: "kenji_y", bio: "エンジニア。ゲーム、山、深夜の日記。", avatar: "https://i.pravatar.cc/150?img=13" },
  { email: "ayaka@example.com", name: "Ayaka Nakamura", username: "ayaka_n", bio: "ダンス講師。音楽とポジティブな人が好き。", avatar: "https://i.pravatar.cc/150?img=45" },
  { email: "mana@example.com", name: "Mana Suzuki", username: "mana_s", bio: "横浜で写真を撮っています。海と夕方の光。", avatar: "https://i.pravatar.cc/150?img=32" },
]

const POSTS_DATA = [
  { username: "yuki_t", caption: "今日のモーニング。静かなカフェで本を読む時間、かなり回復する。#カフェ部 #朝カフェ", images: ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop"], location: "渋谷" },
  { username: "haruka_s", caption: "朝のヨガ終わり。無理に元気を出すより、呼吸を整える日もあっていい。#日記", images: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=800&fit=crop"], location: "代々木公園" },
  { username: "take_mori", caption: "早起きして海へ。波の音だけで一週間ぶん整う気がする。#おでかけ #写真", images: ["https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&h=800&fit=crop"], location: "鎌倉" },
  { username: "sakura_ito", caption: "新しいラフ。推しの概念カラーだけで描くの楽しい。#推しのいる生活 #イラスト", images: ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=800&fit=crop"] },
  { username: "kenji_y", caption: "週末の山。電波が薄い場所に行くと、逆にちゃんと戻ってこられる。#週末さんぽ", images: ["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=800&fit=crop"], location: "奥多摩" },
  { username: "ayaka_n", caption: "レッスン後の一枚。みんなで汗をかくと空気まで明るくなる。#ダンス", images: ["https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=800&fit=crop"], location: "渋谷" },
  { username: "mana_s", caption: "横浜の夕方。何もしない時間を写真に残したくなる光だった。#写真 #横浜", images: ["https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&h=800&fit=crop"], location: "横浜" },
  { username: "keita_demo", caption: "東京タワー近くを散歩。観光地っぽい場所も、平日の夜だと日記になる。#東京 #日常", images: ["https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=800&fit=crop"], location: "東京タワー" },
]

async function main() {
  console.log("Seeding Harenowa SNS...")
  const password = await hash("password123", 12)
  const userMap: Record<string, string> = {}

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, password, onboardingDone: true },
      update: { name: u.name, bio: u.bio, avatar: u.avatar, website: u.website, onboardingDone: true },
    })
    userMap[u.username] = user.id
  }

  const follows = [
    ["keita_demo", "yuki_t"], ["keita_demo", "haruka_s"], ["keita_demo", "take_mori"], ["keita_demo", "sakura_ito"], ["keita_demo", "mana_s"],
    ["yuki_t", "keita_demo"], ["yuki_t", "haruka_s"], ["haruka_s", "ayaka_n"], ["take_mori", "kenji_y"], ["sakura_ito", "ayaka_n"],
    ["mana_s", "keita_demo"], ["ayaka_n", "haruka_s"],
  ]
  for (const [fr, to] of follows) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: userMap[fr], followingId: userMap[to] } },
      create: { followerId: userMap[fr], followingId: userMap[to] },
      update: {},
    })
  }

  const communities = [
    { slug: "morning-cafe", name: "朝カフェ部", description: "朝に立ち寄った店や、家で淹れた一杯を共有するコミュニティです。", category: "暮らし" },
    { slug: "weekend-walk", name: "週末さんぽ同好会", description: "近所の道から小旅行まで。歩いて見つけた景色を残します。", category: "おでかけ" },
    { slug: "oshikatsu", name: "ゆる推し活連絡網", description: "作品、音楽、スポーツなど、好きなものを穏やかに語る場所です。", category: "エンタメ" },
    { slug: "local-favorites", name: "地元の好き", description: "地元のお店、季節の風景、地域ニュースを持ち寄ります。", category: "地域" },
  ]
  for (const data of communities) {
    const community = await prisma.community.upsert({ where: { slug: data.slug }, create: data, update: data })
    for (const username of ["keita_demo", "yuki_t", "haruka_s"]) {
      await prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: community.id, userId: userMap[username] } },
        create: { communityId: community.id, userId: userMap[username] },
        update: {},
      })
    }
  }

  await prisma.comment.deleteMany({})
  await prisma.like.deleteMany({})
  await prisma.story.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.footprint.deleteMany({})
  await prisma.post.deleteMany({})

  const postIds: string[] = []
  for (const p of POSTS_DATA) {
    const post = await prisma.post.create({
      data: { userId: userMap[p.username], caption: p.caption, images: JSON.stringify(p.images), location: p.location },
    })
    postIds.push(post.id)
  }

  const likers = ["keita_demo", "yuki_t", "haruka_s", "take_mori", "sakura_ito", "mana_s"]
  for (const postId of postIds) {
    for (const username of likers) {
      try { await prisma.like.create({ data: { userId: userMap[username], postId } }) } catch {}
    }
  }

  const comments = [
    { postIdx: 0, username: "keita_demo", content: "ここ行きたい。雰囲気まで良さそう。" },
    { postIdx: 0, username: "haruka_s", content: "朝カフェ部、参加したいです。" },
    { postIdx: 2, username: "mana_s", content: "光がきれい。海の写真もっと見たい。" },
    { postIdx: 3, username: "ayaka_n", content: "概念カラーでわかるの強い。" },
    { postIdx: 7, username: "yuki_t", content: "東京タワーって夜がいちばん日記になるね。" },
  ]
  for (const c of comments) {
    await prisma.comment.create({ data: { postId: postIds[c.postIdx], userId: userMap[c.username], content: c.content } })
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  for (const s of [
    { username: "yuki_t", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=700&fit=crop", caption: "朝カフェ中" },
    { username: "haruka_s", imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=700&fit=crop", caption: "朝ヨガ" },
    { username: "take_mori", imageUrl: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=700&fit=crop", caption: "海まで来た" },
    { username: "sakura_ito", imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=700&fit=crop", caption: "制作中" },
  ]) {
    await prisma.story.create({ data: { userId: userMap[s.username], imageUrl: s.imageUrl, caption: s.caption, expiresAt } })
  }

  const demoId = userMap.keita_demo
  for (const n of [
    { type: "like", fromUserId: userMap.yuki_t, postId: postIds[7], content: "あなたの投稿にいいねしました" },
    { type: "follow", fromUserId: userMap.haruka_s, content: "あなたをフォローしました" },
    { type: "comment", fromUserId: userMap.take_mori, postId: postIds[7], content: "東京タワーいいですね" },
    { type: "like", fromUserId: userMap.sakura_ito, postId: postIds[7], content: "あなたの投稿にいいねしました" },
  ]) {
    await prisma.notification.create({ data: { userId: demoId, ...n } })
  }

  for (const v of ["yuki_t", "haruka_s", "take_mori", "sakura_ito", "mana_s"]) {
    await prisma.footprint.create({ data: { visitorId: userMap[v], visitedId: demoId } })
  }

  console.log("Seed complete. Login: demo@example.com / password123")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
