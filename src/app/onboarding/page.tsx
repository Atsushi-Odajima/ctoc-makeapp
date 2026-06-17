"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Camera, ChevronRight, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

const DEMO_AVATARS = [
  "https://i.pravatar.cc/150?img=1", "https://i.pravatar.cc/150?img=5",
  "https://i.pravatar.cc/150?img=12", "https://i.pravatar.cc/150?img=20",
  "https://i.pravatar.cc/150?img=35", "https://i.pravatar.cc/150?img=50",
]

export default function OnboardingPage() {
  const router = useRouter()
  const { update } = useSession()
  const [bio, setBio] = useState("")
  const [website, setWebsite] = useState("")
  const [avatar, setAvatar] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleFinish() {
    setLoading(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, website, avatar, onboardingDone: true }),
      })
      if (!res.ok) throw new Error("Failed")
      await update({ onboardingDone: true })
      toast.success("プロフィールを設定しました！")
      router.push("/feed")
    } catch { toast.error("保存に失敗しました") }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-700 flex items-center justify-center p-4">
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400 rounded-full opacity-10 blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
            <img src="/logo.svg" alt="Feeld" className="w-8 h-8 object-contain" />
          </div>
          <span className="text-white font-black text-2xl tracking-tight">Feeld</span>
        </div>
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">プロフィール設定</h2>
          <p className="text-slate-500 text-sm mb-6">あなたのことを教えてください</p>

          {/* Avatar picker */}
          <div className="mb-5">
            <p className="text-sm font-medium text-slate-700 mb-3">プロフィール写真を選ぶ</p>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Current selection */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-100 flex-shrink-0">
                {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Camera className="w-6 h-6 text-slate-300" /></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_AVATARS.map(url => (
                  <button key={url} onClick={() => setAvatar(url)}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${avatar === url ? "border-blue-500 scale-110" : "border-transparent hover:border-blue-300"}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">自己紹介 <span className="text-slate-400 font-normal">(任意)</span></label>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 150))} rows={3} placeholder="あなたのことを教えてください..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
            <p className="text-xs text-slate-400 text-right">{bio.length}/150</p>
          </div>

          {/* Website */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ウェブサイト <span className="text-slate-400 font-normal">(任意)</span></label>
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>

          <button onClick={handleFinish} disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
            {loading ? "設定中..." : "始める！"}
          </button>
          <button onClick={() => { setLoading(true); fetch("/api/profile", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({onboardingDone:true}) }).then(() => router.push("/feed")) }}
            className="w-full text-slate-400 text-sm mt-3 hover:text-slate-600 transition-colors">
            スキップ
          </button>
        </div>
      </div>
    </div>
  )
}
