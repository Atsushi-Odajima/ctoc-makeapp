import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: "feeld",
    transformation: [{ width: 1080, height: 1080, crop: "limit", quality: "auto:good" }],
  })

  return NextResponse.json({ url: result.secure_url })
}
