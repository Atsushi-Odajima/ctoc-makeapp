import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getNewsMetrics } from "@/lib/news"

const FEEDS = [
  { key: "top", label: "主要", url: "https://news.yahoo.co.jp/rss/topics/top-picks.xml" },
  { key: "domestic", label: "国内", url: "https://news.yahoo.co.jp/rss/topics/domestic.xml" },
  { key: "business", label: "経済", url: "https://news.yahoo.co.jp/rss/topics/business.xml" },
  { key: "it", label: "IT", url: "https://news.yahoo.co.jp/rss/topics/it.xml" },
  { key: "world", label: "国際", url: "https://news.yahoo.co.jp/rss/topics/world.xml" },
  { key: "entertainment", label: "エンタメ", url: "https://news.yahoo.co.jp/rss/topics/entertainment.xml" },
  { key: "sports", label: "スポーツ", url: "https://news.yahoo.co.jp/rss/topics/sports.xml" },
]

const fallbackItems = [
  { title: "週末の天気に注目　各地で気温差も", link: "https://news.yahoo.co.jp/", pubDate: new Date().toISOString(), category: "主要", feedKey: "top", source: "Yahoo!ニュース" },
  { title: "生成AI活用、暮らしのサービスにも広がる", link: "https://news.yahoo.co.jp/", pubDate: new Date().toISOString(), category: "IT", feedKey: "it", source: "Yahoo!ニュース" },
  { title: "物価と賃上げ、家計の実感に変化", link: "https://news.yahoo.co.jp/", pubDate: new Date().toISOString(), category: "経済", feedKey: "business", source: "Yahoo!ニュース" },
]

type RssItem = {
  title?: string
  link?: string
  pubDate?: string
  description?: string
}

type FeedItem = {
  id: string
  title: string
  link: string
  publishedAt: string
  summary: string
  category: string
  feedKey: string
  source: string
  rank: number
}

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim()
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return match ? decodeXml(match[1]) : undefined
}

function parseRssItems(xml: string): RssItem[] {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(match => ({
    title: readTag(match[1], "title"),
    link: readTag(match[1], "link"),
    pubDate: readTag(match[1], "pubDate"),
    description: readTag(match[1], "description"),
  }))
}

function stableId(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 16)
}

function validDate(value?: string) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function normalizeItem(item: RssItem, feed: (typeof FEEDS)[number], rank: number): FeedItem | null {
  const title = String(item.title || "").trim()
  const link = String(item.link || "").trim()
  if (!title || !link) return null
  return {
    id: stableId(`${link}:${title}`),
    title,
    link,
    publishedAt: validDate(item.pubDate).toISOString(),
    summary: item.description ? String(item.description).replace(/<[^>]+>/g, "").trim() : "",
    category: feed.label,
    feedKey: feed.key,
    source: "Yahoo!ニュース",
    rank,
  }
}

async function fetchItems() {
  const results = await Promise.allSettled(FEEDS.map(async feed => {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "DayNetNews/1.0" },
      next: { revalidate: 300 },
    })
    if (!response.ok) throw new Error(`RSS fetch failed: ${feed.key}`)
    const items = parseRssItems(await response.text())
    return items.slice(0, 8).map((item: RssItem, index: number) => normalizeItem(item, feed, index + 1)).filter((item): item is FeedItem => item !== null)
  }))

  const seen = new Set<string>()
  const items = results.flatMap(result => result.status === "fulfilled" ? result.value : []).filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })

  if (items.length > 0) return items.map((item, index) => ({ ...item, rank: index + 1 })).slice(0, 36)
  return fallbackItems.map((item, index) => ({
    id: stableId(`${item.link}:${item.title}:${index}`),
    title: item.title,
    link: item.link,
    publishedAt: item.pubDate,
    summary: "",
    category: item.category,
    feedKey: item.feedKey,
    source: item.source,
    rank: index + 1,
  }))
}

export async function GET() {
  const items = await fetchItems()

  try {
    await prisma.$transaction(items.map(item => prisma.newsArticle.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: item.title,
        link: item.link,
        summary: item.summary,
        category: item.category,
        feedKey: item.feedKey,
        source: item.source,
        publishedAt: new Date(item.publishedAt),
      },
      update: {
        title: item.title,
        link: item.link,
        summary: item.summary,
        category: item.category,
        feedKey: item.feedKey,
        source: item.source,
        publishedAt: new Date(item.publishedAt),
      },
    })))

    const metrics = await getNewsMetrics(items.map(item => item.id))
    const enriched = items.map(item => ({
      ...item,
      ...(metrics.get(item.id) || { comments: 0, quotes: 0, views: 0, heat: 0, velocity: 0 }),
    })).sort((a, b) => b.heat - a.heat || b.velocity - a.velocity || a.rank - b.rank)

    return NextResponse.json({
      provider: "Yahoo!ニュース RSS",
      providerUrl: "https://news.yahoo.co.jp/rss/",
      fetchedAt: new Date().toISOString(),
      items: enriched,
    })
  } catch (error) {
    console.error("News persistence failed", error)
    return NextResponse.json({
      provider: "Yahoo!ニュース RSS",
      providerUrl: "https://news.yahoo.co.jp/rss/",
      fetchedAt: new Date().toISOString(),
      items: items.map(item => ({ ...item, comments: 0, quotes: 0, views: 0, heat: 0, velocity: 0 })),
    })
  }
}
