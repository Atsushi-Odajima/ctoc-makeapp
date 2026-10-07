"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Camera, ChevronRight, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const DEMO_AVATARS = [
  "https://i.pravatar.cc/150?img=1",
  "https://i.pravatar.cc/150?img=5",
  "https://i.pravatar.cc/150?img=12",
  "https://i.pravatar.cc/150?img=20",
  "https://i.pravatar.cc/150?img=35",
  "https://i.pravatar.cc/150?img=50",
]

const circles = ["カフェ", "推し活", "日記", "写真", "地元", "おでかけ"]

export default function OnboardingPage() {
  const router = useRouter()
  const { update } = useSession()
  const [bio, setBio] = useState("")
  const [website, setWebsite] = useState("")
  const [avatar, setAvatar] = useState("")
  const [selected, setSelected] = useState<string[]>(["日記"])
  const [loading, setLoading] = useState(false)

  function toggleCircle(circle: string) {
    setSelected(prev => prev.includes(circle) ? prev.filter(v => v !== circle) : [...prev, circle])
  }

  async function handleFinish() {
    setLoading(true)
    try {
      const profileBio = bio || `好きな輪: ${selected.join(" / ")}`
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: profileBio, website, avatar, onboardingDone: true }),
      })
      if (!res.ok) throw new Error("Failed")
      await update({ onboardingDone: true })
      toast.success("プロフィールを設定しました")
      router.push("/feed")
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  async function handleSkip() {
    setLoading(true)
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingDone: true }),
    })
    router.push("/feed")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white">
            <img src="/logo.svg" alt="ハレノワ" className="h-8 w-8 object-contain" />
          </div>
          <span className="text-2xl font-black text-[#0b1f3a]">ハレノワ</span>
        </div>
        <div className="rounded-md border border-[#dfe3e8] bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-2xl font-black text-slate-900">最初の輪をつくる</h2>
          <p className="mb-6 text-sm text-slate-500">好きなことを選ぶと、あなたに近い投稿や輪を見つけやすくなります。</p>

          <div className="mb-5">
            <p className="mb-3 text-sm font-bold text-slate-700">プロフィール写真</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#0b1f3a] bg-slate-100">
                {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Camera className="h-6 w-6 text-slate-300" /></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_AVATARS.map(url => (
                  <button key={url} onClick={() => setAvatar(url)} className={cn("h-12 w-12 overflow-hidden rounded-full border-2", avatar === url ? "border-[#0b1f3a]" : "border-transparent hover:border-[#98a2b3]")}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#e85d04]" />
              <p className="text-sm font-bold text-slate-700">好きな輪</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {circles.map(circle => (
                <button key={circle} onClick={() => toggleCircle(circle)} className={cn("rounded-md border px-3 py-1.5 text-xs font-bold", selected.includes(circle) ? "border-[#0b1f3a] bg-[#0b1f3a] text-white" : "border-[#d0d5dd] bg-white text-[#344054]")}>
                  {circle}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-bold text-slate-700">自己紹介 <span className="font-normal text-slate-400">(任意)</span></label>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 150))} rows={3} placeholder="好きなもの、最近ハマっていることなど" className="w-full resize-none rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0b1f3a]" />
            <p className="text-right text-xs text-slate-400">{bio.length}/150</p>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-bold text-slate-700">ウェブサイト <span className="font-normal text-slate-400">(任意)</span></label>
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0b1f3a]" />
          </div>

          <button onClick={handleFinish} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0b1f3a] py-3.5 font-black text-white disabled:opacity-60">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
            {loading ? "設定中..." : "はじめる"}
          </button>
          <button onClick={handleSkip} className="mt-3 w-full text-sm text-slate-400 transition-colors hover:text-slate-600">スキップ</button>
        </div>
      </div>
    </div>
  )
}
