import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/format'
import Avatar from '../components/Avatar'
import type { Category, Thread } from '../lib/types'

type SortKey = 'new' | 'comments' | 'likes'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'new', label: '新着順' },
  { key: 'comments', label: 'コメント順' },
  { key: 'likes', label: 'いいね順' },
]

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('cat')
  const [sort, setSort] = useState<SortKey>('new')
  const [categories, setCategories] = useState<Category[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let query = supabase
        .from('thread_list')
        .select('*, category:categories(*), author:profiles(*)')
      if (categoryId) query = query.eq('category_id', categoryId)
      if (sort === 'new') query = query.order('created_at', { ascending: false })
      if (sort === 'comments')
        query = query
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false })
      if (sort === 'likes')
        query = query
          .order('like_count', { ascending: false })
          .order('created_at', { ascending: false })
      const { data } = await query.limit(100)
      setThreads(data ?? [])
      setLoading(false)
    }
    load()
  }, [categoryId, sort])

  return (
    <div>
      {/* カテゴリ絞り込みチップ */}
      <div className="sticky top-[49px] z-10 border-b border-sky-100 bg-sky-50/95 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          <Chip
            label="すべて"
            active={!categoryId}
            onClick={() => setSearchParams({})}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={categoryId === c.id}
              onClick={() => setSearchParams({ cat: c.id })}
            />
          ))}
        </div>

        {/* 並び替えタブ */}
        <div className="flex px-4 pb-2">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                sort === s.key
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">読み込み中...</p>
      ) : threads.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mb-2 text-4xl">🍻</div>
          <p className="text-sm text-slate-500">
            まだスレッドがありません。
            <br />
            最初の一杯(投稿)をどうぞ！
          </p>
        </div>
      ) : (
        <ul className="space-y-2 p-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                to={`/thread/${t.id}`}
                className="block rounded-xl border border-sky-100 bg-white p-3.5 shadow-sm transition active:bg-sky-50"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                    {t.category?.name ?? '不明'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {timeAgo(t.created_at)}
                  </span>
                </div>
                <h2 className="mb-1 font-bold leading-snug text-slate-800">
                  {t.title}
                </h2>
                <p className="mb-2 line-clamp-2 text-xs text-slate-500">{t.body}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Avatar avatar={t.author?.avatar} size="sm" />
                  <span className="flex-1 truncate">{t.author?.nickname}</span>
                  <span>💬 {t.comment_count ?? 0}</span>
                  <span>👍 {t.like_count ?? 0}</span>
                  {t.image_url && <span>📷</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-sky-500 bg-sky-500 text-white'
          : 'border-sky-200 bg-white text-sky-700'
      }`}
    >
      {label}
    </button>
  )
}
