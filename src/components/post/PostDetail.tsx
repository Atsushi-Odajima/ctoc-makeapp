"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { ErrorState, Notice, Skeletons } from "@/components/ui/States"
import { useViewer } from "@/components/layout/ViewerContext"
import { api, ApiClientError, loginRedirect } from "@/lib/client/api"
import { formatDateTime, relativeTime } from "@/lib/client/format"
import { graphemeCount } from "@/lib/client/text"
import type { PostDTO } from "@/lib/dto/post"
import type { CommentDTO } from "@/lib/services/comments"
import { PostCard } from "./PostCard"
import { ReportDialog } from "./ReportDialog"

export function PostDetail({ id, startEditing, justPosted }: { id: string; startEditing: boolean; justPosted: boolean }) {
  const viewer = useViewer()
  const router = useRouter()
  const [post, setPost] = useState<PostDTO | null>(null)
  const [error, setError] = useState<ApiClientError | null>(null)
  const [comments, setComments] = useState<CommentDTO[]>([])
  const [editing, setEditing] = useState(startEditing)

  const load = useCallback(() => Promise.all([api<PostDTO>(`/api/posts/${id}`), api<CommentDTO[]>(`/api/posts/${id}/comments`)])
    .then(([p, c]) => { setPost(p.data); setComments(c.data); setError(null) })
    .catch(e => setError(e instanceof ApiClientError ? e : new ApiClientError(0, "UNKNOWN", "読み込めませんでした"))), [id])
  useEffect(() => { void load() }, [load])

  if (error) {
    return (
      <div className="mx-auto max-w-[640px] gutter pt-4">
        <ErrorState message={error.status === 404 ? "この投稿は見つからないか、表示できません。" : error.message} onRetry={error.status === 404 ? undefined : () => void load()} />
        <div className="mt-4 text-center"><Link href={viewer ? "/feed" : "/"} className="btn btn-secondary">ホームへ戻る</Link></div>
      </div>
    )
  }
  if (!post) return <div className="mx-auto max-w-[640px] gutter pt-4"><Skeletons count={1} /></div>

  return (
    <div className="mx-auto max-w-[640px] gutter">
      <div className="flex items-center gap-2 py-2">
        <button type="button" className="icon-btn" onClick={() => (history.length > 1 ? router.back() : router.push("/feed"))} aria-label="戻る"><Icon name="back" /></button>
        <h1 className="t-section">投稿</h1>
      </div>
      {justPosted && <div className="mb-3"><Notice tone="success">投稿しました。</Notice></div>}
      {post.status === "DRAFT" && <div className="mb-3"><DraftBar post={post} onPublished={p => setPost(p)} /></div>}
      {post.status === "PROCESSING" && <div className="mb-3"><Notice tone="info">動画を処理しています。完了すると公開されます（あなたにだけ表示されています）。</Notice></div>}
      {post.status === "FAILED" && <div className="mb-3"><Notice tone="error">メディアの処理に失敗しました。削除して、もう一度投稿してください。</Notice></div>}
      {post.hidden && <div className="mb-3"><Notice tone="warning">この投稿は運営により非表示になっています（あなたにだけ表示されています）。</Notice></div>}
      {editing && post.viewer.isOwner ? (
        <EditPost post={post} onCancel={() => setEditing(false)} onSaved={p => { setPost(p); setEditing(false) }} />
      ) : (
        <PostCard post={post} eager onDeleted={() => router.push("/profile")} />
      )}
      {post.viewer.isOwner && !editing && <button type="button" className="btn btn-secondary mt-3" onClick={() => setEditing(true)}><Icon name="edit" size={18} />編集</button>}
      <p className="mt-2 text-muted t-tiny">投稿日時: <time dateTime={post.publishedAt ?? post.createdAt}>{formatDateTime(post.publishedAt ?? post.createdAt)}</time></p>
      <Comments postId={post.id} comments={comments} setComments={setComments} canComment={!!viewer && post.status === "PUBLISHED"} postOwnerId={post.viewer.isOwner ? viewer?.id ?? null : null} />
    </div>
  )
}

function DraftBar({ post, onPublished }: { post: PostDTO; onPublished: (p: PostDTO) => void }) {
  const [busy, setBusy] = useState(false)
  async function publish() {
    setBusy(true)
    try {
      const res = await api<PostDTO>(`/api/posts/${post.id}/publish`, { method: "POST", body: { revision: post.revision } })
      onPublished(res.data)
      toast.success(res.data.status === "PUBLISHED" ? "投稿しました" : "処理が終わると公開されます")
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "公開できませんでした")
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-[11px] border border-line bg-surface px-4 py-3 t-small">
      <span>下書きです（あなたにだけ表示されています）</span>
      <button type="button" className="btn btn-accent" disabled={busy} onClick={() => void publish()}>{busy ? "公開中…" : "公開する"}</button>
    </div>
  )
}

