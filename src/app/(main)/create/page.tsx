"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { X, ImagePlus, MapPin, Loader2, Check, Camera } from "lucide-react"
import { useSession } from "next-auth/react"
import { getAvatarUrl } from "@/lib/utils"
import toast from "react-hot-toast"

export default function CreatePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [caption, setCaption] = useState("")
  const [location, setLocation] = useState("")
  const [step, setStep] = useState<"select" | "edit">("select")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const user = session?.user as { name?: string; username?: string; avatar?: string } | undefined

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (selectedImages.length + files.length > 5) {
      toast.error("写真は最大5枚まで")
      return
    }
    setUploading(true)
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/upload", { method: "POST", body: fd })
          if (!res.ok) throw new Error("Upload failed")
          const data = await res.json()
          return data.url as string
        })
      )
      setSelectedImages(prev => [...prev, ...urls])
    } catch {
      toast.error("アップロードに失敗しました")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function removeImage(i: number) {
    setSelectedImages(prev => prev.filter((_, j) => j !== i))
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
    } catch {
      toast.error("投稿に失敗しました")
    } finally {
      setLoading(false)
    }
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
          <button
            onClick={() => { if (selectedImages.length === 0) return toast.error("写真を選んでください"); setStep("edit") }}
            disabled={selectedImages.length === 0 || uploading}
            className="text-blue-600 font-semibold text-sm disabled:opacity-40"
          >
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
          {/* Preview area */}
          {selectedImages.length > 0 ? (
            <div className="relative aspect-square bg-slate-100">
              <img src={selectedImages[selectedImages.length - 1]} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {selectedImages.length}/5
              </div>
            </div>
          ) : (
            <div className="aspect-square bg-slate-50 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                <Camera className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-slate-400 text-sm">写真を追加してください</p>
            </div>
          )}

          {/* Upload button */}
          <div className="px-4 py-4 border-b border-slate-100">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || selectedImages.length >= 5}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors disabled:opacity-40"
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> アップロード中...</>
              ) : (
                <><ImagePlus className="w-5 h-5" /> カメラロールから選ぶ (最大5枚)</>
              )}
            </button>
          </div>

          {/* Selected thumbnails */}
          {selectedImages.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-slate-400 mb-2">選択中 ({selectedImages.length}/5)</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedImages.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 flex-shrink-0">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center text-xs shadow"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-3 px-4 py-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
              <img src={selectedImages[0]} alt="" className="w-full h-full object-cover" />
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="キャプションを書く..."
              className="flex-1 text-slate-800 text-sm placeholder-slate-400 resize-none outline-none leading-relaxed min-h-[80px]"
              maxLength={2200}
            />
          </div>

          <div className="border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
              {user && (
                <img
                  src={getAvatarUrl({ avatar: user.avatar, name: user.name || "User" })}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <span className="text-sm font-semibold text-slate-700">@{user?.username}</span>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
              <MapPin className="w-5 h-5 text-slate-400" />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="場所を追加..."
                className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none"
              />
            </div>

            {selectedImages.length > 1 && (
              <div className="px-4 py-3">
                <p className="text-xs text-slate-400 mb-2">選択中 ({selectedImages.length}枚)</p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedImages.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 flex-shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center text-xs"
                      >✕</button>
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
