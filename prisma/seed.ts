import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

const INTERESTS = [
  { name: "音楽", emoji: "🎵" },
  { name: "映画", emoji: "🎬" },
  { name: "料理", emoji: "🍳" },
  { name: "旅行", emoji: "✈️" },
  { name: "スポーツ", emoji: "⚽" },
  { name: "アート", emoji: "🎨" },
  { name: "読書", emoji: "📚" },
  { name: "ゲーム", emoji: "🎮" },
  { name: "写真", emoji: "📸" },
  { name: "ヨガ", emoji: "🧘" },
  { name: "ダンス", emoji: "💃" },
  { name: "登山", emoji: "🏔️" },
  { name: "サーフィン", emoji: "🏄" },
  { name: "カフェ", emoji: "☕" },
  { name: "アニメ", emoji: "🎌" },
]

const DEMO_USERS = [
  {
    email: "demo@example.com",
    name: "デモユーザー",
    gender: "male",
    birthdate: new Date("1995-06-15"),
    bio: "テスト用のデモアカウントです。スワイプを楽しんでください！",
    location: "東京都渋谷区",
    photos: JSON.stringify(["https://i.pravatar.cc/400?img=1"]),
    interests: ["音楽", "旅行", "カフェ"],
    lookingFor: "female",
    onboardingDone: true,
  },
  {
    email: "yuki@example.com",
    name: "Yuki",
    gender: "female",
    birthdate: new Date("1998-03-22"),
    bio: "旅行と音楽が大好き✈️🎵 カフェ巡りしながら新しい出会いを探しています。",
    location: "東京都新宿区",
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop",
      "https://i.pravatar.cc/400?img=47",
    ]),
    interests: ["音楽", "旅行", "カフェ", "写真"],
    lookingFor: "male",
    onboardingDone: true,
  },
  {
    email: "haruka@example.com",
    name: "Haruka",
    gender: "female",
    birthdate: new Date("1997-09-10"),
    bio: "料理とヨガにはまってます🍳🧘‍♀️ 週末は友達とカフェでまったり。",
    location: "東京都目黒区",
    photos: JSON.stringify([
      "https://i.pravatar.cc/400?img=25",
      "https://i.pravatar.cc/400?img=20",
    ]),
    interests: ["料理", "ヨガ", "カフェ", "映画"],
    lookingFor: "male",
    onboardingDone: true,
  },
  {
    email: "sakura@example.com",
    name: "Sakura",
    gender: "female",
    birthdate: new Date("2000-04-05"),
    bio: "アニメと読書が趣味📚🎌 猫を飼っています。のんびりした時間が好き。",
    location: "東京都中野区",
    photos: JSON.stringify([
      "https://i.pravatar.cc/400?img=30",
      "https://i.pravatar.cc/400?img=41",
    ]),
    interests: ["アニメ", "読書", "映画", "ゲーム"],
    lookingFor: "male",
    onboardingDone: true,
  },
  {
    email: "ayaka@example.com",
    name: "Ayaka",
    gender: "female",
    birthdate: new Date("1996-11-28"),
    bio: "ダンス講師してます💃 アクティブな人が好き！一緒に楽しいことしよう。",
    location: "東京都品川区",
    photos: JSON.stringify([
      "https://i.pravatar.cc/400?img=45",
      "https://i.pravatar.cc/400?img=48",
    ]),
    interests: ["ダンス", "音楽", "スポーツ", "旅行"],
    lookingFor: "male",
    onboardingDone: true,
  },
  {
    email: "mana@example.com",
    name: "Mana",
    gender: "female",
    birthdate: new Date("1999-07-17"),
    bio: "フォトグラファーの卵📸 美しい景色と美味しいご飯が大好きです。",
    location: "神奈川県横浜市",
    photos: JSON.stringify([
      "https://i.pravatar.cc/400?img=32",
      "https://i.pravatar.cc/400?img=38",
    ]),
    interests: ["写真", "旅行", "料理", "アート"],
    lookingFor: "everyone",
    onboardingDone: true,
  },
  {
    email: "takeshi@example.com",
    name: "Takeshi",
    gender: "male",
    birthdate: new Date("1993-12-03"),
    bio: "サーフィンとギターが趣味🏄🎸 海の近くに住みたい。",
    location: "神奈川県鎌倉市",
    photos: JSON.stringify([
      "https://i.pravatar.cc/400?img=11",
      "https://i.pravatar.cc/400?img=14",
    ]),
    interests: ["サーフィン", "音楽", "登山", "スポーツ"],
    lookingFor: "female",
    onboardingDone: true,
  },
  {
    email: "kenji@example.com",
    name: "Kenji",
    gender: "male",
    birthdate: new Date("1994-08-19"),
    bio: "IT企業勤務。週末は山登りかゲームしてます🏔️🎮",
    location: "東京都千代田区",
    photos: JSON.stringify([
      "https://i.pravatar.cc/400?img=13",
      "https://i.pravatar.cc/400?img=17",
    ]),
    interests: ["ゲーム", "登山", "映画", "読書"],
    lookingFor: "female",
    onboardingDone: true,
  },
  {
    email: "ryota@example.com",
    name: "Ryota",
    gender: "male",
    birthdate: new Date("1997-02-14"),
    bio: "料理好きで家庭的です🍳 一緒においしいもの食べに行きましょう！",
    location: "大阪府大阪市",
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
      "https://i.pravatar.cc/400?img=10",
    ]),
    interests: ["料理", "カフェ", "旅行", "アート"],
    lookingFor: "female",
    onboardingDone: true,
  },
  {
    email: "sho@example.com",
    name: "Sho",
    gender: "male",
    birthdate: new Date("1995-05-30"),
    bio: "ヨガインストラクター🧘‍♂️ 健康的な生活と自然が好きです。",
    location: "京都府京都市",
    photos: JSON.stringify([
      "https://i.pravatar.cc/400?img=15",
    ]),
    interests: ["ヨガ", "スポーツ", "登山", "写真"],
    lookingFor: "female",
    onboardingDone: true,
  },
]

