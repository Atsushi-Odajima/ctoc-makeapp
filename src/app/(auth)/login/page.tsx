"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import toast from "react-hot-toast"

function SocialButton({ provider, label, className }: { provider: "line" | "google" | "facebook"; label: string; className: string }) {
  return (
    <button type="button" onClick={() => signIn(provider, { callbackUrl: "/feed" })} className={`w-full rounded-md px-4 py-3 text-sm font-bold ${className}`}>
      {label}
    </button>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return toast.error("メールアドレスとパスワードを入力してください")
    setLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) toast.error("メールアドレスまたはパスワードが違います")
      else {
        const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl") || "/feed"
        router.push(callbackUrl)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-md border border-[#dfe3e8] bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <div className="mb-3 flex justify-center"><img src="/logo.svg" alt="ハレノワ" className="h-16 w-16 object-contain" /></div>
        <h1 className="text-3xl font-black text-[#0b1f3a]">ハレノワ</h1>
      </div>

      <div className="mb-5 space-y-2.5">
        <SocialButton provider="line" label="LINEでログイン" className="border border-[#0b1f3a] bg-white text-[#0b1f3a]" />
        <SocialButton provider="google" label="Googleでログイン" className="border border-slate-200 bg-white text-slate-700" />
        <SocialButton provider="facebook" label="Facebookでログイン" className="border border-[#0b1f3a] bg-[#0b1f3a] text-white" />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-400">またはメールで</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">メールアドレス</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-4 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0b1f3a]" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">パスワード</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワード" required autoComplete="current-password" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-12 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0b1f3a]" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="パスワード表示">
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0b1f3a] py-3.5 font-black text-white disabled:opacity-60">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">アカウントがない方は <Link href="/register" className="font-bold text-[#0b1f3a]">新規登録</Link></p>
      <div className="mt-4 rounded-md border border-[#dfe3e8] bg-[#f8fafc] p-3">
        <p className="mb-1 text-xs font-bold text-[#0b1f3a]">デモアカウント</p>
        <p className="text-xs text-slate-600">demo@example.com / password123</p>
      </div>
    </div>
  )
}
