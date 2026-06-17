import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

const USERS = [
  { email: "demo@example.com", name: "Keita Demo", username: "keita_demo", bio: "📸 写真と旅行が好き | Tokyo based", avatar: "https://i.pravatar.cc/150?img=1", website: "https://example.com" },
  { email: "yuki@example.com", name: "Yuki Tanaka", username: "yuki_t", bio: "☕ カフェ巡り | 料理研究家🍳 | 東京→大阪", avatar: "https://i.pravatar.cc/150?img=47" },
  { email: "haruka@example.com", name: "Haruka Sato", username: "haruka_s", bio: "🌸 ヨガインストラクター | 自然派ライフ🌿", avatar: "https://i.pravatar.cc/150?img=25" },
  { email: "takeshi@example.com", name: "Takeshi Mori", username: "take_mori", bio: "🏄 サーファー | 📷 フォトグラファー | 鎌倉在住", avatar: "https://i.pravatar.cc/150?img=11" },
  { email: "sakura@example.com", name: "Sakura Ito", username: "sakura_ito", bio: "🎨 イラストレーター | アニメ好き🎌 | 猫派🐱", avatar: "https://i.pravatar.cc/150?img=30" },
  { email: "kenji@example.com", name: "Kenji Yamada", username: "kenji_y", bio: "💻 エンジニア | 🎮 ゲーマー | 山登り⛰️", avatar: "https://i.pravatar.cc/150?img=13" },
  { email: "ayaka@example.com", name: "Ayaka Nakamura", username: "ayaka_n", bio: "💃 ダンス講師 | 🎵 音楽好き | ポジティブ思考✨", avatar: "https://i.pravatar.cc/150?img=45" },
  { email: "ryota@example.com", name: "Ryota Kobayashi", username: "ryota_k", bio: "👨‍🍳 料理人 | 🌎 旅行記録 | 食べ歩き大好き", avatar: "https://i.pravatar.cc/150?img=15" },
  { email: "mana@example.com", name: "Mana Suzuki", username: "mana_s", bio: "📸 写真家志望 | 🌊 海好き | 横浜", avatar: "https://i.pravatar.cc/150?img=32" },
  { email: "sho@example.com", name: "Sho Watanabe", username: "sho_w", bio: "🧘 瞑想 | ミニマリスト | 京都", avatar: "https://i.pravatar.cc/150?img=17" },
]

