import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, username } = await req.json()
    if (!email || !password || !name) return NextResponse.json({ error: "必要項目を入力してください" }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 })

    const finalUsername = username?.trim() || `${email.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase()}_${Math.floor(Math.random() * 999)}`

    const [emailExists, usernameExists] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username: finalUsername } }),
    ])
    if (emailExists) return NextResponse.json({ error: "このメールアドレスはすでに使われています" }, { status: 409 })
    if (usernameExists) return NextResponse.json({ error: "このユーザー名はすでに使われています" }, { status: 409 })

    const hashedPassword = await hash(password, 12)
    const user = await prisma.user.create({ data: { email, password: hashedPassword, name, username: finalUsername } })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, username: user.username })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 })
  }
}
