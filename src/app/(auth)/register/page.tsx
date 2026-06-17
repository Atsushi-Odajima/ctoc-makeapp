"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Heart, Mail, Lock, User, AtSign, Eye, EyeOff, Loader2 } from "lucide-react"
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
    if (!name || !email || !password) return toast.error("すべての項目を入力してください")
    if (password.length < 6) return toast.error("パスワードは6文字以上")
    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || "登録に失敗しました")
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) { toast.error("自動ログインに失敗しました"); router.push("/login") }
      else { toast.success("アカウントを作成しました！"); router.push("/onboarding") }
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/20 p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-300">
          <Heart className="w-8 h-8 text-white fill-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">アカウント作成</h1>
        <p className="text-slate-500 mt-1">無料で始めよう</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">名前</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={name} onChange={e => { setName(e.target.value); suggestUsername(e.target.value) }}
              placeholder="山田 太郎" autoComplete="name" required
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">ユーザーネーム</label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="yamada_taro" autoComplete="username"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">メールアドレス</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="6文字以上" required
              className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? "作成中..." : "アカウント作成"}
        </button>
      </form>
      <div className="mt-6 text-center">
        <p className="text-slate-500">アカウントをお持ちの方は{" "}<Link href="/login" className="text-blue-600 font-semibold">ログイン</Link></p>
      </div>
      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-xs font-semibold text-blue-600 mb-1">デモアカウント</p>
        <p className="text-xs text-slate-600">demo@example.com / password123</p>
      </div>
    </div>
  )
}