const POSTS_DATA = [
  { username: "yuki_t", caption: "今日のモーニング☕ 新しいカフェ発見！豆から丁寧に淹れてくれて最高でした☺️ #カフェ巡り #東京グルメ", images: ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop"], location: "東京都渋谷区" },
  { username: "haruka_s", caption: "朝のヨガで一日が始まる🧘‍♀️ 今日も良い日になりそう。心と体のバランスを整えて✨ #ヨガ #朝活 #マインドフルネス", images: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop"], location: "代々木公園" },
  { username: "take_mori", caption: "今朝の鎌倉🌊 波が最高でした！早起きして損なし😎 #サーフィン #鎌倉 #海", images: ["https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&h=600&fit=crop"], location: "鎌倉" },
  { username: "sakura_ito", caption: "新作描けました🎨 推しキャラを描くの楽しすぎる！次は何を描こうかな〜 #イラスト #アニメ #お絵描き", images: ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=600&fit=crop"] },
  { username: "kenji_y", caption: "週末登山🏔️ 山頂からの眺め最高！疲れも吹き飛ぶ。#登山 #アウトドア #山", images: ["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop"], location: "奥多摩" },
  { username: "ayaka_n", caption: "今日のレッスン終了🕺 みんな上達してきた！来週も頑張りましょう！ #ダンス #ストリートダンス", images: ["https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=600&fit=crop"], location: "渋谷" },
  { username: "ryota_k", caption: "新メニュー試作中🍜 今日はスパイシーラーメン！スープの仕込みに3時間かけました。明日お店で出しますね😊 #料理 #ラーメン #グルメ", images: ["https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=600&fit=crop"], location: "大阪" },
  { username: "mana_s", caption: "夕暮れの横浜🌅 この時間帯の光が一番好き。カメラを持って歩くだけで幸せ📸 #写真 #横浜 #夕焼け", images: ["https://images.unsplash.com/photo-1480796927426-f609979314bd?w=600&h=600&fit=crop"], location: "横浜" },
  { username: "sho_w", caption: "京都の朝。静寂の中で過ごす時間は何にも替えられない🌿 #京都 #禅 #ミニマリスト", images: ["https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=600&fit=crop"], location: "京都" },
  { username: "keita_demo", caption: "今日も良い天気☀️ 東京タワー近くで撮影してきました！ #東京 #写真 #日常", images: ["https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=600&fit=crop"], location: "東京タワー" },
  { username: "yuki_t", caption: "手作りパスタ🍝 週末は料理三昧！トマトソースから作ると全然違う味になる✨ #料理 #パスタ #手作り", images: ["https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop"] },
  { username: "haruka_s", caption: "森の中でのリトリート🌲 3日間デジタルデトックスしてきました。自分と向き合う大切な時間。 #自然 #リトリート", images: ["https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=600&fit=crop"] },
  { username: "take_mori", caption: "夕暮れのビーチ📸 この瞬間のために早起きする価値がある #写真 #夕焼け #海", images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=600&fit=crop"] },
  { username: "sakura_ito", caption: "猫カフェにきた🐱 猫に囲まれて幸せすぎる！仕事のストレスが全部飛んだ #猫 #猫カフェ #癒し", images: ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop"], location: "猫カフェ" },
  { username: "kenji_y", caption: "新しいゲームをゲット🎮 週末はこれで引きこもります！ #ゲーム #PS5 #週末", images: ["https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=600&fit=crop"] },
]

async function main() {
  console.log("🌱 Seeding Instagram-based SNS...")
  const password = await hash("password123", 12)
  const userMap: Record<string, string> = {}

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, password, onboardingDone: true },
      update: {},
    })
    userMap[u.username] = user.id
    console.log(`✓ ${u.username}`)
  }

  // Create follows
  const follows = [
    ["keita_demo", "yuki_t"], ["keita_demo", "haruka_s"], ["keita_demo", "take_mori"],
    ["keita_demo", "sakura_ito"], ["keita_demo", "mana_s"],
    ["yuki_t", "keita_demo"], ["yuki_t", "haruka_s"], ["yuki_t", "ryota_k"],
    ["haruka_s", "keita_demo"], ["haruka_s", "ayaka_n"], ["haruka_s", "sho_w"],
    ["take_mori", "kenji_y"], ["take_mori", "mana_s"], ["take_mori", "keita_demo"],
    ["sakura_ito", "keita_demo"], ["sakura_ito", "ayaka_n"],
    ["kenji_y", "take_mori"], ["kenji_y", "sho_w"],
    ["ayaka_n", "haruka_s"], ["ayaka_n", "yuki_t"],
    ["mana_s", "take_mori"], ["mana_s", "keita_demo"],
    ["sho_w", "haruka_s"], ["sho_w", "kenji_y"],
  ]
  for (const [fr, to] of follows) {
    try {
      await prisma.follow.create({ data: { followerId: userMap[fr], followingId: userMap[to] } })
    } catch { /* skip */ }
  }
  console.log("✓ Follows created")

  // Create posts
  const postIds: string[] = []
  for (const p of POSTS_DATA) {
    const userId = userMap[p.username]
    const post = await prisma.post.create({
      data: { userId, caption: p.caption, images: JSON.stringify(p.images), location: p.location },
    })
    postIds.push(post.id)
  }
  console.log("✓ Posts created")

  // Create likes (demo user likes first 10 posts)
  const demoId = userMap["keita_demo"]
  for (const postId of postIds.slice(0, 10)) {
    try { await prisma.like.create({ data: { userId: demoId, postId } }) } catch { /* skip */ }
  }
  // Other users like posts
  for (const postId of postIds) {
    for (const un of ["yuki_t", "haruka_s", "take_mori"]) {
      try { await prisma.like.create({ data: { userId: userMap[un], postId } }) } catch { /* skip */ }
    }
  }
  console.log("✓ Likes created")

  // Create comments
  const comments = [
    { postIdx: 0, username: "keita_demo", content: "めっちゃ美味しそう！どこのカフェ？☕" },
    { postIdx: 0, username: "haruka_s", content: "私も行きたい！教えて〜🌸" },
    { postIdx: 1, username: "ayaka_n", content: "朝ヨガ最高ですね！私も始めようかな💪" },
    { postIdx: 2, username: "mana_s", content: "波の写真キレイ！📸" },
    { postIdx: 3, username: "keita_demo", content: "上手すぎ！才能あるね✨" },
    { postIdx: 4, username: "kenji_y", content: "登山仲間募集中！ぜひ一緒に🏔️" },
    { postIdx: 9, username: "yuki_t", content: "東京タワー映えるね！📸" },
  ]
  for (const c of comments) {
    try {
      await prisma.comment.create({
        data: { postId: postIds[c.postIdx], userId: userMap[c.username], content: c.content }
      })
    } catch { /* skip */ }
  }
  console.log("✓ Comments created")

  // Create stories (expires in 24h)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const storyData = [
    { username: "yuki_t", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=700&fit=crop", caption: "今日のカフェ☕" },
    { username: "haruka_s", imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=700&fit=crop", caption: "朝ヨガ🧘" },
    { username: "take_mori", imageUrl: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=700&fit=crop", caption: "今日の波🌊" },
    { username: "sakura_ito", imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=700&fit=crop", caption: "新作🎨" },
  ]
  for (const s of storyData) {
    await prisma.story.create({ data: { userId: userMap[s.username], imageUrl: s.imageUrl, caption: s.caption, expiresAt } })
  }
  console.log("✓ Stories created")

  // Create notifications for demo user
  const notifData = [
    { type: "like", fromUserId: userMap["yuki_t"], postId: postIds[9], content: "あなたの投稿にいいねしました" },
    { type: "follow", fromUserId: userMap["haruka_s"], content: "あなたをフォローしました" },
    { type: "comment", fromUserId: userMap["take_mori"], postId: postIds[9], content: "東京タワー映えるね！📸" },
    { type: "like", fromUserId: userMap["sakura_ito"], postId: postIds[9], content: "あなたの投稿にいいねしました" },
    { type: "follow", fromUserId: userMap["mana_s"], content: "あなたをフォローしました" },
  ]
  for (const n of notifData) {
    await prisma.notification.create({ data: { userId: demoId, ...n } })
  }
  console.log("✓ Notifications created")

  // Create footprints (who visited demo's profile)
  const fpVisitors = ["yuki_t", "haruka_s", "take_mori", "sakura_ito", "kenji_y"]
  for (const v of fpVisitors) {
    await prisma.footprint.create({ data: { visitorId: userMap[v], visitedId: demoId } })
  }
  console.log("✓ Footprints created")

  console.log("\n✅ Seed complete! Login: demo@example.com / password123")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
