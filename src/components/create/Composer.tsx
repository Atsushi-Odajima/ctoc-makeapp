"use client"
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Icon } from "@/components/ui/Icon"
import { Dialog } from "@/components/ui/Dialog"
import { Notice } from "@/components/ui/States"
import { api, ApiClientError, newClientId } from "@/lib/client/api"
import { deleteDraft, loadDraft, saveDraft } from "@/lib/client/personal-cache"
import { graphemeCount } from "@/lib/client/text"
import type { CommunityDTO } from "@/lib/services/communities"
import type { PostDTO } from "@/lib/dto/post"
import { completeUpload, normalizeMime, signUpload, uploadFile, videoDurationMs } from "./upload"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
const VIDEO_TYPES = ["video/mp4", "video/quicktime"]
const MAX_IMAGE = 20 * 1024 * 1024
const MAX_VIDEO = 100 * 1024 * 1024
const CAPTION_MAX = 2200
const ALT_MAX = 200

interface Attachment {
  localId: string
  kind: "IMAGE" | "VIDEO"
  name: string
  previewUrl: string | null // object URL kept in memory only (never persisted)
  mediaId: string | null
  status: "uploading" | "processing" | "ready" | "failed" | "missing"
  progress: number
  error: string | null
  altText: string
  abort?: () => void
  /** the original File is still in memory (this session), so a failed upload can be retried */
  hasFile?: boolean
}

