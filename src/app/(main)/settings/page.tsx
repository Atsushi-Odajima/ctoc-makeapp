"use client"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, LogOut, User, Lock, Bell, Eye, Info } from "lucide-react"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"

const sections = [
  {
    title: "アカウント",
    items: [
      { icon: User, label: "プロフィールを編集", href: "/profile/edit" },
      { icon: Lock, label: "パスワードを変更", href: "#" },
    ],
  },
  {
    title: "プライバシー",
    items: [
      { icon: Eye, label: "プライベートアカウント", href: "#" },
      { icon: Bell, label: "通知設定", href: "#" },
    ],
  },
  {
    title: "その他",
    items: [
      { icon: Info, label: "ヘルプ", href: "#" },
      { icon: Info, label: "プライバシーポリシー", href: "#" },
      { icon: Info, label: "利用規約", href: "#" },
    ],
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const username = (session?.user as { username?: string })?.username || session?.user?.name || ""

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
    toast.success("ログアウトしました")
  }

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-3 bg-white border-b border-slate-100">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <span className="text-base font-bold text-slate-900">設定</span>
      </div>

      <div className="flex-1 py-4 space-y-4 px-4">
        {/* User info banner */}
        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{username[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{username}</p>
            <p className="text-xs text-slate-500">{session?.user?.email}</p>
          </div>
        </div>

        {sections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">{section.title}</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={() => item.href !== "#" ? router.push(item.href) : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left ${i < section.items.length - 1 ? "border-b border-slate-50" : ""}`}
                >
                  <item.icon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium text-slate-800">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-4 flex items-center gap-3 text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-semibold">ログアウト</span>
        </button>

        <p className="text-center text-slate-400 text-xs pb-4">Connectly v1.0.0</p>
      </div>
    </div>
  )
}
