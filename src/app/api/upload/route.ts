import { NextResponse } from "next/server"

// Removed in DayNet v4: this endpoint uploaded to PUBLIC Cloudinary URLs through the Vercel
// function. Use POST /api/media/sign → direct upload → POST /api/media/complete.
export async function POST() {
  return NextResponse.json(
    { error: { code: "GONE", message: "このアップロード方法は終了しました。アプリを再読み込みしてください" } },
    { status: 410 },
  )
}
