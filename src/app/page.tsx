"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Eye, Flame, MessageCircle, Play, Quote, Sparkles, UserPlus } from "lucide-react"
import toast from "react-hot-toast"
import { PostCard } from "@/components/feed/PostCard"
import { PortalHeader } from "@/components/layout/PortalHeader"
import { cn, formatTimeAgo, getAvatarUrl } from "@/lib/utils"
import type { Post } from "@/types"

type NewsItem = {
  id: string
  title: string
  link: string
  publishedAt: string
  summary?: string
  category: string
  feedKey: string
  source: string
  rank: number
  comments: number
  quotes: number
  views: number
  heat: number
  velocity: number
}

type NewsResponse = {
  provider: string
  providerUrl: string
  fetchedAt: string
  items: NewsItem[]
}

type SuggestedAccount = {
  id: string
  name: string
  username: string
  avatar: string | null
  bio: string | null
  followersCount: number
  postsCount: number
  reason: string
}

type HomeResponse = {
  feed: Post[]
  reels: Post[]
  recommended: Post[]
  accounts: SuggestedAccount[]
  personalized: boolean
}

const newsTabs = ["総合", "国内", "経済", "IT", "国際", "エンタメ", "スポーツ"]
const categoryToFeed: Record<string, string> = {
  国内: "domestic",
  経済: "business",
  IT: "it",
  国際: "world",
  エンタメ: "entertainment",
  スポーツ: "sports",
}
const seenStorageKey = "harenowa-seen-posts"

function readSeenPosts() {
  try {
    const value = JSON.parse(localStorage.getItem(seenStorageKey) || "[]")
    return Array.isArray(value) ? value.filter(item => typeof item === "string").slice(0, 30) : []
  } catch {
    return []
  }
}

function ViewedPost({ postId, onSeen, children }: { postId: string; onSeen: (id: string) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === "undefined") return
    let timer: number | undefined
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        timer = window.setTimeout(() => onSeen(postId), 700)
      } else if (timer) {
        window.clearTimeout(timer)
      }
    }, { threshold: 0.6 })
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [onSeen, postId])

  return <div ref={ref}>{children}</div>
}

function matchesPost(post: Post, query: string) {
  if (!query) return true
  const value = `${post.caption || ""} ${post.location || ""} ${post.user.name} ${post.user.username} ${post.community?.name || ""}`.toLowerCase()
  return value.includes(query.toLowerCase())
}

