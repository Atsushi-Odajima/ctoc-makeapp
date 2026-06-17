"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Camera, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error("メールアドレスとパスワードを入力してください")
    setLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        toast.error("メールアドレスまたはパスワードが正しくありません")
      } else {
        router.push("/feed")
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/20 p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-300">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">ログイン</h1>
        <p className="text-slate-500 mt-1 text-sm">アカウントにサインイン</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">メールアドレス</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="パスワード" required autoComplete="current-password"
              className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? "サインイン中..." : "ログイン"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-slate-500">アカウントをお持ちでない方は{" "}
          <Link href="/register" className="text-blue-600 font-semibold">新規登録</Link>
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-xs font-semibold text-blue-600 mb-1">デモアカウント</p>
        <p className="text-xs text-slate-600">demo@example.com / password123</p>
      </div>
    </div>
  )
}
