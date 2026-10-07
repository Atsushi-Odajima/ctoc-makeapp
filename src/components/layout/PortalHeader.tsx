"use client"

import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Eye, Newspaper, Search, UsersRound } from "lucide-react"

type PortalHeaderProps = {
  searchValue?: string
  onSearchChange?: (value: string) => void
}

const navigation = [
  { label: "フィード", href: "/feed", icon: Newspaper },
  { label: "コミュニティ", href: "/communities", icon: UsersRound },
  { label: "足あと", href: "/notifications", icon: Eye },
]

export function PortalHeader({ searchValue, onSearchChange }: PortalHeaderProps) {
  const { data: session } = useSession()
  const canSearch = typeof searchValue === "string" && onSearchChange

  return (
    <header className="sticky top-0 z-50 border-b border-[#dfe3e8] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex flex-shrink-0 items-center gap-2.5" aria-label="ハレノワ TOP">
          <Image src="/logo.svg" alt="" width={34} height={34} priority />
          <span className="hidden text-xl font-black text-[#0b1f3a] sm:inline">ハレノワ</span>
        </Link>

        <nav className="flex items-center sm:ml-3">
          {navigation.map(item => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-bold text-[#344054] hover:bg-[#f2f4f7] hover:text-[#0b1f3a] md:px-3"
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          ))}
        </nav>

        {canSearch ? (
          <div className="hidden flex-1 justify-center md:flex">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
              <input
                value={searchValue}
                onChange={event => onSearchChange(event.target.value)}
                placeholder="投稿・アカウント・ニュースを検索"
                aria-label="検索"
                className="w-full rounded-md border border-[#d0d5dd] bg-[#f8fafc] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#0b1f3a] focus:bg-white"
              />
            </div>
          </div>
        ) : <div className="flex-1" />}

        <div className="ml-auto flex-shrink-0">
          {session?.user ? (
            <Link href="/profile" className="flex items-center gap-2 rounded-md border border-[#d0d5dd] px-3 py-2 text-sm font-bold text-[#0b1f3a] hover:bg-[#f8fafc]">
              <span className="hidden sm:inline">プロフィール</span>
              <span className="sm:hidden">マイページ</span>
            </Link>
          ) : (
            <Link href="/login" className="rounded-md bg-[#0b1f3a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102a4d]">ログイン</Link>
          )}
        </div>
      </div>
    </header>
  )
}
