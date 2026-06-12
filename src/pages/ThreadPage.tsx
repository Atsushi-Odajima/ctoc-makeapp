import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { timeAgo } from '../lib/format'
import Avatar from '../components/Avatar'
import ReactionBar from '../components/ReactionBar'
import type { Comment, Like, TargetType, Thread } from '../lib/types'

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const uid = session!.user.id

  const [thread, setThread] = useState<Thread | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [likes, setLikes] = useState<Like[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // コメント投稿フォーム
  const [commentBody, setCommentBody] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [posting, setPosting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // スレッド編集
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const [{ data: t }, { data: cs }] = await Promise.all([
      supabase
        .from('thread_list')
        .select('*, category:categories(*), author:profiles(*)')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('comments')
        .select('*, author:profiles(*)')
        .eq('thread_id', id)
        .order('created_at'),
    ])
    if (!t) {
      setNotFound(true)
      setLoading(false)
      return
    }
    const commentList = cs ?? []
    const targetIds = [id, ...commentList.map((c) => c.id)]
    const { data: ls } = await supabase
      .from('likes')
      .select('*, user:profiles(id, nickname, avatar)')
      .in('target_id', targetIds)
    setThread(t)
    setComments(commentList)
    setLikes(ls ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: 新着コメント・リアクションをリロードなしで反映
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`thread-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `thread_id=eq.${id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => load()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, load])

  const likesFor = (type: TargetType, targetId: string) =>
    likes.filter((l) => l.target_type === type && l.target_id === targetId)

  const postComment = async (e: FormEvent) => {
    e.preventDefault()
    const body = commentBody.trim()
    if (!body || posting) return
    setPosting(true)
    // 返信は1階層のみ: 返信への返信は同じ親にぶら下げる
    const parentId = replyTo ? (replyTo.parent_id ?? replyTo.id) : null
    const { error } = await supabase.from('comments').insert({
      thread_id: id,
      author_id: uid,
      parent_id: parentId,
      body,
    })
    if (!error) {
      setCommentBody('')
      setReplyTo(null)
      await load()
    }
    setPosting(false)
  }

  const deleteThread = async () => {
    if (!confirm('このスレッドを削除しますか？(コメントも全て消えます)')) return
    await supabase.from('threads').delete().eq('id', thread!.id)
    navigate('/')
  }

  const saveThreadEdit = async () => {
    await supabase
      .from('threads')
      .update({ title: editTitle.trim(), body: editBody.trim() })
      .eq('id', thread!.id)
    setEditing(false)
    await load()
  }

  const report = async (type: TargetType, targetId: string) => {
    const reason = prompt('通報理由を入力してください(任意)')
    if (reason === null) return
    const { error } = await supabase.from('reports').insert({
      reporter_id: uid,
      target_type: type,
      target_id: targetId,
      reason,
    })
    alert(error ? `通報に失敗しました: ${error.message}` : '通報しました。管理者が確認します。')
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-400">読み込み中...</p>
  }
  if (notFound || !thread) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        スレッドが見つかりません(削除された可能性があります)
        <div className="mt-4">
          <Link to="/" className="font-bold text-sky-600">
            ← ホームへ戻る
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = thread.author_id === uid
  const canDelete = isOwner || profile?.is_admin
  const topLevel = comments.filter((c) => !c.parent_id)
  const repliesOf = (cid: string) => comments.filter((c) => c.parent_id === cid)

  return (
    <div className="pb-36">
      {/* スレッド本体 */}
      <article className="border-b border-sky-100 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Link
            to={`/?cat=${thread.category_id}`}
            className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700"
          >
            {thread.category?.name}
          </Link>
          <span className="text-[11px] text-slate-400">{timeAgo(thread.created_at)}</span>
        </div>

        {editing ? (
          <div className="space-y-2">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-sky-300 px-3 py-2 text-base font-bold outline-none"
            />
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              maxLength={4000}
              rows={5}
              className="w-full rounded-lg border border-sky-300 px-3 py-2 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveThreadEdit}
                className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-bold text-white"
              >
                保存
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg bg-slate-200 px-4 py-1.5 text-sm text-slate-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-lg font-bold leading-snug">{thread.title}</h1>
            <div className="mb-3 flex items-center gap-2">
              <Avatar avatar={thread.author?.avatar} size="sm" />
              <span className="text-xs font-medium text-slate-600">
                {thread.author?.nickname}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {thread.body}
            </p>
            {thread.image_url && (
              <img
                src={thread.image_url}
                alt="添付画像"
                className="mt-3 max-h-80 rounded-xl"
              />
            )}
          </>
        )}

        <div className="mt-4">
          <ReactionBar
            targetType="thread"
            targetId={thread.id}
            likes={likesFor('thread', thread.id)}
            onChanged={load}
          />
        </div>

        <div className="mt-3 flex gap-3 text-xs text-slate-400">
          {isOwner && !editing && (
            <button
              onClick={() => {
                setEditTitle(thread.title)
                setEditBody(thread.body)
                setEditing(true)
              }}
              className="font-medium text-sky-600"
            >
              ✏️ 編集
            </button>
          )}
          {canDelete && (
            <button onClick={deleteThread} className="font-medium text-red-400">
              🗑 削除{!isOwner && '(管理者)'}
            </button>
          )}
          {!isOwner && (
            <button onClick={() => report('thread', thread.id)}>🚨 通報</button>
          )}
        </div>
      </article>

      {/* コメント一覧 */}
      <section className="p-3">
        <h2 className="mb-2 px-1 text-xs font-bold text-slate-500">
          コメント {comments.length}件
        </h2>
        {topLevel.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-400">
            まだコメントがありません。一番乗りでどうぞ！
          </p>
        )}
        <ul className="space-y-2">
          {topLevel.map((c) => (
            <li key={c.id}>
              <CommentCard
                comment={c}
                likes={likesFor('comment', c.id)}
                onChanged={load}
                onReply={() => {
                  setReplyTo(c)
                  inputRef.current?.focus()
                }}
                onReport={() => report('comment', c.id)}
              />
              {repliesOf(c.id).length > 0 && (
                <ul className="ml-6 mt-1.5 space-y-1.5 border-l-2 border-sky-100 pl-2.5">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentCard
                        comment={r}
                        isReply
                        likes={likesFor('comment', r.id)}
                        onChanged={load}
                        onReply={() => {
                          setReplyTo(r)
                          inputRef.current?.focus()
                        }}
                        onReport={() => report('comment', r.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* コメント入力(下部固定) */}
      <form
        onSubmit={postComment}
        className="pb-safe fixed inset-x-0 bottom-[60px] z-10 mx-auto max-w-lg border-t border-sky-200 bg-white p-2.5"
      >
        {replyTo && (
          <div className="mb-1.5 flex items-center justify-between rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs text-sky-700">
            <span className="truncate">
              ↩️ {replyTo.author?.nickname} さんに返信: {replyTo.body.slice(0, 30)}
            </span>
            <button type="button" onClick={() => setReplyTo(null)} className="ml-2 shrink-0">
              ✕
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            maxLength={2000}
            rows={1}
            placeholder={replyTo ? '返信を書く...' : 'コメントを書く...'}
            className="max-h-24 min-w-0 flex-1 resize-none rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-base outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={posting || !commentBody.trim()}
            className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            送信
          </button>
        </div>
      </form>
    </div>
  )
}

function CommentCard({
  comment,
  likes,
  isReply = false,
  onChanged,
  onReply,
  onReport,
}: {
  comment: Comment
  likes: Like[]
  isReply?: boolean
  onChanged: () => void
  onReply: () => void
  onReport: () => void
}) {
  const { session, profile } = useAuth()
  const uid = session!.user.id
  const isOwner = comment.author_id === uid
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(comment.body)

  const save = async () => {
    const text = body.trim()
    if (!text) return
    await supabase.from('comments').update({ body: text }).eq('id', comment.id)
    setEditing(false)
    onChanged()
  }

  const remove = async () => {
    if (!confirm('このコメントを削除しますか？')) return
    await supabase.from('comments').delete().eq('id', comment.id)
    onChanged()
  }

  return (
    <div className="rounded-xl border border-sky-100 bg-white p-3 shadow-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <Avatar avatar={comment.author?.avatar} size="sm" />
        <span className="flex-1 truncate text-xs font-bold text-slate-600">
          {comment.author?.nickname}
        </span>
        <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded-lg border border-sky-300 px-2.5 py-1.5 text-sm outline-none"
          />
          <div className="flex gap-2 text-xs">
            <button onClick={save} className="rounded-lg bg-sky-500 px-3 py-1 font-bold text-white">
              保存
            </button>
            <button
              onClick={() => {
                setBody(comment.body)
                setEditing(false)
              }}
              className="rounded-lg bg-slate-200 px-3 py-1 text-slate-600"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {comment.body}
        </p>
      )}

      <div className="mt-2">
        <ReactionBar
          targetType="comment"
          targetId={comment.id}
          likes={likes}
          onChanged={onChanged}
          compact
        />
      </div>

      <div className="mt-2 flex gap-3 text-[11px] text-slate-400">
        {!isReply && (
          <button onClick={onReply} className="font-medium text-sky-600">
            ↩️ 返信
          </button>
        )}
        {isReply && (
          <button onClick={onReply} className="font-medium text-sky-600">
            ↩️ この人に返信
          </button>
        )}
        {isOwner && !editing && (
          <button onClick={() => setEditing(true)} className="font-medium text-sky-600">
            ✏️ 編集
          </button>
        )}
        {(isOwner || profile?.is_admin) && (
          <button onClick={remove} className="font-medium text-red-400">
            🗑 削除{!isOwner && '(管理者)'}
          </button>
        )}
        {!isOwner && <button onClick={onReport}>🚨 通報</button>}
      </div>
    </div>
  )
}