async function main() {
  console.log("🌱 Seeding database...")

  const password = await hash("password123", 12)

  // Create interests
  console.log("Creating interests...")
  await Promise.all(
    INTERESTS.map(i =>
      prisma.interest.upsert({
        where: { name: i.name },
        create: i,
        update: { emoji: i.emoji },
      })
    )
  )

  // Create users
  for (const userData of DEMO_USERS) {
    const { interests, ...userFields } = userData

    const user = await prisma.user.upsert({
      where: { email: userFields.email },
      create: { ...userFields, password, showMe: true },
      update: {},
    })

    // Create interest relations
    await prisma.userInterest.deleteMany({ where: { userId: user.id } })
    const interestRecords = await Promise.all(
      interests.map(name => prisma.interest.findFirst({ where: { name } }))
    )
    const filteredInterests = interestRecords.filter(Boolean)
    for (const interest of filteredInterests) {
      try {
        await prisma.userInterest.create({
          data: { userId: user.id, interestId: interest!.id }
        })
      } catch { /* skip duplicates */ }
    }

    console.log(`✓ Created user: ${user.name} (${user.email})`)
  }

  // Create some demo swipes/matches
  const demoUser = await prisma.user.findUnique({ where: { email: "demo@example.com" } })
  const yuki = await prisma.user.findUnique({ where: { email: "yuki@example.com" } })
  const haruka = await prisma.user.findUnique({ where: { email: "haruka@example.com" } })

  if (demoUser && yuki) {
    // Create a mutual like (match)
    await prisma.swipe.upsert({
      where: { swiperId_swipedId: { swiperId: demoUser.id, swipedId: yuki.id } },
      create: { swiperId: demoUser.id, swipedId: yuki.id, direction: "like" },
      update: {},
    })
    await prisma.swipe.upsert({
      where: { swiperId_swipedId: { swiperId: yuki.id, swipedId: demoUser.id } },
      create: { swiperId: yuki.id, swipedId: demoUser.id, direction: "like" },
      update: {},
    })

    const [a, b] = [demoUser.id, yuki.id].sort()
    const match = await prisma.match.upsert({
      where: { user1Id_user2Id: { user1Id: a, user2Id: b } },
      create: { user1Id: a, user2Id: b },
      update: {},
    })

    // Create sample messages
    const msgs = await prisma.message.findMany({ where: { matchId: match.id } })
    if (msgs.length === 0) {
      await prisma.message.create({ data: { matchId: match.id, senderId: yuki.id, content: "こんにちは！マッチングありがとう😊" } })
      await prisma.message.create({ data: { matchId: match.id, senderId: demoUser.id, content: "こちらこそ！よろしくね。Yukiさんは音楽が好きなんですね？" } })
      await prisma.message.create({ data: { matchId: match.id, senderId: yuki.id, content: "そうです！J-POPからK-POPまで何でも聴きます🎵 どんな音楽が好き？" } })
    }

    console.log("✓ Created match between demo and Yuki with messages")
  }

  if (demoUser && haruka) {
    // Create a one-sided like
    await prisma.swipe.upsert({
      where: { swiperId_swipedId: { swiperId: haruka.id, swipedId: demoUser.id } },
      create: { swiperId: haruka.id, swipedId: demoUser.id, direction: "like" },
      update: {},
    })
    console.log("✓ Created swipe from Haruka to demo")
  }

  console.log("✅ Seed complete!")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