function EditPost({ post, onCancel, onSaved }: { post: PostDTO; onCancel: () => void; onSaved: (p: PostDTO) => void }) {
  const viewer = useViewer()
  const [caption, setCaption] = useState(post.caption ?? "")
  const [alts, setAlts] = useState<Record<string, string>>(Object.fromEntries(post.media.map(m => [m.id, m.altText ?? ""])))
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS">(post.visibility === "FOLLOWERS" ? "FOLLOWERS" : "PUBLIC")
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const expanding = post.visibility === "FOLLOWERS" && visibility === "PUBLIC"

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api<PostDTO>(`/api/posts/${post.id}`, {
        method: "PATCH",
        body: { revision: post.revision, caption, altTexts: alts, ...(post.community ? {} : { visibility, confirmVisibilityExpansion: confirm }) },
      })
      toast.success("保存しました")
      onSaved(res.data)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "保存できませんでした")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-[12px] bg-surface p-4">
      <label className="block">
        <span className="field-label">本文</span>
        <textarea className="textarea" value={caption} onChange={e => setCaption(e.target.value)} />
        <span aria-hidden="true" className="field-hint block text-right">{graphemeCount(caption)} / 2200</span>
      </label>
      {post.media.filter(m => m.kind === "IMAGE").map((m, i) => (
        <label key={m.id} className="block">
          <span className="field-label">{i + 1}枚目の代替テキスト</span>
          <input className="input" value={alts[m.id] ?? ""} maxLength={220} onChange={e => setAlts(a => ({ ...a, [m.id]: e.target.value }))} />
        </label>
      ))}
      {!post.community && (
        <fieldset>
          <legend className="field-label">公開範囲</legend>
          <div className="tabs">
            <button type="button" aria-pressed={visibility === "PUBLIC"} disabled={viewer?.isPrivate} onClick={() => setVisibility("PUBLIC")}>公開</button>
            <button type="button" aria-pressed={visibility === "FOLLOWERS"} onClick={() => setVisibility("FOLLOWERS")}>フォロワー</button>
          </div>
          {expanding && (
            <label className="mt-2 flex items-start gap-2 t-small">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
              <span>公開範囲を広げます。フォロワー以外やログインしていない人も読めるようになります。</span>
            </label>
          )}
        </fieldset>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>やめる</button>
        <button type="submit" className="btn btn-primary flex-1" disabled={busy || (expanding && !confirm)}>{busy ? "保存中…" : "保存"}</button>
      </div>
    </form>
  )
}

function Comments({ postId, comments, setComments, canComment, postOwnerId }: {
  postId: string; comments: CommentDTO[]; setComments: (c: CommentDTO[]) => void; canComment: boolean; postOwnerId: string | null
}) {
  const viewer = useViewer()
  const [text, setText] = useState("")
  const [replyTo, setReplyTo] = useState<CommentDTO | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<string | null>(null)

  async function refresh() {
    const res = await api<CommentDTO[]>(`/api/posts/${postId}/comments`)
    setComments(res.data)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    setError(null)
    try {
      await api(`/api/posts/${postId}/comments`, { method: "POST", body: { content: text, parentId: replyTo?.id } })
      setText("")
      setReplyTo(null)
      await refresh()
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) return loginRedirect()
      setError(err instanceof ApiClientError ? err.message : "送信できませんでした。入力はそのまま残っています")
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/comments/${id}`, { method: "DELETE" })
      await refresh()
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "削除できませんでした")
    }
  }

  const renderComment = (c: CommentDTO, isReply = false) => (
    <li key={c.id} className={`py-3 ${isReply ? "ml-10 border-l-[3px] border-[#A995BA] pl-3" : "border-t border-line"}`}>
      {c.removed ? (
        <p className="text-muted t-small">このコメントは削除されました</p>
      ) : (
        <div className="flex gap-3">
          {c.author && <Avatar user={c.author} size={32} />}
          <div className="min-w-0 flex-1">
            <p className="t-small"><Link href={`/u/${c.author?.username}`} className="font-bold">{c.author?.name}</Link> <span className="text-muted">{relativeTime(c.createdAt)}</span></p>
            <p className="whitespace-pre-wrap t-body">{c.content}</p>
            <div className="flex gap-1">
              {canComment && !isReply && <button type="button" className="link-btn" onClick={() => setReplyTo(c)}>返信</button>}
              {viewer && (c.isOwner || postOwnerId === viewer.id) && <button type="button" className="link-btn" onClick={() => void remove(c.id)}>削除</button>}
              {viewer && !c.isOwner && <button type="button" className="link-btn" onClick={() => setReport(c.id)}>通報</button>}
            </div>
          </div>
        </div>
      )}
      {c.replies.length > 0 && <ul>{c.replies.map(r => renderComment(r, true))}</ul>}
    </li>
  )

  return (
    <section id="comments" className="mt-6" aria-label="コメント">
      <h2 className="t-section">コメント</h2>
      {comments.length === 0 ? <p className="mt-2 text-muted t-small">まだコメントはありません。</p> : <ul className="mt-2">{comments.map(c => renderComment(c))}</ul>}
      {canComment ? (
        <form onSubmit={send} className="mt-3 space-y-2">
          {replyTo && <p className="t-small">{replyTo.author?.name}さんへの返信 <button type="button" className="link-btn" onClick={() => setReplyTo(null)}>取り消す</button></p>}
          <label className="sr-only" htmlFor="comment-input">コメント</label>
          <textarea id="comment-input" className="textarea" style={{ minHeight: 80 }} value={text} onChange={e => setText(e.target.value)} placeholder="コメントを書く" aria-invalid={graphemeCount(text) > 1000} />
          <div className="flex items-center justify-between">
            <span className={`t-tiny ${graphemeCount(text) > 1000 ? "text-error" : "text-muted"}`}>{graphemeCount(text)} / 1000</span>
            <button type="submit" className="btn btn-primary" disabled={sending || !text.trim() || graphemeCount(text) > 1000}>{sending ? "送信中…" : "送信"}</button>
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
        </form>
      ) : !viewer ? (
        <p className="mt-3 t-small"><Link href="/login" className="underline">ログイン</Link>するとコメントできます。</p>
      ) : null}
      {report && <ReportDialog open onClose={() => setReport(null)} targetType="COMMENT" targetId={report} />}
    </section>
  )
}
