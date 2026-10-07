"use client"
import { useRouter } from "next/navigation"
import { Bell, ChevronLeft, ChevronRight, Eye, Info, Lock, LogOut, ShieldCheck, User } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
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
    title: "安心設定",
    items: [
      { icon: Eye, label: "足あと表示", href: "#" },
      { icon: Bell, label: "通知設定", href: "#" },
      { icon: ShieldCheck, label: "全年齢セーフティ", href: "#" },
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
    <div className="flex h-full flex-col overflow-y-auto bg-[#f5f6f8]">
      <div className="flex items-center gap-3 border-b border-[#dfe3e8] bg-white px-2 py-3">
        <button onClick={() => router.back()} className="rounded-md p-2 hover:bg-[#f2f4f7]" aria-label="戻る">
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <span className="text-base font-black text-slate-900">設定</span>
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b1f3a]">
            <span className="text-sm font-black text-white">{username[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{username}</p>
            <p className="text-xs text-slate-500">{session?.user?.email}</p>
          </div>
        </div>

        {sections.map(section => (
          <div key={section.title}>
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-slate-500">{section.title}</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {section.items.map((item, i) => (
                <button key={item.label} onClick={() => item.href !== "#" ? router.push(item.href) : undefined} className={`flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-[#f8fafc] ${i < section.items.length - 1 ? "border-b border-[#e6e9ed]" : ""}`}>
                  <item.icon className="h-5 w-5 flex-shrink-0 text-slate-500" />
                  <span className="flex-1 text-sm font-semibold text-slate-800">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-md border border-[#dfe3e8] bg-white px-4 py-4 text-[#0b1f3a] hover:bg-[#f8fafc]">
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-bold">ログアウト</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          <img src="/logo.svg" alt="ハレノワ" className="h-4 w-4 object-contain opacity-50" />
          <p className="text-xs text-slate-400">ハレノワ v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
