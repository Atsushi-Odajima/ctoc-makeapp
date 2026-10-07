"use client"
import { useEffect, useState } from "react"
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
    fetch("/api/profile")
      .then(r => r.json())
      .then((p: UserProfile) => {
        setProfile(p)
        setForm({ name: p.name || "", bio: p.bio || "", website: p.website || "", avatar: p.avatar || "" })
      })
      .catch(() => toast.error("プロフィールの読み込みに失敗しました"))
      .finally(() => setLoading(false))
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

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#0b1f3a]" /></div>

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <div className="flex items-center gap-3 border-b border-[#dfe3e8] px-2 py-3">
        <button onClick={() => router.back()} className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="戻る">
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <span className="flex-1 text-base font-black text-slate-900">プロフィールを編集</span>
        <button onClick={handleSave} disabled={saving} className="px-2 text-sm font-bold text-[#0b1f3a] disabled:opacity-50">
          {saving ? "保存中..." : "完了"}
        </button>
      </div>

      <div className="flex-1 space-y-6 px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          <img src={form.avatar ? form.avatar : (profile ? getAvatarUrl({ ...profile, avatar: null }) : "")} alt="" className="h-20 w-20 rounded-full border-2 border-[#dfe3e8] object-cover" />
          <button onClick={() => setShowAvatarPicker(v => !v)} className="text-sm font-bold text-[#0b1f3a]">プロフィール写真を変更</button>

          {showAvatarPicker && (
            <div className="w-full">
              <p className="mb-2 text-center text-xs font-bold text-slate-500">アバターを選択</p>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_OPTIONS.map(url => (
                  <button key={url} onClick={() => { setForm(f => ({ ...f, avatar: url })); setShowAvatarPicker(false) }} className={`aspect-square overflow-hidden rounded-md border-2 ${form.avatar === url ? "border-[#0b1f3a]" : "border-transparent"}`}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">名前</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="名前" className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0b1f3a]" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">自己紹介</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="好きなもの、最近ハマっていることなど" rows={4} maxLength={150} className="w-full resize-none rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0b1f3a]" />
            <p className="mt-1 text-right text-xs text-slate-400">{form.bio.length}/150</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">ウェブサイト</label>
            <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0b1f3a]" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">ユーザー名</label>
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">@{profile?.username}</div>
            <p className="mt-1 text-xs text-slate-400">ユーザー名は現在変更できません。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
