"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Dialog } from "@/components/ui/Dialog"
import { Icon } from "@/components/ui/Icon"
import { api, ApiClientError } from "@/lib/client/api"
import type { PostDTO } from "@/lib/dto/post"
import { ReportDialog } from "./ReportDialog"

export async function sharePost(post: Pick<PostDTO, "id" | "visibility" | "author">) {
  const url = `${window.location.origin}/post/${post.id}`
  const restricted = post.visibility !== "PUBLIC" || false
  try {
    if (navigator.share) {
      await navigator.share({ title: `${post.author.name}さんの投稿 | DayNet`, url })
      return
    }
    await navigator.clipboard.writeText(url)
    toast.success(restricted ? "リンクをコピーしました（閲覧できる人だけが開けます）" : "リンクをコピーしました")
  } catch (error) {
    if ((error as Error).name !== "AbortError") toast.error("共有できませんでした")
  }
}

export function PostMenu({ post, onDeleted, onEdit }: { post: PostDTO; onDeleted?: () => void; onEdit?: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [report, setReport] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  async function mute() {
    try {
      await api(`/api/mutes/${post.author.id}`, { method: "PUT" })
      toast.success(`${post.author.name}さんをミュートしました。相手には通知されません`)
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "ミュートできませんでした")
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" })
      toast.success("投稿を削除しました")
      setConfirmDelete(false)
      setOpen(false)
      if (onDeleted) onDeleted()
      else router.push("/profile")
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "削除できませんでした")
    } finally {
      setBusy(false)
    }
  }

  const item = "flex min-h-[48px] w-full items-center gap-3 rounded-[11px] px-3 text-left hover:bg-canvas"
  return (
    <>
      <button type="button" className="icon-btn" aria-label="投稿メニュー" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Icon name="more" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="投稿メニュー">
        <div className="space-y-1">
          <button type="button" className={item} onClick={() => { setOpen(false); void sharePost(post) }}><Icon name="share" />共有</button>
          {post.viewer.isOwner ? (
            <>
              {onEdit && <button type="button" className={item} onClick={() => { setOpen(false); onEdit() }}><Icon name="edit" />編集</button>}
              {!onEdit && <button type="button" className={item} onClick={() => router.push(`/post/${post.id}?edit=1`)}><Icon name="edit" />編集</button>}
              <button type="button" className={`${item} text-error`} onClick={() => setConfirmDelete(true)}><Icon name="trash" />削除</button>
            </>
          ) : (
            <>
              <button type="button" className={item} onClick={() => { setOpen(false); setReport(true) }}><Icon name="flag" />通報</button>
              <button type="button" className={item} onClick={() => void mute()}><Icon name="eye" />{post.author.name}さんをミュート</button>
            </>
          )}
        </div>
      </Dialog>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="投稿を削除しますか？" variant="center">
        <p className="mb-4 t-body">削除した投稿は元に戻せません。写真・動画も削除されます。</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary flex-1" onClick={() => setConfirmDelete(false)}>やめる</button>
          <button type="button" className="btn btn-danger flex-1" onClick={() => void remove()} disabled={busy}>{busy ? "削除中…" : "削除する"}</button>
        </div>
      </Dialog>
      <ReportDialog open={report} onClose={() => setReport(false)} targetType="POST" targetId={post.id} />
    </>
  )
}
