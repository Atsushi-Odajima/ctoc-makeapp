import { prisma } from "@/lib/db"

export type NewsMetrics = {
  comments: number
  quotes: number
  views: number
  heat: number
  velocity: number
}

type CountRow = {
  articleId: string
  _count: { _all: number }
}

type QuoteCountRow = {
  newsArticleId: string | null
  _count: { _all: number }
}

function countMap<T extends { _count: { _all: number } }>(rows: T[], key: (row: T) => string | null) {
  return new Map(rows.flatMap(row => {
    const id = key(row)
    return id ? [[id, row._count._all] as const] : []
  }))
}

export async function getNewsMetrics(articleIds: string[]) {
  const uniqueIds = [...new Set(articleIds)]
  const empty = new Map<string, NewsMetrics>()
  if (uniqueIds.length === 0) return empty

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [allComments, recentComments, allQuotes, recentQuotes, allViews, recentViews] = await Promise.all([
    prisma.newsComment.groupBy({
      by: ["articleId"],
      where: { articleId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.newsComment.groupBy({
      by: ["articleId"],
      where: { articleId: { in: uniqueIds }, createdAt: { gte: hourAgo } },
      _count: { _all: true },
    }),
    prisma.post.groupBy({
      by: ["newsArticleId"],
      where: { newsArticleId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.post.groupBy({
      by: ["newsArticleId"],
      where: { newsArticleId: { in: uniqueIds }, createdAt: { gte: hourAgo } },
      _count: { _all: true },
    }),
    prisma.newsActivity.groupBy({
      by: ["articleId"],
      where: { articleId: { in: uniqueIds }, kind: "view" },
      _count: { _all: true },
    }),
    prisma.newsActivity.groupBy({
      by: ["articleId"],
      where: { articleId: { in: uniqueIds }, kind: "view", createdAt: { gte: hourAgo } },
      _count: { _all: true },
    }),
  ])

  const dailyComments = await prisma.newsComment.groupBy({
    by: ["articleId"],
    where: { articleId: { in: uniqueIds }, createdAt: { gte: dayAgo } },
    _count: { _all: true },
  })
  const dailyQuotes = await prisma.post.groupBy({
    by: ["newsArticleId"],
    where: { newsArticleId: { in: uniqueIds }, createdAt: { gte: dayAgo } },
    _count: { _all: true },
  })
  const dailyViews = await prisma.newsActivity.groupBy({
    by: ["articleId"],
    where: { articleId: { in: uniqueIds }, kind: "view", createdAt: { gte: dayAgo } },
    _count: { _all: true },
  })

  const totalCommentMap = countMap(allComments as CountRow[], row => row.articleId)
  const recentCommentMap = countMap(recentComments as CountRow[], row => row.articleId)
  const dailyCommentMap = countMap(dailyComments as CountRow[], row => row.articleId)
  const totalQuoteMap = countMap(allQuotes as QuoteCountRow[], row => row.newsArticleId)
  const recentQuoteMap = countMap(recentQuotes as QuoteCountRow[], row => row.newsArticleId)
  const dailyQuoteMap = countMap(dailyQuotes as QuoteCountRow[], row => row.newsArticleId)
  const totalViewMap = countMap(allViews as CountRow[], row => row.articleId)
  const recentViewMap = countMap(recentViews as CountRow[], row => row.articleId)
  const dailyViewMap = countMap(dailyViews as CountRow[], row => row.articleId)

  return new Map(uniqueIds.map(id => {
    const comments24h = dailyCommentMap.get(id) || 0
    const quotes24h = dailyQuoteMap.get(id) || 0
    const views24h = dailyViewMap.get(id) || 0
    const weighted24h = views24h + comments24h * 8 + quotes24h * 12
    const velocity = (recentViewMap.get(id) || 0)
      + (recentCommentMap.get(id) || 0) * 8
      + (recentQuoteMap.get(id) || 0) * 12
    const heat = weighted24h === 0 ? 0 : Math.min(100, Math.round(Math.log1p(weighted24h) * 18))

    return [id, {
      comments: totalCommentMap.get(id) || 0,
      quotes: totalQuoteMap.get(id) || 0,
      views: totalViewMap.get(id) || 0,
      heat,
      velocity,
    }] as const
  }))
}

export async function getNewsMetric(articleId: string) {
  const metrics = await getNewsMetrics([articleId])
  return metrics.get(articleId) || { comments: 0, quotes: 0, views: 0, heat: 0, velocity: 0 }
}
