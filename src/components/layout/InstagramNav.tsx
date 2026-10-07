"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Compass, Home, PlusSquare, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/feed", icon: Home, label: "ホーム" },
  { href: "/explore", icon: Compass, label: "見つける" },
  { href: "/create", icon: PlusSquare, label: "投稿", special: true },
  { href: "/notifications", icon: Bell, label: "反応" },
  { href: "/profile", icon: UserRound, label: "じぶん" },
]

export function InstagramNav() {
  const pathname = usePathname()
  return (
    <nav className="border-t border-[#dfe3e8] bg-white pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label, special }) => {
          const isActive = pathname === href || (href !== "/feed" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex min-w-12 flex-col items-center gap-0.5 rounded-md p-2 transition-colors active:bg-[#f2f4f7]",
                isActive ? "text-[#0b1f3a]" : "text-[#667085] hover:text-[#111827]"
              )}
            >
              <Icon className={cn("h-6 w-6", special && "text-[#e85d04]")} strokeWidth={isActive ? 2.4 : 1.8} />
              {!special && <span className={cn("text-[10px] font-semibold", isActive ? "text-[#0b1f3a]" : "text-[#667085]")}>{label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
