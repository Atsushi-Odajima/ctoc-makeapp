"use client"

import Link from "next/link"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { MediaGallery } from "@/components/media/MediaGallery"
import { relativeTime, formatCount } from "@/lib/client/format"
import type { PostDTO } from "@/lib/dto/post"
import { PostMenu } from "./PostMenu"
import { useReactions } from "./useReactions"

const VISIBILITY_LABEL = { PUBLIC: "公開", FOLLOWERS: "フォロワー", COMMUNITY: "集まり" } as const

export function PostCard({ post, onDeleted, eager = false }: { post: PostDTO; onDeleted?: (id: string) => void; eager?: boolean }) {
  const { state, toggle } = useReactions(post)
  const when = post.publishedAt ?? post.createdAt
  const context = post.community ? post.community.name : post.kind === "NOTE" ? "日記" : null
  return (
    <article className="border-b border-line pb-5" aria-labelledby={`post-${post.id}-author`}>
      <div className="flex items-center gap-[10px] pb-3 pt-[9px]">
        <Link href={post.author.deleted ? "#" : `/u/${post.author.username}`} className="rounded-[12px]" tabIndex={-1} aria-hidden>
          <Avatar user={post.author} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link id={`post-${post.id}-author`} href={post.author.deleted ? "#" : `/u/${post.author.username}`} className="block truncate text-[14px] font-bold leading-5">{post.author.name || post.author.username}</Link>
          <p className="truncate text-muted text-[10px] leading-4">
            <Link href={`/post/${post.id}`}><time dateTime={when}>{relativeTime(when)}</time></Link>
            {context && <> · {post.community ? <Link href={`/communities/${post.community.slug}`} className="underline-offset-2 hover:underline">{context}</Link> : context}</>}
            {post.visibility !== "PUBLIC" && <> · <span className="inline-flex items-center gap-0.5"><Icon name="lock" size={10} />{VISIBILITY_LABEL[post.visibility]}</span></>}
            {post.edited && <> · 編集済み</>}
          </p>
        </div>
        <PostMenu post={post} onDeleted={onDeleted ? () => onDeleted(post.id) : undefined} />
      </div>

      {post.media.length > 0 && <MediaGallery media={post.media} eager={eager} />}

      {post.caption && (
        <p className="mt-3 whitespace-pre-wrap t-post">{post.caption}</p>
      )}
      {post.newsArticle && (
        <Link href={`/news/${post.newsArticle.id}`} className="mt-3 block rounded-[11px] border border-line bg-surface p-3">
          <span className="block text-muted t-tiny">{post.newsArticle.category} · {post.newsArticle.source}</span>
          <span className="block font-bold t-body">{post.newsArticle.title}</span>
        </Link>
      )}

      <div className="mt-1.5 flex items-center gap-[14px] min-[360px]:gap-[14px]">
        <button type="button" className={`interactive flex min-h-[44px] items-center gap-[5px] rounded-[8px] px-1.5 text-[11px] ${state.liked ? "bg-lilac" : ""}`} aria-pressed={state.liked} aria-label={`いいね ${state.likes}件`} onClick={() => void toggle("like")}>
          <Icon name="heart" filled={state.liked} className={state.liked ? "text-accent" : ""} /><span aria-hidden>{formatCount(state.likes)}</span>
        </button>
        <button type="button" className={`interactive flex min-h-[44px] items-center gap-[5px] rounded-[8px] px-1.5 text-[11px] ${state.empathized ? "bg-lilac font-bold" : ""}`} aria-pressed={state.empathized} aria-label={`気持ちわかる ${state.empathies}件`} onClick={() => void toggle("empathy")}>
          <Icon name="empathy" /><span aria-hidden>気持ちわかる {formatCount(state.empathies)}</span>
        </button>
        <Link href={`/post/${post.id}#comments`} className="interactive flex min-h-[44px] items-center gap-[5px] rounded-[8px] px-1.5 text-[11px]" aria-label={`コメント ${post.counts.comments}件`}>
          <Icon name="message" /><span aria-hidden>{formatCount(post.counts.comments)}</span>
        </Link>
        <button type="button" className={`interactive ml-auto grid min-h-[44px] min-w-[44px] place-items-center rounded-[8px] ${state.bookmarked ? "bg-lilac" : ""}`} aria-pressed={state.bookmarked} aria-label="保存" onClick={() => void toggle("bookmark")}>
          <Icon name="bookmark" filled={state.bookmarked} />
        </button>
      </div>

      {post.latestComment && (
        <Link href={`/post/${post.id}#comments`} className="mt-px block border-l-[3px] border-[#A995BA] bg-reply px-[10px] py-[9px] text-[11px] leading-[17px]">
          <b className="mr-[5px]">{post.latestComment.authorName}</b>{post.latestComment.content}
        </Link>
      )}
    </article>
  )
}
