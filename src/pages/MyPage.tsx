import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { timeAgo } from '../lib/format'
import Avatar from '../components/Avatar'
import type { Comment, Report, Thread } from '../lib/types'

const EMOJIS = [
  '🍶', '🍺', '🍻', '🥃', '🍷', '🥂', '🍸', '🍹',
  '🍢', '🍜', '🍣', '🍖', '🍙', '🍤', '🍕', '🍔',
  '😀', '😎', '🤪', '🥴', '😇', '🐸', '🐙', '👺',
]

export default function MyPage() {
  const { session, profile, signOut, refreshProfile } = useAuth()
  const uid = session!.user.id

  // プロフィール編集
  const [editingProfile, setEditingProfile] = useState(false)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [avatarTab, setAvatarTab] = useState<'emoji' | 'photo'>('emoji')
  const [saving, setSaving] = useState(false)

  // 自分の投稿
  const [myThreads, setMyThreads] = useState<Thread[]>([])
  const [myComments, setMyComments] = useState<Comment[]>([])

  // 管理者: 通報一覧
  const [reports, setReports] = useState<Report[]>([])
  const [reportTargets, setReportTargets] = useState<
    Record<string, { text: string; threadId: string | null }>
  >({})

  const loadMine = useCallback(async () => {
    const [{ data: ts }, { data: cs }] = await Promise.all([
      supabase
        .from('threads')
        .select('*, category:categories(name)')
        .eq('author_id', uid)
        .order('created_at', { ascending: false }),
      supabase
        .from('comments')
        .select('*')
        .eq('author_id', uid)
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    setMyThreads((ts as Thread[]) ?? [])
    setMyComments(cs ?? [])
  }, [uid])

  const loadReports = useCallback(async () => {
    if (!profile?.is_admin) return
    const { data: rs } = await supabase
      .from('reports')
      .select('*, reporter:profiles(nickname)')
      .order('resolved')
      .order('created_at', { ascending: false })
    const reportList = (rs as Report[]) ?? []
    setReports(reportList)

    // 通報対象の本文プレビューとリンク先スレッドを引く
    const threadIds = reportList.filter((r) => r.target_type === 'thread').map((r) => r.target_id)
    const commentIds = reportList.filter((r) => r.target_type === 'comment').map((r) => r.target_id)
    const [{ data: ts }, { data: cs }] = await Promise.all([
      threadIds.length
        ? supabase.from('threads').select('id, title').in('id', threadIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      commentIds.length
        ? supabase.from('comments').select('id, body, thread_id').in('id', commentIds)
        : Promise.resolve({ data: [] as { id: string; body: string; thread_id: string }[] }),
    ])
    const map: Record<string, { text: string; threadId: string | null }> = {}
    for (const t of ts ?? []) map[t.id] = { text: t.title, threadId: t.id }
    for (const c of cs ?? []) map[c.id] = { text: c.body, threadId: c.thread_id }
    setReportTargets(map)
  }, [profile?.is_admin])

  useEffect(() => {
    loadMine()
  }, [loadMine])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const startEdit = () => {
    setNickname(profile?.nickname ?? '')
    setBio(profile?.bio ?? '')
    setAvatar(profile?.avatar ?? '🍶')
    setAvatarTab(profile?.avatar.startsWith('http') ? 'photo' : 'emoji')
    setEditingProfile(true)
  }

  const uploadAvatar = async (file: File) => {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${uid}/avatar-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file)
    if (error) {
      alert(`アップロードに失敗しました: ${error.message}`)
      return
    }
    setAvatar(supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl)
  }

  const saveProfile = async () => {
    if (!nickname.trim()) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ nickname: nickname.trim(), bio: bio.trim(), avatar })
      .eq('id', uid)
    await refreshProfile()
    setSaving(false)
    setEditingProfile(false)
  }

  const deleteThread = async (id: string) => {
    if (!confirm('このスレッドを削除しますか？')) return
    await supabase.from('threads').delete().eq('id', id)
    loadMine()
  }

  const deleteComment = async (id: string) => {
    if (!confirm('このコメントを削除しますか？')) return
    await supabase.from('comments').delete().eq('id', id)
    loadMine()
  }

  const toggleResolved = async (r: Report) => {
    await supabase.from('reports').update({ resolved: !r.resolved }).eq('id', r.id)
    loadReports()
  }

  return (
    <div className="space-y-4 p-4">
      {/* プロフィール */}
      <section className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
        {editingProfile ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <Avatar avatar={avatar} size="lg" />
            </div>

            <div className="grid grid-cols-2 rounded-lg bg-sky-100 p-1 text-xs font-bold">
              <button
                onClick={() => setAvatarTab('emoji')}
                className={`rounded-md py-1.5 ${avatarTab === 'emoji' ? 'bg-white text-sky-700 shadow' : 'text-sky-500'}`}
              >
                絵文字を選ぶ
              </button>
              <button
                onClick={() => setAvatarTab('photo')}
                className={`rounded-md py-1.5 ${avatarTab === 'photo' ? 'bg-white text-sky-700 shadow' : 'text-sky-500'}`}
              >
                写真を選ぶ
              </button>
            </div>

            {avatarTab === 'emoji' ? (
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setAvatar(e)}
                    className={`rounded-lg py-1.5 text-xl ${avatar === e ? 'bg-sky-200' : 'bg-sky-50'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadAvatar(f)
                }}
                className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-sky-700"
              />
            )}

            <input
              type="text"
              value={nickname}
              maxLength={20}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ニックネーム"
              className="w-full rounded-xl border border-sky-200 px-3 py-2.5 text-base outline-none focus:border-sky-400"
            />
            <textarea
              value={bio}
              maxLength={300}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              placeholder="自己紹介(好きな酒・よく行く店など)"
              className="w-full rounded-xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
            />
            <div className="flex gap-2">
              <button
                onClick={saveProfile}
                disabled={saving || !nickname.trim()}
                className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存する'}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm text-slate-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Avatar avatar={profile?.avatar} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-bold text-slate-800">
                {profile?.nickname}
                {profile?.is_admin && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    管理者
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">{session!.user.email}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-600">
                {profile?.bio || '自己紹介は未設定です'}
              </p>
              <button
                onClick={startEdit}
                className="mt-2 rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700"
              >
                ✏️ プロフィールを編集
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 自分のスレッド */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-bold text-slate-500">
          自分のスレッド({myThreads.length})
        </h2>
        {myThreads.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-400">
            まだスレッドはありません
          </p>
        ) : (
          <ul className="space-y-1.5">
            {myThreads.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white p-3 shadow-sm"
              >
                <Link to={`/thread/${t.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-700">{t.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {t.category?.name} ・ {timeAgo(t.created_at)}
                  </p>
                </Link>
                <button
                  onClick={() => deleteThread(t.id)}
                  className="shrink-0 text-xs text-red-400"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 自分のコメント */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-bold text-slate-500">
          自分のコメント(直近{myComments.length}件)
        </h2>
        {myComments.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-400">
            まだコメントはありません
          </p>
        ) : (
          <ul className="space-y-1.5">
            {myComments.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white p-3 shadow-sm"
              >
                <Link to={`/thread/${c.thread_id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">{c.body}</p>
                  <p className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</p>
                </Link>
                <button
                  onClick={() => deleteComment(c.id)}
                  className="shrink-0 text-xs text-red-400"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 管理者: 通報一覧 */}
      {profile?.is_admin && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <h2 className="mb-2 text-xs font-bold text-amber-700">
            🔑 管理者メニュー: 通報一覧({reports.filter((r) => !r.resolved).length}件 未対応)
          </h2>
          {reports.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">通報はありません</p>
          ) : (
            <ul className="space-y-1.5">
              {reports.map((r) => {
                const target = reportTargets[r.target_id]
                return (
                  <li
                    key={r.id}
                    className={`rounded-lg border bg-white p-2.5 ${
                      r.resolved ? 'border-slate-100 opacity-50' : 'border-amber-200'
                    }`}
                  >
                    <p className="text-[11px] text-slate-500">
                      {r.target_type === 'thread' ? '📄 スレッド' : '💬 コメント'}への通報 ・{' '}
                      {r.reporter?.nickname} ・ {timeAgo(r.created_at)}
                    </p>
                    <p className="mt-1 truncate text-xs font-medium text-slate-700">
                      対象: {target?.text ?? '(削除済み)'}
                    </p>
                    {r.reason && (
                      <p className="mt-0.5 text-xs text-slate-500">理由: {r.reason}</p>
                    )}
                    <div className="mt-1.5 flex gap-3 text-[11px] font-bold">
                      {target?.threadId && (
                        <Link to={`/thread/${target.threadId}`} className="text-sky-600">
                          スレッドを見る ›
                        </Link>
                      )}
                      <button onClick={() => toggleResolved(r)} className="text-amber-600">
                        {r.resolved ? '未対応に戻す' : '対応済みにする'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <button
        onClick={signOut}
        className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-500"
      >
        ログアウト
      </button>
    </div>
  )
}
