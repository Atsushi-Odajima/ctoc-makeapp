"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

function SocialButton({
  onClick,
  icon,
  label,
  bg,
  text,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  bg: string
  text: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] ${bg} ${text}`}
    >
      {icon}
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

  const handleSocialLogin = async (provider: "google" | "facebook" | "line") => {
    const labels: Record<string, string> = { google: "Google", facebook: "Facebook", line: "LINE" }
    const hasCredential =
      (provider === "google" && !!(process.env.NEXT_PUBLIC_GOOGLE_ENABLED)) ||
      (provider === "facebook" && !!(process.env.NEXT_PUBLIC_FACEBOOK_ENABLED)) ||
      (provider === "line" && !!(process.env.NEXT_PUBLIC_LINE_ENABLED))

    await signIn(provider, { callbackUrl: "/feed" })
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/20 p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <img src="/logo.svg" alt="Feeld" className="w-16 h-16 object-contain" />
        </div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent mb-1">
          Feeld
        </h1>
        <p className="text-slate-400 text-sm">アカウントにログイン</p>
      </div>

      {/* Social Login */}
      <div className="space-y-2.5 mb-5">
        <SocialButton
          onClick={() => handleSocialLogin("line")}
          bg="bg-[#06C755]"
          text="text-white"
          label="LINEでログイン"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          }
        />
        <SocialButton
          onClick={() => handleSocialLogin("google")}
          bg="bg-white border border-slate-200"
          text="text-slate-700"
          label="Googleでログイン"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          }
        />
        <SocialButton
          onClick={() => handleSocialLogin("facebook")}
          bg="bg-[#1877F2]"
          text="text-white"
          label="Facebookでログイン"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          }
        />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">またはメールで</span>
        <div className="flex-1 h-px bg-slate-200" />
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
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-slate-500 text-sm">アカウントをお持ちでない方は{" "}
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
