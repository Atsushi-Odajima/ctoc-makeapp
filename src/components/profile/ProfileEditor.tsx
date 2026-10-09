"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { Notice, Skeletons } from "@/components/ui/States"
import { api, ApiClientError } from "@/lib/client/api"
import { graphemeCount } from "@/lib/client/text"
import { completeUpload, signUpload, uploadFile } from "@/components/create/upload"
import type { PublicUser } from "@/lib/dto/user"

type Own = PublicUser & { email: string; profileComplete: boolean }

export function ProfileEditor() {
  const router = useRouter()
  const [me, setMe] = useState<Own | null>(null)
  const [form, setForm] = useState({ name: "", bio: "", website: "" })
  const [avatarMediaId, setAvatarMediaId] = useState<string | null | undefined>(undefined)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api<Own>("/api/profile").then(r => {
      setMe(r.data)
      setForm({ name: r.data.name, bio: r.data.bio ?? "", website: r.data.website ?? "" })
    }).catch(() => setError("読み込めませんでした"))
  }, [])

  async function pickAvatar(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    try {
      const sign = await signUpload("IMAGE", file, "AVATAR")
      setAvatarPreview(URL.createObjectURL(file))
      const up = uploadFile(sign, file, r => setUploading(Math.max(0.01, r)))
      const result = await up.promise
      const media = await completeUpload(sign.mediaId, result)
      if (media.status !== "READY") throw new Error("画像を処理できませんでした")
      setAvatarMediaId(sign.mediaId)
    } catch (e) {
      setAvatarPreview(null)
      setError(e instanceof ApiClientError || e instanceof Error ? e.message : "アップロードできませんでした")
    } finally {
      setUploading(0)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setError(null)
    try {
      await api("/api/profile", { method: "PATCH", body: { name: form.name, bio: form.bio || null, website: form.website || null, ...(avatarMediaId !== undefined ? { avatarMediaId } : {}) } })
      toast.success("保存しました")
      router.push("/profile")
      router.refresh()
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fieldErrors ?? {})
        setError(err.message)
      } else setError("保存できませんでした")
    } finally {
      setSaving(false)
    }
  }

  if (!me) return <div className="feed-column gutter pt-4 desktop:px-0">{error ? <Notice tone="error">{error}</Notice> : <Skeletons count={1} />}</div>
  return (
    <form onSubmit={save} className="feed-column gutter space-y-5 desktop:px-0 desktop:pt-6" noValidate>
      <div className="-ml-3 flex items-center gap-1 pt-1">
        <Link href="/profile" className="icon-btn" aria-label="戻る"><Icon name="back" /></Link>
        <h1 className="t-h1 flex-1">プロフィールを編集</h1>
      </div>
      <div className="flex items-center gap-4">
        {avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarPreview} alt="新しいアイコンのプレビュー" className="h-[72px] w-[72px] rounded-full object-cover" />
        ) : <Avatar user={me} size={72} decorative={false} />}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>{uploading > 0 ? `アップロード中 ${Math.round(uploading * 100)}%` : "アイコンを変更"}</button>
          {(me.avatar || avatarPreview) && <button type="button" className="btn btn-ghost" onClick={() => { setAvatarMediaId(null); setAvatarPreview(null) }}>アイコンを外す</button>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" tabIndex={-1} aria-hidden onChange={e => { void pickAvatar(e.target.files); e.target.value = "" }} />
        </div>
      </div>
      <p className="field-hint -mt-3">アイコンはプロフィールの公開情報です。人物の写真でなくてもかまいません。</p>

      <Field label="表示名（匿名でOK・30文字まで）" error={errors.name}>
        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} aria-invalid={!!errors.name} autoComplete="nickname" />
        <span aria-hidden="true" className="field-hint block text-right">{graphemeCount(form.name)} / 30</span>
      </Field>
      <Field label="自己紹介（160文字まで）" error={errors.bio}>
        <textarea className="textarea" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} aria-invalid={!!errors.bio} />
        <span aria-hidden="true" className="field-hint block text-right">{graphemeCount(form.bio)} / 160</span>
      </Field>
      <Field label="ウェブサイト（http:// または https://）" error={errors.website}>
        <input className="input" type="url" inputMode="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} aria-invalid={!!errors.website} placeholder="https://" />
      </Field>
      <Field label="ユーザー名">
        <input className="input" value={`@${me.username}`} readOnly aria-readonly />
        <span className="field-hint block">ユーザー名は変更できません（URLとして使われています）。</span>
      </Field>

      <div className="border-y border-line py-4">
        <p className="t-ui font-bold">イキリポイント・残念な弱点・趣味3つ</p>
        <p className="mt-1 t-small">{me.strength?.label ?? "未設定"} / {me.weakness?.label ?? "未設定"} / {me.hobbies.map(h => h.label).join("・") || "未設定"}</p>
        <Link href="/onboarding?next=/profile" className="btn btn-secondary mt-3">3つの項目を変更</Link>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn btn-primary btn-block" disabled={saving || uploading > 0} aria-busy={saving}>{saving ? "保存中…" : "保存"}</button>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error block" role="alert">{error.join(" ")}</span>}
    </label>
  )
}
