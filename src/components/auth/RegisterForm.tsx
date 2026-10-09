"use client"

import Link from "next/link"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { Notice } from "@/components/ui/States"
import { api, ApiClientError } from "@/lib/client/api"
import { graphemeCount } from "@/lib/client/text"

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setError(null)
    setLoading(true)
    try {
      await api("/api/register", { method: "POST", body: { ...form, username: form.username || undefined } })
      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false })
      window.location.href = result?.error ? "/login" : "/onboarding"
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fieldErrors ?? {})
        setError(err.message)
      } else setError("登録できませんでした")
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value })), "aria-invalid": !!errors[key] })
  return (
    <form onSubmit={submit} className="space-y-4 pt-4" noValidate>
      <h1 className="t-h1">新規登録</h1>
      <label className="block">
        <span className="field-label">表示名（匿名でOK・30文字まで）</span>
        <input className="input" autoComplete="nickname" {...field("name")} />
        <span aria-hidden="true" className="field-hint block text-right">{graphemeCount(form.name)} / 30</span>
        {errors.name && <span className="field-error block">{errors.name.join(" ")}</span>}
      </label>
      <label className="block">
        <span className="field-label">ユーザー名（半角英小文字・数字・_ 3〜30文字・任意）</span>
        <input className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} {...field("username")} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} />
        {errors.username && <span className="field-error block">{errors.username.join(" ")}</span>}
      </label>
      <label className="block">
        <span className="field-label">メールアドレス（公開されません）</span>
        <input className="input" type="email" inputMode="email" autoComplete="email" {...field("email")} />
        {errors.email && <span className="field-error block">{errors.email.join(" ")}</span>}
      </label>
      <label className="block">
        <span className="field-label">パスワード（8文字以上）</span>
        <input className="input" type="password" autoComplete="new-password" {...field("password")} />
        {errors.password && <span className="field-error block">{errors.password.join(" ")}</span>}
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <p className="text-muted t-small">登録すると<Link href="/terms" className="underline">利用規約</Link>と<Link href="/privacy" className="underline">プライバシーポリシー</Link>に同意したものとみなします。</p>
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? "作成中…" : "アカウントを作成"}</button>
      <p className="text-center t-small">アカウントをお持ちの方は <Link href="/login" className="font-bold underline">ログイン</Link></p>
    </form>
  )
}
