"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"
import { getAvatarUrl } from "@/lib/utils"
import type { UserProfile } from "@/types"
import toast from "react-hot-toast"

const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1494790108755-2616b612b977?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
]

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState({ name: "", bio: "", website: "", avatar: "" })
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then((p: UserProfile) => {
      setProfile(p)
      setForm({ name: p.name || "", bio: p.bio || "", website: p.website || "", avatar: p.avatar || "" })
    }).catch(() => toast.error("プロフィールの読み込みに失敗しました")).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success("保存しました")
      router.back()
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <span className="flex-1 text-base font-bold text-slate-900">プロフィールを編集</span>
        <button onClick={handleSave} disabled={saving}
          className="text-blue-500 font-semibold text-sm disabled:opacity-50 px-2">
          {saving ? "保存中..." : "完了"}
        </button>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <img
              src={form.avatar ? form.avatar : (profile ? getAvatarUrl({ ...profile, avatar: null }) : "")}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-100"
            />
          </div>
          <button onClick={() => setShowAvatarPicker(v => !v)}
            className="text-blue-500 font-semibold text-sm">
            プロフィール写真を変更
          </button>

          {showAvatarPicker && (
            <div className="w-full">
              <p className="text-xs text-slate-500 mb-2 text-center">アバターを選択</p>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_OPTIONS.map((url, i) => (
                  <button key={i} onClick={() => { setForm(f => ({...f, avatar: url})); setShowAvatarPicker(false) }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${form.avatar === url ? "border-blue-500" : "border-transparent"}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">名前</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="名前"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">自己紹介</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({...f, bio: e.target.value}))}
              placeholder="自己紹介を入力..."
              rows={4}
              maxLength={150}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none"
            />
            <p className="text-right text-xs text-slate-400 mt-1">{form.bio.length}/150</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">ウェブサイト</label>
            <input
              type="url"
              value={form.website}
              onChange={e => setForm(f => ({...f, website: e.target.value}))}
              placeholder="https://example.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">ユーザーネーム</label>
            <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 bg-slate-50">
              @{profile?.username}
            </div>
            <p className="text-xs text-slate-400 mt-1">ユーザーネームは変更できません</p>
          </div>
        </div>
      </div>
    </div>
  )
}
