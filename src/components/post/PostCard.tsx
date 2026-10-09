"use client"

import Link from "next/link"
import { useLayoutEffect, useRef, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { MediaGallery } from "@/components/media/MediaGallery"
import { relativeTime, formatCount, formatDateTime } from "@/lib/client/format"
import type { PostDTO } from "@/lib/dto/post"
import { PostMenu } from "./PostMenu"
import { useReactions } from "./useReactions"

const VISIBILITY_LABEL = { PUBLIC: "公開", FOLLOWERS: "フォロワー", COMMUNITY: "集まり" } as const

// Reading order: author → media → reactions → text. No box around the post: the photo runs to
// the screen edges on phones, text keeps a 16px gutter, and posts are separated by space and one
// hairline. `detail` shows the full text and the absolute date instead of the comment teaser.
export function PostCard({ post, onDeleted, eager = false, detail = false, onEdit }: { post: PostDTO; onDeleted?: (id: string) => void; eager?: boolean; detail?: boolean; onEdit?: () => void }) {
  const { state, toggle } = useReactions(post)
  return (
    <article className={detail ? "" : "border-b border-line pb-5"} aria-labelledby={`post-${post.id}-author`}>
      <PostHeader post={post} onDeleted={onDeleted} onEdit={onEdit} />
      {post.media.length > 0 && <MediaGallery media={post.media} eager={eager} />}
      <PostActions post={post} state={state} toggle={toggle} />
      <div className="px-[var(--gutter)] sm:px-0">
        {post.caption && <Caption post={post} clamp={!detail} />}
        {post.newsArticle && (
          <Link href={`/news/${post.newsArticle.id}`} className="mt-2 block rounded-[8px] border border-line bg-surface px-3 py-2.5 transition-colors duration-150 hover:border-control">
            <span className="block t-meta">{post.newsArticle.category} · {post.newsArticle.source}</span>
            <span className="block font-bold t-small">{post.newsArticle.title}</span>
          </Link>
        )}
        {!detail && post.counts.comments > 0 && (
          <Link href={`/post/${post.id}#comments`} className="-mb-2 -mt-1 flex min-h-[44px] items-center t-small text-muted hover:text-ink">
            コメント{formatCount(post.counts.comments)}件をすべて見る
          </Link>
        )}
        {!detail && post.latestComment && (
          <p className="line-clamp-2 t-small">
            <Link href={`/u/${post.latestComment.authorUsername}`} className="mr-1.5 font-bold">{post.latestComment.authorName}</Link>
            {post.latestComment.content}
          </p>
        )}
        {detail && (
          <p className="mt-2 t-meta"><time dateTime={post.publishedAt ?? post.createdAt}>{formatDateTime(post.publishedAt ?? post.createdAt, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>{post.edited && " · 編集済み"}</p>
        )}
      </div>
    </article>
  )
}

export function PostHeader({ post, onDeleted, onEdit }: { post: PostDTO; onDeleted?: (id: string) => void; onEdit?: () => void }) {
  const when = post.publishedAt ?? post.createdAt
  const profileHref = post.author.deleted ? undefined : `/u/${post.author.username}`
  return (
    <header className="flex items-center gap-3 py-2.5 pl-[var(--gutter)] pr-1 sm:pl-0 sm:pr-0">
      {profileHref ? <Link href={profileHref} tabIndex={-1} aria-hidden className="-m-1 shrink-0 rounded-full p-1"><Avatar user={post.author} /></Link> : <Avatar user={post.author} />}
      <div className="min-w-0 flex-1">
        {profileHref
          ? <Link id={`post-${post.id}-author`} href={profileHref} className="-my-1 block truncate py-1 t-author hover:underline hover:underline-offset-2">{post.author.name || post.author.username}</Link>
          : <span id={`post-${post.id}-author`} className="block truncate t-author">{post.author.name || "退会したユーザー"}</span>}
        <p className="truncate t-meta">
          <Link href={`/post/${post.id}`} className="hover:text-ink"><time dateTime={when}>{relativeTime(when)}</time></Link>
          {post.community && <> · <Link href={`/communities/${post.community.slug}`} className="hover:text-ink">{post.community.name}</Link></>}
          {!post.community && post.kind === "NOTE" && <> · 日記</>}
          {post.visibility !== "PUBLIC" && !post.community && <> · <span className="inline-flex items-center gap-0.5 align-[-2px]"><Icon name="lock" size={13} />{VISIBILITY_LABEL[post.visibility]}</span></>}
          {post.edited && <> · 編集済み</>}
        </p>
      </div>
      <PostMenu post={post} onDeleted={onDeleted ? () => onDeleted(post.id) : undefined} onEdit={onEdit} />
    </header>
  )
}

type Reactions = ReturnType<typeof useReactions>

export function PostActions({ post, state, toggle }: { post: PostDTO; state: Reactions["state"]; toggle: Reactions["toggle"] }) {
  const [popped, setPopped] = useState<string | null>(null)
  const tap = (kind: "like" | "empathy" | "bookmark", turningOn: boolean) => {
    if (turningOn) setPopped(kind)
    void toggle(kind)
  }
  const count = (n: number) => n > 0 ? <span aria-hidden className="text-[15px] font-medium tabular-nums">{formatCount(n)}</span> : null
  return (
    <div className="flex items-center px-1 pt-1 sm:-mx-2.5">
      <button type="button" className={`flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-[8px] px-2.5 transition-colors duration-150 hover:bg-ink/5 ${state.liked ? "text-accent" : ""}`} aria-pressed={state.liked} aria-label={`いいね ${state.likes}件`} onClick={() => tap("like", !state.liked)}>
        <span className={popped === "like" && state.liked ? "pop" : ""} onAnimationEnd={() => setPopped(null)}><Icon name="heart" filled={state.liked} size={26} /></span>
        {count(state.likes)}
      </button>
      <button type="button" className={`flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-[8px] px-2.5 transition-colors duration-150 hover:bg-ink/5 ${state.empathized ? "text-accent" : ""}`} aria-pressed={state.empathized} aria-label={`気持ちわかる ${state.empathies}件`} title="気持ちわかる" onClick={() => tap("empathy", !state.empathized)}>
        <span className={popped === "empathy" && state.empathized ? "pop" : ""} onAnimationEnd={() => setPopped(null)}><Icon name="empathy" size={26} strokeWidth={state.empathized ? 2.25 : 1.75} /></span>
        <span aria-hidden className={`text-[14px] ${state.empathized ? "font-bold" : "font-medium"}`}>わかる</span>
        {count(state.empathies)}
      </button>
      <Link href={`/post/${post.id}#comments`} className="flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-[8px] px-2.5 transition-colors duration-150 hover:bg-ink/5" aria-label={`コメント ${post.counts.comments}件`}>
        <Icon name="message" size={26} />{count(post.counts.comments)}
      </Link>
      <button type="button" className="ml-auto grid min-h-[44px] min-w-[44px] place-items-center rounded-[8px] transition-colors duration-150 hover:bg-ink/5" aria-pressed={state.bookmarked} aria-label={state.bookmarked ? "保存済み" : "保存"} onClick={() => tap("bookmark", !state.bookmarked)}>
        <span className={popped === "bookmark" && state.bookmarked ? "pop" : ""} onAnimationEnd={() => setPopped(null)}><Icon name="bookmark" filled={state.bookmarked} size={26} /></span>
      </button>
    </div>
  )
}

/** Author name + text inline. In the feed long text is clamped to 3 lines with 「続きを読む」. */
function Caption({ post, clamp }: { post: PostDTO; clamp: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [overflows, setOverflows] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !clamp) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 2)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [clamp, post.caption])
  const clamped = clamp && !open
  return (
    <div className="mt-0.5">
      <p ref={ref} id={`post-${post.id}-text`} className={`whitespace-pre-wrap t-post ${clamped ? "line-clamp-3" : ""}`}>
        {post.media.length > 0 && <span className="mr-1.5 font-bold">{post.author.name || post.author.username}</span>}
        {post.caption}
      </p>
      {clamped && overflows && (
        <button type="button" className="-my-1.5 min-h-[44px] t-small font-medium text-muted hover:text-ink" onClick={() => setOpen(true)} aria-controls={`post-${post.id}-text`} aria-expanded={false}>続きを読む</button>
      )}
    </div>
  )
}
