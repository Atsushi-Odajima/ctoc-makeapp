"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, PlusSquare, Bell, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/feed", icon: Home, label: "ホーム" },
  { href: "/explore", icon: Search, label: "探索" },
  { href: "/create", icon: PlusSquare, label: "投稿", special: true },
  { href: "/notifications", icon: Bell, label: "通知" },
  { href: "/profile", icon: User, label: "プロフィール" },
]

export function InstagramNav() {
  const pathname = usePathname()
  return (
    <nav className="bg-white border-t border-slate-200 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label, special }) => {
          const isActive = pathname === href
          return (
            <Link key={href} href={href}
              className={cn("flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all",
                special ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl px-4 shadow-md shadow-blue-200"
                  : isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
              )}>
              <Icon className={cn("w-6 h-6", special ? "text-white" : "", isActive && !special ? "fill-slate-900" : "")}
                strokeWidth={isActive && !special ? 2.5 : 1.8} />
              {!special && <span className={cn("text-[10px] font-medium", isActive ? "text-slate-900" : "text-slate-400")}>{label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
