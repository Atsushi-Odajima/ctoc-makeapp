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
import { PostActions, PostCard, PostHeader } from "./PostCard"
import { useReactions } from "./useReactions"
import { MediaGallery } from "@/components/media/MediaGallery"
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
      <div className="feed-column gutter pt-4">
        <ErrorState message={error.status === 404 ? "この投稿は見つからないか、表示できません。" : error.message} onRetry={error.status === 404 ? undefined : () => void load()} />
        <div className="text-center"><Link href={viewer ? "/feed" : "/"} className="btn btn-secondary">ホームへ戻る</Link></div>
      </div>
    )
  }
  if (!post) return <div className="feed-column pt-2"><Skeletons count={1} /></div>

  const notices = (
    <>
      {justPosted && <Notice tone="success">投稿しました。</Notice>}
      {post.status === "DRAFT" && <DraftBar post={post} onPublished={p => setPost(p)} />}
      {post.status === "PROCESSING" && <Notice tone="info">動画を処理しています。完了すると公開されます（あなたにだけ表示されています）。</Notice>}
      {post.status === "FAILED" && <Notice tone="error">メディアの処理に失敗しました。削除して、もう一度投稿してください。</Notice>}
      {post.hidden && <Notice tone="warning">この投稿は運営により非表示になっています（あなたにだけ表示されています）。</Notice>}
    </>
  )
  const hasMedia = post.media.length > 0
  const comments_ = <Comments postId={post.id} comments={comments} setComments={setComments} canComment={!!viewer && post.status === "PUBLISHED"} postOwnerId={post.viewer.isOwner ? viewer?.id ?? null : null} />

  return (
    <div className={hasMedia ? "mx-auto w-full max-w-[var(--feed-width)] desktop:max-w-[1000px] desktop:px-6 desktop:pt-6" : "feed-column desktop:pt-6"}>
      <div className="flex items-center gap-1 px-1 py-1 desktop:hidden">
        <button type="button" className="icon-btn" onClick={() => (history.length > 1 ? router.back() : router.push("/feed"))} aria-label="戻る"><Icon name="back" /></button>
        <p aria-hidden className="t-ui font-bold">投稿</p>
      </div>
      <h1 className="sr-only">投稿</h1>
      <div className="space-y-2 px-[var(--gutter)] empty:hidden sm:px-0 [&:not(:empty)]:mb-3">{notices}</div>

      {editing && post.viewer.isOwner ? (
        <div className="px-[var(--gutter)] sm:px-0"><EditPost post={post} onCancel={() => setEditing(false)} onSaved={p => { setPost(p); setEditing(false) }} /></div>
      ) : hasMedia ? (
        <DetailWithMedia post={post} onEdit={post.viewer.isOwner ? () => setEditing(true) : undefined} onDeleted={() => router.push("/profile")}>{comments_}</DetailWithMedia>
      ) : (
        <>
          <PostCard post={post} eager detail onEdit={post.viewer.isOwner ? () => setEditing(true) : undefined} onDeleted={() => router.push("/profile")} />
          {comments_}
        </>
      )}
    </div>
  )
}