export function Composer({ userId, isPrivate, initialCommunity }: { userId: string; isPrivate: boolean; initialCommunity: string | null }) {
  const router = useRouter()
  const [caption, setCaption] = useState("")
  const [items, setItems] = useState<Attachment[]>([])
  const [destination, setDestination] = useState<string>(initialCommunity ?? "")
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS">(isPrivate ? "FOLLOWERS" : "PUBLIC")
  const [confirmPublic, setConfirmPublic] = useState(false)
  const [communities, setCommunities] = useState<CommunityDTO[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [online, setOnline] = useState(true)
  const [restored, setRestored] = useState(false)
  const idempotencyKey = useRef(newClientId("post"))
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const dragIndex = useRef<number | null>(null)
  const fileStore = useRef(new Map<string, File>())
  const [selected, setSelected] = useState(0)

  const community = communities.find(c => c.slug === destination) ?? null
  const uploading = items.some(i => i.status === "uploading")
  const dirty = caption.trim().length > 0 || items.length > 0

  // Restore this user's local draft (text, order, media ids). Original files are not stored,
  // so attachments that were still uploading must be selected again.
  useEffect(() => {
    void loadDraft(userId).then(draft => {
      if (draft) {
        setCaption(draft.caption)
        setVisibility(isPrivate ? "FOLLOWERS" : draft.visibility)
        if (draft.communitySlug && !initialCommunity) setDestination(draft.communitySlug)
        if (draft.mediaIds.length) {
          setItems(draft.mediaIds.map(id => ({
            localId: id, kind: "IMAGE", name: "", previewUrl: null, mediaId: id, status: "missing", progress: 1, error: null, altText: draft.altTexts[id] ?? "",
          })))
          // Ask the server which of them are still usable (ACL: owner only).
          void Promise.all(draft.mediaIds.map(async id => {
            try {
              const res = await api<{ id: string; kind: "IMAGE" | "VIDEO"; status: string; deliveryUrl: string | null }>(`/api/media/${id}/delivery`)
              return res.data
            } catch { return null }
          })).then(results => {
            setItems(prev => prev.map(item => {
              const r = results.find(x => x?.id === item.mediaId)
              if (!r) return { ...item, status: "failed", error: "この添付は使えなくなりました。削除して選び直してください" }
              return { ...item, kind: r.kind, previewUrl: r.deliveryUrl, status: r.status === "READY" ? "ready" : r.status === "PROCESSING" ? "processing" : "failed" }
            }))
          })
        }
        toast("この端末に保存した下書きを開きました")
      }
      setRestored(true)
    })
  }, [userId, isPrivate, initialCommunity])

  useEffect(() => {
    api<CommunityDTO[]>("/api/communities?scope=joined&limit=50").then(r => setCommunities(r.data.filter(c => c.membership?.status === "ACTIVE"))).catch(() => undefined)
  }, [])

  // Autosave locally (debounced).
  useEffect(() => {
    if (!restored) return
    const t = setTimeout(() => {
      if (!dirty) return void deleteDraft(userId)
      void saveDraft({
        userId,
        caption,
        mediaIds: items.filter(i => i.mediaId && i.status !== "failed").map(i => i.mediaId!),
        altTexts: Object.fromEntries(items.filter(i => i.mediaId).map(i => [i.mediaId!, i.altText])),
        visibility,
        communitySlug: destination || null,
      })
    }, 600)
    return () => clearTimeout(t)
  }, [caption, items, visibility, destination, userId, dirty, restored])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    const beforeUnload = (e: BeforeUnloadEvent) => { if (uploading) { e.preventDefault() } }
    window.addEventListener("beforeunload", beforeUnload)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
      window.removeEventListener("beforeunload", beforeUnload)
    }
  }, [uploading])

  const patch = useCallback((localId: string, change: Partial<Attachment>) => {
    setItems(prev => prev.map(i => (i.localId === localId ? { ...i, ...change } : i)))
  }, [])

  async function startUpload(item: Attachment, file: File) {
    try {
      const sign = await signUpload(item.kind, file)
      patch(item.localId, { mediaId: sign.mediaId })
      const { promise, abort } = uploadFile(sign, file, ratio => patch(item.localId, { progress: ratio }))
      patch(item.localId, { abort })
      const result = await promise
      const media = await completeUpload(sign.mediaId, result)
      patch(item.localId, { status: media.status === "READY" ? "ready" : media.status === "PROCESSING" ? "processing" : "failed", progress: 1, abort: undefined, error: media.status === "FAILED" ? "処理に失敗しました" : null })
    } catch (error) {
      const aborted = (error as Error).name === "AbortError"
      if (aborted) return
      patch(item.localId, { status: "failed", abort: undefined, error: error instanceof Error ? error.message : "アップロードに失敗しました" })
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setFormError(null)
    const list = Array.from(files)
    const kinds: Array<"IMAGE" | "VIDEO" | null> = list.map(f => (VIDEO_TYPES.includes(normalizeMime(f)) ? "VIDEO" : IMAGE_TYPES.includes(normalizeMime(f)) ? "IMAGE" : null))
    if (kinds.some(k => k === null)) return setFormError("写真はJPEG・PNG・WebP・HEIC、動画はMP4・MOVを選んでください（GIF・SVGは使えません）")
    const existingKind = items.find(i => i.status !== "failed")?.kind
    const allKinds = new Set([...kinds, ...(existingKind ? [existingKind] : [])])
    if (allKinds.size > 1) return setFormError("写真と動画は同じ投稿に混ぜられません（写真5枚まで、または動画1本）")
    if (kinds[0] === "VIDEO" && list.length + items.length > 1) return setFormError("動画は1本までです")
    if (kinds[0] === "IMAGE" && list.length + items.length > 5) return setFormError("写真は5枚までです")
    for (const [index, file] of list.entries()) {
      const kind = kinds[index]!
      if (kind === "IMAGE" && file.size > MAX_IMAGE) return setFormError(`「${file.name}」が20MBを超えています`)
      if (kind === "VIDEO" && file.size > MAX_VIDEO) return setFormError(`「${file.name}」が100MBを超えています`)
      if (kind === "VIDEO") {
        const duration = await videoDurationMs(file)
        if (duration !== null && duration > 60_000) return setFormError("動画は60秒以内にしてください")
      }
    }
    const created: Attachment[] = list.map((file, index) => ({
      localId: newClientId("att"),
      kind: kinds[index]!,
      name: file.name,
      previewUrl: kinds[index] === "IMAGE" && normalizeMime(file) !== "image/heic" && normalizeMime(file) !== "image/heif" ? URL.createObjectURL(file) : null,
      mediaId: null,
      status: "uploading",
      progress: 0,
      error: null,
      altText: "",
      hasFile: true,
    }))
    created.forEach((item, index) => fileStore.current.set(item.localId, list[index]!))
    setItems(prev => { setSelected(prev.length); return [...prev, ...created] })
    created.forEach((item, index) => void startUpload(item, list[index]!))
  }

  function removeItem(localId: string) {
    const item = items.find(i => i.localId === localId)
    item?.abort?.()
    if (item?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl)
    fileStore.current.delete(localId)
    setItems(prev => prev.filter(i => i.localId !== localId))
    setSelected(i => Math.max(0, Math.min(i, items.length - 2)))
  }

  function retry(item: Attachment) {
    const file = fileStore.current.get(item.localId)
    if (!file) return
    patch(item.localId, { status: "uploading", progress: 0, error: null, mediaId: null })
    void startUpload(item, file)
  }

  function move(index: number, delta: number) {
    setItems(prev => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })
    setSelected(s => (s === index ? index + delta : s))
  }

  async function submit(publish: boolean) {
    setFormError(null)
    setFieldErrors({})
    if (!online) return setFormError("接続が切れています。下書きはこの端末に保存しました。接続が戻ったら再試行してください。")
    if (uploading) return setFormError("アップロードが終わるまでお待ちください")
    if (items.some(i => i.status === "failed" || i.status === "missing")) return setFormError("使えない添付があります。削除するか選び直してください")
    if (graphemeCount(caption) > CAPTION_MAX) return setFormError(`本文は${CAPTION_MAX}文字以内にしてください`)
    if (!caption.trim() && items.length === 0) return setFormError("本文を書くか、写真・動画を選んでください")
    if (community && !community.isPrivate && isPrivate && !confirmPublic) return setFormError("公開の集まりへの投稿は誰でも読めます。下の確認にチェックしてください")
    setSubmitting(true)
    try {
      const res = await api<PostDTO>("/api/posts", {
        method: "POST",
        idempotencyKey: idempotencyKey.current,
        body: {
          caption,
          mediaIds: items.map(i => i.mediaId!).filter(Boolean),
          altTexts: Object.fromEntries(items.filter(i => i.mediaId && i.altText.trim()).map(i => [i.mediaId!, i.altText.trim()])),
          visibility: destination ? "COMMUNITY" : visibility,
          communitySlug: destination || undefined,
          publish,
          confirmPublicCommunity: confirmPublic,
        },
      })
      await deleteDraft(userId)
      idempotencyKey.current = newClientId("post")
      setItems([])
      setCaption("")
      if (!publish) {
        toast.success("下書きを保存しました")
        router.push("/profile?tab=drafts")
      } else if (res.data.status === "PROCESSING") {
        toast.success("動画を処理しています。完了すると公開されます")
        router.push(`/post/${res.data.id}`)
      } else {
        toast.success("投稿しました")
        router.push(`/post/${res.data.id}?posted=1`)
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.code === "NETWORK" ? "接続が切れています。下書きはこの端末に保存しました。再試行してください。" : error.message)
        if (error.fieldErrors) setFieldErrors(error.fieldErrors)
        if (error.code === "PROFILE_REQUIRED") router.push("/onboarding?next=/create")
      } else setFormError("投稿できませんでした。入力内容はそのまま残っています。再試行してください")
    } finally {
      setSubmitting(false)
    }
  }

  function back() {
    if (dirty) setLeaveOpen(true)
    else router.back()
  }

  const count = graphemeCount(caption)
  const expanding = !destination && visibility === "PUBLIC"
  const current = items[Math.min(selected, items.length - 1)]
  const canAdd = items.length === 0 || (items[0]!.kind === "IMAGE" && items.length < 5)
  const statusText = (item: Attachment) =>
    item.status === "uploading" ? `アップロード中 ${Math.round(item.progress * 100)}%`
      : item.status === "processing" ? "処理中（投稿すると、処理が終わりしだい公開されます）"
        : item.status === "ready" ? "準備できました"
          : item.error ?? "もう一度選んでください"

  return (
    <div className="mx-auto w-full max-w-[960px] desktop:px-6">
      <div className="flex items-center gap-1 px-1 py-1 desktop:px-0 desktop:py-4">
        <button type="button" className="icon-btn" onClick={back} aria-label="戻る"><Icon name="back" /></button>
        <h1 className="flex-1 t-ui font-bold desktop:t-h2">新しい投稿</h1>
        <button type="button" className="btn btn-primary btn-sm mr-3 desktop:hidden" onClick={() => void submit(true)} disabled={submitting || uploading} aria-busy={submitting}>
          {submitting ? "送信中…" : "投稿する"}
        </button>
      </div>

      <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} aria-hidden multiple accept={[...IMAGE_TYPES, ...VIDEO_TYPES, ".heic", ".heif", ".mov"].join(",")} onChange={e => { void onFiles(e.target.files); e.target.value = "" }} />
      <input ref={cameraInput} type="file" className="sr-only" tabIndex={-1} aria-hidden accept="image/*,video/*" capture="environment" onChange={e => { void onFiles(e.target.files); e.target.value = "" }} />

      {!online && <div className="mb-3 px-[var(--gutter)] desktop:px-0"><Notice tone="warning">接続が切れています。下書きはこの端末に保存しました。接続が戻ったら再試行してください。</Notice></div>}

      <div className="desktop:grid desktop:grid-cols-[minmax(0,1fr)_360px] desktop:items-start desktop:gap-8">
        {/* Preview: what people will see, in order. */}
        <section aria-label="写真・動画" className="desktop:sticky desktop:top-24">
          {items.length === 0 || !current ? (
            <div className="mx-[var(--gutter)] flex flex-col items-center gap-3 rounded-[4px] border border-line bg-surface px-6 py-8 text-center desktop:mx-0 desktop:aspect-[4/5] desktop:justify-center">
              <span className="text-muted"><Icon name="image" size={40} strokeWidth={1.5} /></span>
              <p className="t-ui">写真・動画を選ぶか、文章だけの日記を書けます</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="btn btn-ink" onClick={() => fileInput.current?.click()} disabled={submitting}><Icon name="image" size={20} />写真・動画を選ぶ</button>
                <button type="button" className="btn btn-secondary" onClick={() => cameraInput.current?.click()} disabled={submitting}><Icon name="camera" size={20} />撮影する</button>
              </div>
              <p className="t-meta">写真は5枚まで（1枚20MB）。動画は1本・60秒・100MBまで。</p>
            </div>
          ) : (
            <>
              <div className="relative grid aspect-[4/5] place-items-center overflow-hidden bg-subtle photo-radius">
                {current.previewUrl && current.kind === "IMAGE"
                  ? <img src={current.previewUrl} alt={current.altText || `${selected + 1}枚目のプレビュー`} className="h-full w-full object-contain" />
                  : <span className="flex flex-col items-center gap-2 text-muted t-small"><Icon name={current.kind === "VIDEO" ? "video" : "image"} size={40} />{current.kind === "VIDEO" ? "動画（投稿後に再生できます）" : "プレビューできない形式です（HEIC など）"}</span>}
                {current.status === "uploading" && (
                  <div className="absolute inset-x-0 bottom-0 bg-[#20211F]/70 px-3 py-2 text-white">
                    <div className="h-1 overflow-hidden rounded-full bg-white/30"><div className="h-full bg-white transition-[width] duration-200" style={{ width: `${Math.round(current.progress * 100)}%` }} /></div>
                  </div>
                )}
                {items.length > 1 && <span className="absolute right-2 top-2 rounded-full bg-[#20211F]/65 px-2 py-0.5 t-label text-[13px] text-white">{selected + 1}/{items.length}</span>}
              </div>

              {/* Thumbnails: choose which one to edit; order = display order. */}
              <ol className="flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1 pt-3 desktop:px-0" aria-label="添付（この順番で表示されます）">
                {items.map((item, index) => (
                  <li
                    key={item.localId}
                    draggable
                    onDragStart={() => { dragIndex.current = index }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragIndex.current !== null && dragIndex.current !== index) move(dragIndex.current, index - dragIndex.current); dragIndex.current = null }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(index)}
                      aria-pressed={index === selected}
                      aria-label={`${index + 1}枚目を選ぶ（${statusText(item)}）`}
                      className={`relative grid h-16 w-16 place-items-center overflow-hidden rounded-[4px] bg-subtle outline-offset-2 ${index === selected ? "outline outline-2 outline-ink" : ""}`}
                    >
                      {item.previewUrl && item.kind === "IMAGE" ? <img src={item.previewUrl} alt="" className="h-full w-full object-cover" /> : <Icon name={item.kind === "VIDEO" ? "video" : "image"} size={24} />}
                      {item.status === "uploading" && <span className="absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-white/60"><span className="block h-full bg-ink" style={{ width: `${Math.round(item.progress * 100)}%` }} /></span>}
                      {(item.status === "failed" || item.status === "missing") && <span className="absolute inset-0 grid place-items-center bg-[#20211F]/55 text-white"><Icon name="alert" size={22} /></span>}
                    </button>
                  </li>
                ))}
                {canAdd && (
                  <li>
                    <button type="button" className="grid h-16 w-16 place-items-center rounded-[4px] border border-control bg-surface text-ink" onClick={() => fileInput.current?.click()} disabled={submitting} aria-label="写真を追加">
                      <Icon name="plus" />
                    </button>
                  </li>
                )}
              </ol>

              <div className="px-[var(--gutter)] desktop:px-0">
                <div className="flex flex-wrap items-center gap-x-2">
                  <p className={`min-w-0 flex-1 t-small ${current.status === "ready" ? "text-success" : current.status === "failed" || current.status === "missing" ? "text-error" : "text-muted"}`} role={current.status === "failed" || current.status === "missing" ? "alert" : "status"}>
                    {(current.status === "failed" || current.status === "missing") && <Icon name="alert" size={16} className="mr-1 inline align-[-3px]" />}
                    {current.status === "ready" && <Icon name="check" size={16} className="mr-1 inline align-[-3px]" />}
                    {statusText(current)}
                  </p>
                  <div className="flex">
                    {current.status === "failed" && current.hasFile && <button type="button" className="btn btn-ghost btn-sm" onClick={() => retry(current)}><Icon name="refresh" size={18} />再試行</button>}
                    <button type="button" className="icon-btn" onClick={() => move(selected, -1)} disabled={selected === 0} aria-label={`${selected + 1}番目を前へ`}><Icon name="chevronLeft" size={20} /></button>
                    <button type="button" className="icon-btn" onClick={() => move(selected, 1)} disabled={selected === items.length - 1} aria-label={`${selected + 1}番目を後ろへ`}><Icon name="chevronRight" size={20} /></button>
                    <button type="button" className="icon-btn" onClick={() => removeItem(current.localId)} aria-label={current.status === "uploading" ? `${selected + 1}番目のアップロードを取り消す` : `${selected + 1}番目を削除`}><Icon name="trash" size={20} /></button>
                  </div>
                </div>
                {current.kind === "IMAGE" && (
                  <label className="mt-1 block">
                    <span className="field-label">代替テキスト（画像の説明・任意）</span>
                    <input className="input" value={current.altText} maxLength={ALT_MAX + 20} onChange={e => patch(current.localId, { altText: e.target.value })} placeholder="例: 花屋の店先のオレンジの花" />
                  </label>
                )}
                {uploading && <p className="mt-2 t-meta" role="status">アップロード中にタブを閉じると、その写真・動画はもう一度選ぶ必要があります。</p>}
              </div>
            </>
          )}
        </section>

        {/* Text and settings. */}
        <section aria-label="本文と公開設定" className="mt-4 px-[var(--gutter)] desktop:mt-0 desktop:px-0">
          <label htmlFor="caption" className="field-label">本文</label>
          <textarea
            id="caption"
            aria-label="投稿本文"
            className="textarea min-h-[140px]"
            placeholder="見つけたもの、思ったこと。"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            aria-invalid={count > CAPTION_MAX || !!fieldErrors.caption}
            aria-describedby="caption-count"
          />
          <p id="caption-count" className={`mt-1 text-right t-meta ${count > CAPTION_MAX ? "!text-error" : ""}`}>{count} / {CAPTION_MAX}</p>
          {fieldErrors.caption && <p className="field-error">{fieldErrors.caption.join(" ")}</p>}

          <div className="mt-2 divide-y divide-line border-y border-line">
            <label className="flex items-center justify-between gap-3 py-3">
              <span className="t-ui">投稿先</span>
              <select className="select max-w-[60%]" value={destination} onChange={e => { setDestination(e.target.value); setConfirmPublic(false) }}>
                <option value="">自分のページ</option>
                {communities.map(c => <option key={c.id} value={c.slug}>{c.name}{c.isPrivate ? "（非公開）" : ""}</option>)}
              </select>
            </label>
            {destination ? (
              <div className="py-3">
                <p className="flex items-center justify-between gap-3"><span className="t-ui">公開範囲</span><b className="t-small">{community?.isPrivate ? "集まりのメンバー" : "誰でも（公開の集まり）"}</b></p>
                {community && !community.isPrivate && isPrivate && (
                  <label className="mt-2 flex items-start gap-2 t-small">
                    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={confirmPublic} onChange={e => setConfirmPublic(e.target.checked)} />
                    <span>あなたは非公開アカウントですが、公開の集まりへの投稿はログインしていない人も含め誰でも読めます。理解して投稿します。</span>
                  </label>
                )}
              </div>
            ) : (
              <fieldset className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <legend className="float-left t-ui">公開範囲</legend>
                  <div className="segmented">
                    <button type="button" aria-pressed={visibility === "PUBLIC"} disabled={isPrivate} aria-disabled={isPrivate} onClick={() => setVisibility("PUBLIC")}><Icon name="globe" size={16} />公開</button>
                    <button type="button" aria-pressed={visibility === "FOLLOWERS"} onClick={() => setVisibility("FOLLOWERS")}><Icon name="lock" size={16} />フォロワー</button>
                  </div>
                </div>
                {isPrivate && <p className="field-hint">非公開アカウントの投稿は、承認したフォロワーだけが読めます（設定で変更できます）。</p>}
                {expanding && !isPrivate && <p className="field-hint">公開の投稿は、ログインしていない人も読めます。</p>}
              </fieldset>
            )}
          </div>

          {formError && <div className="mt-3"><Notice tone="error">{formError}</Notice></div>}

          <div className="mt-4 flex gap-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => void submit(false)} disabled={submitting || uploading || !dirty}>下書き保存</button>
            <button type="button" className="btn btn-primary flex-1" onClick={() => void submit(true)} disabled={submitting || uploading} aria-busy={submitting}>{submitting ? "送信中…" : "投稿する"}</button>
          </div>
        </section>
      </div>

      <Dialog open={leaveOpen} onClose={() => setLeaveOpen(false)} title="入力中の内容があります" variant="center">
        <p className="mb-4 t-body">下書きとして残すか、破棄するかを選んでください。</p>
        <div className="space-y-2">
          <button type="button" className="btn btn-ink btn-block" onClick={() => { setLeaveOpen(false); router.back() }}>この端末に下書きを残して戻る</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={async () => { items.forEach(i => i.abort?.()); await deleteDraft(userId); setItems([]); setCaption(""); setLeaveOpen(false); router.back() }}>破棄して戻る</button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setLeaveOpen(false)}>編集を続ける</button>
        </div>
      </Dialog>
    </div>
  )
}