export default function HomePage() {
  const router = useRouter()
  const { status } = useSession()
  const [home, setHome] = useState<HomeResponse | null>(null)
  const [news, setNews] = useState<NewsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [newsTab, setNewsTab] = useState("総合")
  const [mobilePanel, setMobilePanel] = useState<"social" | "news">("social")
  const [following, setFollowing] = useState<string[]>([])
  const recommendationRefresh = useRef(0)

  const requestHome = useCallback(async () => {
    const seen = readSeenPosts()
    const response = await fetch(`/api/home?seen=${encodeURIComponent(seen.join(","))}`, { cache: "no-store" })
    if (!response.ok) throw new Error("home")
    return response.json() as Promise<HomeResponse>
  }, [])

  useEffect(() => {
    Promise.all([
      requestHome(),
      fetch("/api/news", { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error("news")
        return response.json()
      }) as Promise<NewsResponse>,
    ]).then(([homeData, newsData]) => {
      setHome(homeData)
      setNews(newsData)
    }).catch(() => toast.error("コンテンツを読み込めませんでした"))
      .finally(() => setLoading(false))
  }, [requestHome])

  const recordSeen = useCallback((postId: string) => {
    const current = readSeenPosts()
    if (current.includes(postId)) return
    localStorage.setItem(seenStorageKey, JSON.stringify([postId, ...current].slice(0, 30)))
    recommendationRefresh.current += 1
    if (recommendationRefresh.current >= 4) {
      recommendationRefresh.current = 0
      requestHome().then(result => setHome(current => current ? {
        ...current,
        recommended: result.recommended,
        accounts: result.accounts,
        personalized: result.personalized,
      } : result)).catch(() => {})
    }
  }, [requestHome])

  const feedPosts = useMemo(() => (home?.feed || []).filter(post => matchesPost(post, query)), [home?.feed, query])
  const recommendedPosts = useMemo(() => (home?.recommended || []).filter(post => matchesPost(post, query)), [home?.recommended, query])
  const accounts = useMemo(() => (home?.accounts || []).filter(account => {
    if (!query) return true
    return `${account.name} ${account.username} ${account.bio || ""}`.toLowerCase().includes(query.toLowerCase())
  }), [home?.accounts, query])
  const filteredNews = useMemo(() => (news?.items || []).filter(item => {
    const matchesTab = newsTab === "総合" || item.feedKey === categoryToFeed[newsTab]
    const matchesQuery = !query || item.title.toLowerCase().includes(query.toLowerCase())
    return matchesTab && matchesQuery
  }).slice(0, 14), [news?.items, newsTab, query])

  async function followAccount(accountId: string) {
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=/")
      return
    }
    try {
      const response = await fetch(`/api/follow/${accountId}`, { method: "POST" })
      if (!response.ok) throw new Error("follow")
      const result = await response.json()
      setFollowing(current => result.following ? [...current, accountId] : current.filter(id => id !== accountId))
    } catch {
      toast.error("フォローを更新できませんでした")
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#111827]">
      <PortalHeader searchValue={query} onSearchChange={setQuery} />

      <div className="sticky top-16 z-40 grid grid-cols-2 border-b border-[#dfe3e8] bg-white lg:hidden">
        <button onClick={() => setMobilePanel("social")} className={cn("border-b-2 py-3 text-sm font-bold", mobilePanel === "social" ? "border-[#0b1f3a] text-[#0b1f3a]" : "border-transparent text-[#667085]")}>タイムライン</button>
        <button onClick={() => setMobilePanel("news")} className={cn("border-b-2 py-3 text-sm font-bold", mobilePanel === "news" ? "border-[#0b1f3a] text-[#0b1f3a]" : "border-transparent text-[#667085]")}>ニュース</button>
      </div>

      <main className="mx-auto grid max-w-7xl items-start gap-6 px-0 py-5 sm:px-4 lg:grid-cols-[minmax(0,700px)_minmax(340px,400px)] lg:justify-center">
        <section className={cn("min-w-0 space-y-7", mobilePanel !== "social" && "hidden lg:block")}>
          <section className="px-4 sm:px-0" aria-labelledby="reels-heading">
            <div className="mb-3 flex items-center justify-between">
              <h1 id="reels-heading" className="text-base font-black text-[#0b1f3a]">リール</h1>
              <Link href="/explore" className="text-xs font-bold text-[#667085] hover:text-[#0b1f3a]">もっと見る</Link>
            </div>
            {loading ? (
              <div className="flex gap-3 overflow-hidden">{[1, 2, 3, 4].map(item => <div key={item} className="aspect-[9/16] w-36 flex-shrink-0 animate-pulse rounded-md bg-[#e9edf2]" />)}</div>
            ) : (home?.reels.length || 0) > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {home?.reels.map(post => (
                  <Link key={post.id} href={`/post/${post.id}`} onClick={() => recordSeen(post.id)} className="group relative aspect-[9/16] w-36 flex-shrink-0 overflow-hidden rounded-md bg-[#111827] sm:w-40">
                    <img src={post.images[0]} alt={post.caption || `${post.user.name}のリール`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"><Play className="ml-0.5 h-4 w-4 fill-white" /></span>
                    <div className="absolute inset-x-0 bottom-0 bg-black/65 p-3 text-white">
                      <div className="flex items-center gap-2">
                        <img src={getAvatarUrl(post.user)} alt="" className="h-6 w-6 rounded-full border border-white/70 object-cover" />
                        <span className="truncate text-xs font-bold">{post.user.username}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed">{post.caption || "新しい投稿"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p className="py-6 text-sm text-[#667085]">リールはまだありません</p>}
          </section>

          {accounts.length > 0 && (
            <section className="px-4 sm:px-0" aria-labelledby="accounts-heading">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#e85d04]" />
                <h2 id="accounts-heading" className="text-base font-black text-[#0b1f3a]">おすすめの人</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {accounts.map(account => {
                  const isFollowing = following.includes(account.id)
                  return (
                    <article key={account.id} className="w-52 flex-shrink-0 rounded-md border border-[#dfe3e8] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/u/${account.username}`}><img src={getAvatarUrl(account)} alt={account.name} className="h-12 w-12 rounded-full border border-[#dfe3e8] object-cover" /></Link>
                        <button onClick={() => followAccount(account.id)} className={cn("flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-bold", isFollowing ? "border border-[#d0d5dd] text-[#475467]" : "bg-[#0b1f3a] text-white")}>
                          <UserPlus className="h-3.5 w-3.5" />{isFollowing ? "フォロー中" : "フォロー"}
                        </button>
                      </div>
                      <Link href={`/u/${account.username}`} className="mt-3 block truncate text-sm font-black text-[#111827]">{account.name}</Link>
                      <p className="truncate text-xs text-[#667085]">@{account.username}</p>
                      <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-relaxed text-[#475467]">{account.reason}</p>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          <section aria-labelledby="feed-heading">
            <div className="mb-3 flex items-end justify-between px-4 sm:px-0">
              <h2 id="feed-heading" className="text-base font-black text-[#0b1f3a]">{status === "authenticated" ? "フォロー中の投稿" : "新着の投稿"}</h2>
              {status === "authenticated" && <Link href="/create" className="rounded-md bg-[#0b1f3a] px-3 py-2 text-xs font-bold text-white">投稿する</Link>}
            </div>
            <div className="space-y-5">
              {loading ? [1, 2].map(item => <div key={item} className="mx-4 h-[520px] animate-pulse rounded-md bg-[#e9edf2] sm:mx-0" />) : feedPosts.length > 0 ? feedPosts.map(post => (
                <ViewedPost key={post.id} postId={post.id} onSeen={recordSeen}>
                  <PostCard post={post} framed />
                </ViewedPost>
              )) : <p className="bg-white px-4 py-12 text-center text-sm text-[#667085] sm:rounded-md sm:border sm:border-[#dfe3e8]">該当する投稿がありません</p>}
            </div>
          </section>

          {recommendedPosts.length > 0 && (
            <section aria-labelledby="recommended-heading">
              <div className="mb-3 flex items-center gap-2 px-4 sm:px-0">
                <Sparkles className="h-4 w-4 text-[#e85d04]" />
                <h2 id="recommended-heading" className="text-base font-black text-[#0b1f3a]">あなたへのおすすめ</h2>
              </div>
              <div className="space-y-5">
                {recommendedPosts.map(post => (
                  <ViewedPost key={post.id} postId={post.id} onSeen={recordSeen}>
                    <PostCard post={post} framed />
                  </ViewedPost>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className={cn("min-w-0 px-4 sm:px-0 lg:sticky lg:top-20", mobilePanel !== "news" && "hidden lg:block")}>
          <section className="overflow-hidden rounded-md border border-[#dfe3e8] bg-white" aria-labelledby="news-heading">
            <div className="border-b border-[#dfe3e8] px-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 id="news-heading" className="text-base font-black text-[#0b1f3a]">ニュース</h2>
                <span className="text-[11px] text-[#667085]">Yahoo!ニュース RSS</span>
              </div>
              <div className="mt-3 flex gap-4 overflow-x-auto scrollbar-hide">
                {newsTabs.map(tab => (
                  <button key={tab} onClick={() => setNewsTab(tab)} className={cn("flex-shrink-0 border-b-2 pb-2 text-xs font-bold", newsTab === tab ? "border-[#0b1f3a] text-[#0b1f3a]" : "border-transparent text-[#667085] hover:text-[#111827]")}>{tab}</button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[#e6e9ed] lg:max-h-[calc(100vh-10.5rem)] lg:overflow-y-auto">
              {loading ? [1, 2, 3, 4, 5].map(item => <div key={item} className="m-4 h-20 animate-pulse rounded bg-[#eef1f4]" />) : filteredNews.length > 0 ? filteredNews.map((item, index) => (
                <Link key={item.id} href={`/news/${item.id}`} className="group flex gap-3 px-4 py-4 hover:bg-[#f8fafc]">
                  <span className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-xs font-black", index < 3 ? "bg-[#0b1f3a] text-white" : "bg-[#edf0f3] text-[#475467]")}>{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-[#667085]">
                      <span className="font-bold text-[#0b1f3a]">{item.category}</span>
                      <span>{formatTimeAgo(item.publishedAt)}</span>
                      {item.velocity > 0 && <span className="ml-auto inline-flex items-center gap-0.5 font-bold text-[#e85d04]"><Flame className="h-3 w-3" />+{item.velocity}</span>}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#111827] group-hover:text-[#0b1f3a]">{item.title}</h3>
                    <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-[#667085]">
                      <span className="inline-flex items-center gap-1 text-[#e85d04]"><Flame className="h-3 w-3" />{item.heat}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{item.comments}</span>
                      <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{item.views}</span>
                      <span className="inline-flex items-center gap-1"><Quote className="h-3 w-3" />{item.quotes}</span>
                    </div>
                  </div>
                </Link>
              )) : <p className="p-8 text-center text-sm text-[#667085]">該当するニュースがありません</p>}
            </div>
          </section>
          <p className="px-1 py-3 text-[11px] leading-relaxed text-[#667085]">見出しはYahoo!ニュースのRSSを利用しています。記事本文は配信元で確認できます。</p>
        </aside>
      </main>
    </div>
  )
}