/** Photo posts: one column on phones; on desktop the photo sits left and the conversation right. */
function DetailWithMedia({ post, onEdit, onDeleted, children }: { post: PostDTO; onEdit?: () => void; onDeleted: () => void; children: React.ReactNode }) {
  const { state, toggle } = useReactions(post)
  return (
    <article aria-labelledby={`post-${post.id}-author`} className="desktop:grid desktop:min-h-[560px] desktop:grid-cols-[minmax(0,1fr)_380px] desktop:grid-rows-[auto_minmax(0,1fr)] desktop:overflow-hidden desktop:rounded-[4px] desktop:border desktop:border-line desktop:bg-surface">
      <div className="desktop:col-start-2 desktop:row-start-1 desktop:border-b desktop:border-l desktop:border-line desktop:px-4">
        <PostHeader post={post} onEdit={onEdit} onDeleted={onDeleted} />
      </div>
      <div className="desktop:col-start-1 desktop:row-span-2 desktop:row-start-1 desktop:flex desktop:items-center desktop:bg-subtle [&_.photo-radius]:desktop:rounded-none">
        <div className="w-full"><MediaGallery media={post.media} eager /></div>
      </div>
      <div className="desktop:relative desktop:col-start-2 desktop:row-start-2 desktop:border-l desktop:border-line">
        <div className="desktop:absolute desktop:inset-0 desktop:overflow-y-auto desktop:px-4">
          <div className="desktop:-mx-2.5"><PostActions post={post} state={state} toggle={toggle} /></div>
          <div className="px-[var(--gutter)] sm:px-0">
            {post.caption && (
              <p className="mt-0.5 whitespace-pre-wrap t-post"><span className="mr-1.5 font-bold">{post.author.name || post.author.username}</span>{post.caption}</p>
            )}
            <p className="mt-2 t-meta"><time dateTime={post.publishedAt ?? post.createdAt}>{formatDateTime(post.publishedAt ?? post.createdAt, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>{post.edited && " · 編集済み"}</p>
          </div>
          {children}
        </div>
      </div>
    </article>
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
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-surface py-2 pl-3 pr-2 t-small">
      <span className="inline-flex items-center gap-2"><Icon name="note" size={20} />下書きです（あなたにだけ表示されています）</span>
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} aria-busy={busy} onClick={() => void publish()}>{busy ? "公開中…" : "公開する"}</button>
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
    <form onSubmit={save} className="space-y-4 border-y border-line py-4" aria-label="投稿を編集">
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
          <div className="segmented">
            <button type="button" aria-pressed={visibility === "PUBLIC"} disabled={viewer?.isPrivate} onClick={() => setVisibility("PUBLIC")}><Icon name="globe" size={16} />公開</button>
            <button type="button" aria-pressed={visibility === "FOLLOWERS"} onClick={() => setVisibility("FOLLOWERS")}><Icon name="lock" size={16} />フォロワー</button>
          </div>
          {expanding && (
            <label className="mt-3 flex items-start gap-2 t-small">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
              <span>公開範囲を広げます。フォロワー以外やログインしていない人も読めるようになります。</span>
            </label>
          )}
        </fieldset>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>やめる</button>
        <button type="submit" className="btn btn-primary flex-1" disabled={busy || (expanding && !confirm)} aria-busy={busy}>{busy ? "保存中…" : "保存"}</button>
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
    <li key={c.id} className={isReply ? "mt-3" : "py-3"}>
      {c.removed ? (
        <p className={`text-muted t-small ${isReply ? "pl-11" : ""}`}>このコメントは削除されました</p>
      ) : (
        <div className="flex gap-3">
          {c.author && <Link href={`/u/${c.author.username}`} tabIndex={-1} aria-hidden className="-m-1.5 shrink-0 self-start p-1.5"><Avatar user={c.author} size={isReply ? 28 : 32} /></Link>}
          <div className="min-w-0 flex-1">
            <p className="t-small"><Link href={`/u/${c.author?.username}`} className="mr-1.5 font-bold hover:underline">{c.author?.name}</Link><span className="whitespace-pre-wrap">{c.content}</span></p>
            <div className="-ml-1 flex flex-wrap items-center gap-x-1">
              <span className="px-1 t-meta"><time dateTime={c.createdAt}>{relativeTime(c.createdAt)}</time></span>
              {canComment && !isReply && <button type="button" className="link-btn" onClick={() => { setReplyTo(c); document.getElementById("comment-input")?.focus() }}>返信</button>}
              {viewer && (c.isOwner || postOwnerId === viewer.id) && <button type="button" className="link-btn" onClick={() => void remove(c.id)}>削除</button>}
              {viewer && !c.isOwner && <button type="button" className="link-btn" onClick={() => setReport(c.id)}>通報</button>}
            </div>
          </div>
        </div>
      )}
      {c.replies.length > 0 && <ul className="ml-11">{c.replies.map(r => renderComment(r, true))}</ul>}
    </li>
  )

  const tooLong = graphemeCount(text) > 1000
  return (
    <section id="comments" className="px-[var(--gutter)] pb-4 pt-4 sm:px-0" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="t-ui font-bold">コメント{comments.length > 0 && <span className="ml-1.5 t-label font-semibold text-muted">{comments.length}</span>}</h2>
      {comments.length === 0 ? <p className="py-3 text-muted t-small">まだコメントはありません。最初のひとことをどうぞ。</p> : <ul className="divide-y divide-line">{comments.map(c => renderComment(c))}</ul>}
      {canComment ? (
        <form onSubmit={send} className="mt-2 border-t border-line pt-3">
          {replyTo && (
            <p className="mb-1 flex items-center justify-between rounded-[8px] bg-subtle py-1 pl-3 pr-1 t-small">
              <span className="min-w-0 truncate">{replyTo.author?.name}さんへの返信</span>
              <button type="button" className="link-btn" onClick={() => setReplyTo(null)}>取り消す</button>
            </p>
          )}
          <div className="flex items-end gap-2">
            {viewer && <span className="mb-1.5 hidden min-[360px]:block"><Avatar user={viewer} size={32} /></span>}
            <label className="sr-only" htmlFor="comment-input">コメント</label>
            <textarea
              id="comment-input"
              rows={1}
              className="textarea min-h-[44px] flex-1 resize-none py-2.5 [field-sizing:content] max-h-40"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="コメントを書く"
              aria-invalid={tooLong}
              aria-describedby={error ? "comment-error" : undefined}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !text.trim() || tooLong} aria-busy={sending}>{sending ? "送信中…" : "送信"}</button>
          </div>
          {graphemeCount(text) > 800 && <p className={`mt-1 text-right t-meta ${tooLong ? "!text-error" : ""}`} aria-live="polite">{graphemeCount(text)} / 1000{tooLong && "（長すぎます）"}</p>}
          {error && (
            <p id="comment-error" className="field-error flex flex-wrap items-center gap-x-2" role="alert">
              {error}
              <button type="submit" className="link-btn !text-error underline">再試行</button>
            </p>
          )}
        </form>
      ) : !viewer ? (
        <p className="mt-2 border-t border-line pt-3 t-small"><Link href="/login" className="text-link font-bold">ログイン</Link>するとコメントできます。</p>
      ) : null}
      {report && <ReportDialog open onClose={() => setReport(null)} targetType="COMMENT" targetId={report} />}
    </section>
  )
}
