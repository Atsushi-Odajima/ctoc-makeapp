"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Check, ImagePlus, Loader2, MapPin, Sparkles, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { getAvatarUrl } from "@/lib/utils"
import toast from "react-hot-toast"

const templates = [
  { label: "日記", text: "今日の小さなハレ。\n" },
  { label: "カフェ", text: "ここ、雰囲気までおいしかった。\n#カフェ部 " },
  { label: "推し活", text: "今日も推しのおかげで元気。\n#推しのいる生活 " },
  { label: "質問", text: "みんなならどうする？\n" },
]

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
      toast.error("写真は最大5枚までです")
      return
    }
    setUploading(true)
    try {
      const urls = await Promise.all(files.map(async (file) => {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) throw new Error("Upload failed")
        const data = await res.json()
        return data.url as string
      }))
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
      toast.success("投稿しました")
      router.push("/feed")
      router.refresh()
    } catch {
      toast.error("投稿に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#dfe3e8] px-4 py-3">
        <button onClick={() => step === "edit" ? setStep("select") : router.back()} aria-label="閉じる">
          <X className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="font-black text-slate-900">{step === "select" ? "新しいハレ" : "投稿を書く"}</h1>
        {step === "select" ? (
          <button onClick={() => { if (selectedImages.length === 0) return toast.error("写真を選んでください"); setStep("edit") }} disabled={selectedImages.length === 0 || uploading} className="text-sm font-bold text-[#0b1f3a] disabled:opacity-40">
            次へ
          </button>
        ) : (
          <button onClick={handlePost} disabled={loading} className="flex items-center gap-1 text-sm font-bold text-[#0b1f3a] disabled:opacity-40">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            シェア
          </button>
        )}
      </div>

      {step === "select" ? (
        <div className="flex-1 overflow-y-auto">
          {selectedImages.length > 0 ? (
            <div className="relative aspect-square bg-[#eef1f4]">
              <img src={selectedImages[selectedImages.length - 1]} alt="" className="h-full w-full object-cover" />
              <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white">{selectedImages.length}/5</div>
            </div>
          ) : (
            <div className="flex aspect-square flex-col items-center justify-center gap-4 bg-[#f8fafc]">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#dfe3e8] bg-white">
                <Camera className="h-10 w-10 text-[#0b1f3a]" />
              </div>
              <p className="text-sm font-semibold text-slate-500">写真を追加して、今日のハレを残す</p>
            </div>
          )}

          <div className="border-b border-[#dfe3e8] px-4 py-4">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading || selectedImages.length >= 5} className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#98a2b3] py-3 text-sm font-bold text-[#0b1f3a] hover:bg-[#f8fafc] disabled:opacity-40">
              {uploading ? <><Loader2 className="h-5 w-5 animate-spin" /> アップロード中...</> : <><ImagePlus className="h-5 w-5" /> カメラロールから選ぶ</>}
            </button>
          </div>

          {selectedImages.length > 0 && (
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-bold text-slate-400">選択中 ({selectedImages.length}/5)</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {selectedImages.map((url, i) => (
                  <div key={url} className="relative h-20 w-20 flex-shrink-0">
                    <img src={url} alt="" className="h-full w-full rounded-md object-cover" />
                    <button onClick={() => removeImage(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0b1f3a] text-xs text-white">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-3 px-4 py-4">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-[#eef1f4]">
              <img src={selectedImages[0]} alt="" className="h-full w-full object-cover" />
            </div>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="キャプションを書く..." className="min-h-[96px] flex-1 resize-none text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400" maxLength={2200} />
          </div>

          <div className="border-y border-[#dfe3e8] px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#e85d04]" />
              <p className="text-xs font-black text-slate-500">投稿テンプレ</p>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {templates.map(t => (
                <button key={t.label} onClick={() => setCaption(prev => prev ? `${prev}\n${t.text}` : t.text)} className="flex-shrink-0 rounded-md border border-[#d0d5dd] px-3 py-1.5 text-xs font-bold text-[#344054]">
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-[#e6e9ed]">
            <div className="flex items-center gap-3 border-b border-[#e6e9ed] px-4 py-3">
              {user && <img src={getAvatarUrl({ avatar: user.avatar, name: user.name || "User" })} alt="" className="h-8 w-8 rounded-full object-cover" />}
              <span className="text-sm font-bold text-slate-700">@{user?.username}</span>
              <span className="ml-auto text-xs font-bold text-[#667085]">公開</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <MapPin className="h-5 w-5 text-slate-400" />
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="場所を追加..." className="flex-1 text-sm text-slate-700 outline-none placeholder:text-slate-400" />
            </div>
          </div>

          {selectedImages.length > 1 && (
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-bold text-slate-400">選択中 ({selectedImages.length}枚)</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {selectedImages.map((url, i) => (
                  <div key={url} className="relative h-16 w-16 flex-shrink-0">
                    <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
                    <button onClick={() => removeImage(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0b1f3a] text-xs text-white">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
