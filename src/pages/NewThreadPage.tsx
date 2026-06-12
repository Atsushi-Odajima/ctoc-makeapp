import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Category } from '../lib/types'

export default function NewThreadPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setCategories(data ?? [])
        if (data?.[0]) setCategoryId((prev) => prev || data[0].id)
      })
  }, [])

  const onFileChange = (f: File | null) => {
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(f ? URL.createObjectURL(f) : '')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const uid = session!.user.id
      let imageUrl: string | null = null

      if (file) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${uid}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('thread-images')
          .upload(path, file)
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('thread-images').getPublicUrl(path).data
          .publicUrl
      }

      const { data, error: insErr } = await supabase
        .from('threads')
        .insert({
          category_id: categoryId,
          author_id: uid,
          title: title.trim(),
          body: body.trim(),
          image_url: imageUrl,
        })
        .select('id')
        .single()
      if (insErr) throw insErr

      navigate(`/thread/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-4">
      <h2 className="text-sm font-bold text-slate-600">新しいスレッドを立てる</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          カテゴリ
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full rounded-xl border border-sky-200 bg-white px-3 py-3 text-base outline-none focus:border-sky-400"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          タイトル
        </label>
        <input
          type="text"
          required
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 巣鴨駅前の新しい角打ち行った人いる？"
          className="w-full rounded-xl border border-sky-200 bg-white px-3 py-3 text-base outline-none focus:border-sky-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">本文</label>
        <textarea
          required
          maxLength={4000}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="本文を入力..."
          className="w-full rounded-xl border border-sky-200 bg-white px-3 py-3 text-base outline-none focus:border-sky-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          画像(1枚まで・任意)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-sky-700"
        />
        {preview && (
          <div className="relative mt-2">
            <img src={preview} alt="プレビュー" className="max-h-60 rounded-xl" />
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white"
            >
              ✕ 削除
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? '投稿中...' : 'スレッドを立てる 🍻'}
      </button>
    </form>
  )
}
