"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, ImagePlus, MapPin, Loader2, Check } from "lucide-react"
import { useSession } from "next-auth/react"
import { getAvatarUrl } from "@/lib/utils"
import toast from "react-hot-toast"
import Image from "next/image"

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=600&fit=crop",
]

export default function CreatePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [caption, setCaption] = useState("")
  const [location, setLocation] = useState("")
  const [step, setStep] = useState<"select" | "edit">("select")
  const [loading, setLoading] = useState(false)

  const user = session?.user as { name?: string; username?: string; avatar?: string } | undefined

  function toggleImage(url: string) {
    setSelectedImages(prev => prev.includes(url) ? prev.filter(u => u !== url) : prev.length < 5 ? [...prev, url] : prev)
  }

  async function handlePost() {
    if (selectedImages.length === 0) return toast.error("写真を選んでください")
    setLoading(true)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: selectedImages, caption, location }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("投稿しました！")
      router.push("/feed")
      router.refresh()
    } catch { toast.error("投稿に失敗しました") }
    finally { setLoading(false) }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button onClick={() => step === "edit" ? setStep("select") : router.back()}>
          <X className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="font-semibold text-slate-900">新しい投稿</h1>
        {step === "select" ? (
          <button onClick={() => { if (selectedImages.length === 0) return toast.error("写真を選んでください"); setStep("edit") }}
            className="text-blue-600 font-semibold text-sm disabled:opacity-40">
            次へ
          </button>
        ) : (
          <button onClick={handlePost} disabled={loading}
            className="text-blue-600 font-semibold text-sm disabled:opacity-40 flex items-center gap-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            シェア
          </button>
        )}
      </div>

      {step === "select" ? (
        <div className="flex-1 overflow-y-auto">
          {/* Selected preview */}
          {selectedImages.length > 0 && (
            <div className="aspect-square bg-slate-100 relative">
              <img src={selectedImages[selectedImages.length - 1]} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {selectedImages.length}/5
              </div>
            </div>
          )}

          <div className="p-3">
            <p className="text-sm font-medium text-slate-600 mb-2">
              <ImagePlus className="inline w-4 h-4 mr-1" />
              写真を選ぶ (最大5枚)
            </p>
            <div className="grid grid-cols-3 gap-0.5">
              {SAMPLE_IMAGES.map((url, i) => {
                const idx = selectedImages.indexOf(url)
                const isSelected = idx !== -1
                return (
                  <button key={i} onClick={() => toggleImage(url)} className="relative aspect-square bg-slate-200 overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                          {idx + 1}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Preview + caption */}
          <div className="flex gap-3 px-4 py-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
              <img src={selectedImages[0]} alt="" className="w-full h-full object-cover" />
            </div>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="キャプションを書く..."
              className="flex-1 text-slate-800 text-sm placeholder-slate-400 resize-none outline-none leading-relaxed min-h-[80px]"
              maxLength={2200} />
          </div>

          <div className="border-t border-slate-100">
            {/* User */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
              {user && <img src={getAvatarUrl({ avatar: user.avatar, name: user.name || "User" })} alt="" className="w-8 h-8 rounded-full object-cover" />}
              <span className="text-sm font-semibold text-slate-700">@{user?.username}</span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
              <MapPin className="w-5 h-5 text-slate-400" />
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="場所を追加..."
                className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none" />
            </div>

            {/* Selected images preview */}
            {selectedImages.length > 1 && (
              <div className="px-4 py-3">
                <p className="text-xs text-slate-400 mb-2">選択中 ({selectedImages.length}枚)</p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedImages.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 flex-shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button onClick={() => setSelectedImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center text-xs">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
