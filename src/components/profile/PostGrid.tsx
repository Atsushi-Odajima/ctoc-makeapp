"use client"

import Link from "next/link"
import { MediaImage } from "@/components/media/MediaImage"
import { Icon } from "@/components/ui/Icon"
import type { PostDTO } from "@/lib/dto/post"

// One trimming rule everywhere: square, centre crop. The detail page always shows the original.
export function PostGrid({ posts }: { posts: PostDTO[] }) {
  return (
    <ul className="grid grid-cols-3 gap-0.5 desktop:gap-1">
      {posts.map(post => <li key={post.id}><GridTile post={post} /></li>)}
    </ul>
  )
}

export function GridTile({ post }: { post: PostDTO }) {
  const cover = post.media[0]
  const label = post.caption ? `投稿: ${post.caption.slice(0, 40)}` : `${post.author.name}さんの投稿`
  return (
    <Link href={`/post/${post.id}`} className="group relative block aspect-square overflow-hidden bg-subtle" aria-label={label}>
      {cover && cover.kind === "IMAGE" && cover.deliveryUrl ? (
        <MediaImage mediaId={cover.id} src={cover.deliveryUrl} alt="" className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-90" width={cover.width} height={cover.height} />
      ) : cover && cover.kind === "VIDEO" ? (
        <span className="grid h-full w-full place-items-center bg-ink text-white"><Icon name="play" size={28} filled /></span>
      ) : (
        <span className="flex h-full flex-col border border-line bg-surface p-2.5 desktop:p-4">
          <span className="line-clamp-4 text-[13px] leading-[1.6] desktop:line-clamp-6 desktop:text-[14px]">{post.caption}</span>
          <span className="mt-auto inline-flex items-center gap-1 text-[13px] text-muted"><Icon name="note" size={14} />日記</span>
        </span>
      )}
      {(post.media.length > 1 || cover?.kind === "VIDEO") && (
        <span className="absolute right-1.5 top-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          <Icon name={cover?.kind === "VIDEO" ? "video" : "stack"} size={20} />
          <span className="sr-only">{cover?.kind === "VIDEO" ? "動画" : `${post.media.length}枚`}</span>
        </span>
      )}
      {post.status !== "PUBLISHED" && <span className="absolute left-1.5 top-1.5 rounded-[4px] bg-surface px-1.5 text-[13px] font-medium">{post.status === "DRAFT" ? "下書き" : post.status === "PROCESSING" ? "処理中" : "失敗"}</span>}
    </Link>
  )
}
