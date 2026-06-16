"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, Loader2, Check, X } from "lucide-react"
import { parsePhotos } from "@/lib/utils"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const INTERESTS = [
  { name: "音楽", emoji: "🎵" }, { name: "映画", emoji: "🎬" }, { name: "料理", emoji: "🍳" },
  { name: "旅行", emoji: "✈️" }, { name: "スポーツ", emoji: "⚽" }, { name: "アート", emoji: "🎨" },
  { name: "読書", emoji: "📚" }, { name: "ゲーム", emoji: "🎮" }, { name: "写真", emoji: "📸" },
  { name: "ヨガ", emoji: "🧘" }, { name: "ダンス", emoji: "💃" }, { name: "登山", emoji: "🏔️" },
  { name: "サーフィン", emoji: "🏄" }, { name: "カフェ", emoji: "☕" }, { name: "アニメ", emoji: "🎌" },
  { name: "キャンプ", emoji: "🏕️" }, { name: "ファッション", emoji: "👗" }, { name: "ペット", emoji: "🐾" },
  { name: "筋トレ", emoji: "💪" },
]

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        setName(data.name || "")
        setBio(data.bio || "")
        setLocation(data.location || "")
        setPhotos(parsePhotos(data.photos))
        setSelectedInterests(data.interests?.map((i: { name: string }) => i.name) || [])
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleInterest(name: string) {
    setSelectedInterests(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : prev.length < 10 ? [...prev, name] : prev
    )
  }

  function addDemoPhoto() {
    const url = `https://i.pravatar.cc/400?img=${Math.floor(Math.random() * 70) + 1}&t=${Date.now()}`
    setPhotos(prev => prev.length < 6 ? [...prev, url] : prev)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, location, photos, interests: selectedInterests }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("プロフィールを更新しました")
      router.push("/profile")
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f0f4ff]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-100 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-slate-800">プロフィール編集</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          保存
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Photos */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-3">写真</h2>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map(slot => (
              <div key={slot} className="aspect-square rounded-xl overflow-hidden bg-slate-100 relative group">
                {photos[slot] ? (
                  <>
                    <img src={photos[slot]} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== slot))}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {slot === 0 && (
                      <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        メイン
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={addDemoPhoto}
                    className="w-full h-full flex flex-col items-center justify-center text-slate-300 hover:text-blue-400 transition-colors"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-xs">追加</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">タップして写真を追加 (最大6枚)</p>
        </div>

        {/* Name */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">名前</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            自己紹介
            <span className="text-slate-400 font-normal ml-2">{bio.length}/200</span>
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 200))}
            rows={4}
            placeholder="あなたのことを教えてください..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">居住地</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="例: 東京都渋谷区"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Interests */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">趣味・興味</h2>
            <span className="text-sm text-slate-400">{selectedInterests.length}/10</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(({ name, emoji }) => (
              <button
                key={name}
                onClick={() => toggleInterest(name)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all",
                  selectedInterests.includes(name)
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-500 hover:border-blue-200"
                )}
              >
                <span>{emoji}</span>
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}
