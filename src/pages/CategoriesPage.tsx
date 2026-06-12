import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Category } from '../lib/types'

export default function CategoriesPage() {
  const { profile } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    setCategories(data ?? [])
    const { data: threads } = await supabase.from('threads').select('category_id')
    const map: Record<string, number> = {}
    for (const t of threads ?? []) {
      map[t.category_id] = (map[t.category_id] ?? 0) + 1
    }
    setCounts(map)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addCategory = async (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    setError('')
    const { error: err } = await supabase.from('categories').insert({
      name,
      sort_order: categories.length + 1,
    })
    if (err) {
      setError(err.message.includes('duplicate') ? 'その名前のカテゴリは既にあります' : err.message)
    } else {
      setNewName('')
      await load()
    }
    setBusy(false)
  }

  return (
    <div className="p-4">
      <h2 className="mb-3 text-sm font-bold text-slate-600">カテゴリ(板)一覧</h2>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              to={`/?cat=${c.id}`}
              className="flex items-center justify-between rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition active:bg-sky-50"
            >
              <span className="font-bold text-slate-700">📂 {c.name}</span>
              <span className="text-xs text-slate-400">
                {counts[c.id] ?? 0} スレッド ›
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {profile?.is_admin && (
        <form
          onSubmit={addCategory}
          className="mt-6 rounded-xl border border-sky-200 bg-sky-100/60 p-4"
        >
          <h3 className="mb-2 text-xs font-bold text-sky-700">
            🔑 管理者メニュー: カテゴリ追加
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              maxLength={20}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新しいカテゴリ名"
              className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              追加
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </form>
      )}
    </div>
  )
}
