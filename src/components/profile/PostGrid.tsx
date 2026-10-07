"use client"

import Link from "next/link"
import { MediaImage } from "@/components/media/MediaImage"
import { Icon } from "@/components/ui/Icon"
import type { PostDTO } from "@/lib/dto/post"

export function PostGrid({ posts }: { posts: PostDTO[] }) {
  return (
    <ul className="mt-[14px] grid grid-cols-2 gap-[9px] tablet:grid-cols-3">
      {posts.map(post => {
        const cover = post.media[0]
        const date = new Date(post.publishedAt ?? post.createdAt)
        return (
          <li key={post.id}>
            <Link href={`/post/${post.id}`} className="relative block aspect-square overflow-hidden rounded-[9px]" aria-label={post.caption ? `投稿: ${post.caption.slice(0, 30)}` : "投稿を見る"}>
              {cover && cover.kind === "IMAGE" && cover.deliveryUrl ? (
                <MediaImage mediaId={cover.id} src={cover.deliveryUrl} alt={cover.altText ?? ""} className="h-full w-full object-cover" />
              ) : cover && cover.kind === "VIDEO" ? (
                <span className="grid h-full w-full place-items-center bg-ink text-white"><Icon name="video" size={32} /><span className="sr-only">動画</span></span>
              ) : (
                <span className="flex h-full flex-col justify-between bg-[#F8DDD4] p-[14px]">
                  <span className="t-meta">NOTE / {String(date.getMonth() + 1).padStart(2, "0")}.{String(date.getDate()).padStart(2, "0")}</span>
                  <span className="line-clamp-3 text-[14px] leading-6">{post.caption}</span>
                  <span className="t-tiny">日記を読む →</span>
                </span>
              )}
              {post.media.length > 1 && <span className="absolute right-1.5 top-1.5 rounded bg-ink/70 px-1.5 text-[10px] text-white">{post.media.length}枚</span>}
              {post.status !== "PUBLISHED" && <span className="absolute left-1.5 top-1.5 rounded bg-surface px-1.5 text-[10px]">{post.status === "DRAFT" ? "下書き" : post.status === "PROCESSING" ? "処理中" : "失敗"}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
