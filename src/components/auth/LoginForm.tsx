"use client"

import Link from "next/link"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { Notice } from "@/components/ui/States"
import type { OAuthProviderId } from "@/lib/auth-providers"

const PROVIDER_LABEL: Record<OAuthProviderId, string> = { google: "Googleでログイン", line: "LINEでログイン", facebook: "Facebookでログイン" }

export function LoginForm({ providers, callbackUrl, deleted, oauthError }: { providers: OAuthProviderId[]; callbackUrl: string; deleted: boolean; oauthError: boolean }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(oauthError ? "ログインできませんでした。もう一度お試しください" : null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) return setError("メールアドレスとパスワードを入力してください")
    setLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        // Same message whether or not the account exists.
        setError(result.code === "rate_limited" ? "ログインの試行が多すぎます。15分ほど待ってから再度お試しください" : "メールアドレスまたはパスワードが違います")
      } else {
        window.location.href = callbackUrl
      }
    } catch {
      setError("接続できませんでした。通信状態を確認してください")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 pt-4">
      <h1 className="t-h1">ログイン</h1>
      {deleted && <Notice tone="success">退会の手続きを受け付けました。ご利用ありがとうございました。</Notice>}
      {providers.length > 0 && (
        <div className="space-y-2">
          {providers.map(p => (
            <button key={p} type="button" className="btn btn-secondary btn-block" onClick={() => void signIn(p, { callbackUrl })}>{PROVIDER_LABEL[p]}</button>
          ))}
          <p className="text-center text-muted t-small">またはメールアドレスで</p>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block">
          <span className="field-label">メールアドレス</span>
          <input className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <div>
          <label htmlFor="login-password" className="field-label">パスワード</label>
          <div className="flex gap-2">
            <input id="login-password" className="input" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" className="btn btn-secondary shrink-0" onClick={() => setShow(s => !s)} aria-pressed={show} aria-controls="login-password">{show ? "隠す" : "表示"}</button>
          </div>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading} aria-busy={loading}>{loading ? "ログイン中…" : "ログイン"}</button>
      </form>
      <p className="text-center t-small">はじめての方は <Link href="/register" className="font-bold underline">新規登録</Link></p>
    </div>
  )
}
