"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AtSign, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react"
import toast from "react-hot-toast"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  function suggestUsername(n: string) {
    if (!username) setUsername(n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) return toast.error("必要項目を入力してください")
    if (password.length < 6) return toast.error("パスワードは6文字以上にしてください")
    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || "登録に失敗しました")
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        toast.error("自動ログインに失敗しました")
        router.push("/login")
      } else {
        toast.success("アカウントを作成しました")
        router.push("/onboarding")
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">名前</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" value={name} onChange={e => { setName(e.target.value); suggestUsername(e.target.value) }} placeholder="山田 花" autoComplete="name" required className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-4 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0b1f3a]" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">ユーザー名</label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="hanako" autoComplete="username" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-4 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0b1f3a]" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">メールアドレス</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-4 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0b1f3a]" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">パスワード</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="6文字以上" required className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-12 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0b1f3a]" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="パスワード表示">
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0b1f3a] py-3.5 font-black text-white disabled:opacity-60">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {loading ? "作成中..." : "アカウントを作成"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">すでにアカウントがある方は <Link href="/login" className="font-bold text-[#0b1f3a]">ログイン</Link></p>
    </div>
  )
}
