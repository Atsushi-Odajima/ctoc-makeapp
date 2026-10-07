"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Lock, Plus, Search, UsersRound, X } from "lucide-react"
import toast from "react-hot-toast"
import type { Community } from "@/types"

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", category: "暮らし" })

  useEffect(() => {
    fetch("/api/communities")
      .then(response => response.json())
      .then(data => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => toast.error("コミュニティを取得できませんでした"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => communities.filter(community => {
    const value = `${community.name} ${community.description} ${community.category}`.toLowerCase()
    return !query || value.includes(query.toLowerCase())
  }), [communities, query])

  async function createCommunity() {
    if (!form.name.trim() || !form.description.trim() || creating) return
    setCreating(true)
    try {
      const response = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setCommunities(current => [result, ...current])
      setForm({ name: "", description: "", category: "暮らし" })
      setShowCreate(false)
      toast.success("コミュニティを作成しました")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "作成できませんでした")
    } finally {
      setCreating(false)
    }
  }

  async function toggleJoin(community: Community) {
    try {
      const response = await fetch(`/api/communities/${community.slug}/join`, { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setCommunities(current => current.map(item => item.id === community.id ? {
        ...item,
        isMember: result.joined,
        role: result.role,
        memberCount: Math.max(0, item.memberCount + (result.joined && !item.isMember ? 1 : !result.joined && item.isMember ? -1 : 0)),
      } : item))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作できませんでした")
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#f5f6f8]">
      <header className="flex items-center gap-3 border-b border-[#dfe3e8] bg-white px-4 py-3">
        <UsersRound className="h-5 w-5 text-[#0b1f3a]" />
        <h1 className="flex-1 text-lg font-black text-[#0b1f3a]">コミュニティ</h1>
        <button onClick={() => setShowCreate(value => !value)} className="rounded-md bg-[#0b1f3a] p-2 text-white" aria-label={showCreate ? "作成を閉じる" : "コミュニティを作成"}>
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {showCreate && (
          <section className="border-b border-[#dfe3e8] bg-white p-4">
            <h2 className="mb-3 font-black text-[#0b1f3a]">新しいコミュニティ</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="コミュニティ名" maxLength={40} className="w-full rounded-md border border-[#d0d5dd] px-3 py-2.5 text-sm outline-none focus:border-[#0b1f3a]" />
              <textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="どんな話をする場所ですか" maxLength={240} className="min-h-24 w-full resize-none rounded-md border border-[#d0d5dd] px-3 py-2.5 text-sm outline-none focus:border-[#0b1f3a]" />
              <select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} className="w-full rounded-md border border-[#d0d5dd] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0b1f3a]">
                {['暮らし', 'おでかけ', 'エンタメ', '地域', 'スポーツ', '学び', 'その他'].map(category => <option key={category}>{category}</option>)}
              </select>
              <button onClick={createCommunity} disabled={creating || form.name.trim().length < 2 || form.description.trim().length < 5} className="w-full rounded-md bg-[#0b1f3a] py-2.5 text-sm font-bold text-white disabled:opacity-40">作成</button>
            </div>
          </section>
        )}

        <div className="border-b border-[#dfe3e8] bg-white p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="コミュニティを検索" className="w-full rounded-md border border-[#d0d5dd] bg-[#f8fafc] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0b1f3a] focus:bg-white" />
          </div>
        </div>

        <div className="space-y-3 p-4">
          {loading ? (
            [1, 2, 3].map(item => <div key={item} className="h-32 animate-pulse rounded-md border border-[#dfe3e8] bg-white" />)
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#667085]">コミュニティが見つかりません</p>
          ) : filtered.map(community => (
            <article key={community.id} className="rounded-md border border-[#dfe3e8] bg-white p-4">
              <div className="flex items-start gap-3">
                <Link href={`/communities/${community.slug}`} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-[#e9edf2] text-[#0b1f3a]">
                  <UsersRound className="h-5 w-5" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/communities/${community.slug}`} className="font-black text-[#0b1f3a] hover:underline">{community.name}</Link>
                    {community.isPrivate && <Lock className="h-3.5 w-3.5 text-[#667085]" />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#475467]">{community.description}</p>
                  <p className="mt-2 text-xs font-semibold text-[#667085]">{community.category} ・ {community.memberCount.toLocaleString()}人 ・ 投稿{community.postCount}件</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-[#e6e9ed] pt-3">
                <Link href={`/communities/${community.slug}`} className="flex-1 rounded-md border border-[#0b1f3a] py-2 text-center text-sm font-bold text-[#0b1f3a]">見る</Link>
                <button onClick={() => toggleJoin(community)} className={`flex-1 rounded-md py-2 text-sm font-bold ${community.isMember ? "border border-[#d0d5dd] bg-white text-[#344054]" : "bg-[#0b1f3a] text-white"}`}>
                  {community.role === "owner" ? "管理中" : community.isMember ? "参加中" : "参加"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
