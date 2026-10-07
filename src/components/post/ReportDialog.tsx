"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Dialog } from "@/components/ui/Dialog"
import { api, ApiClientError } from "@/lib/client/api"

const REASONS: Array<[string, string]> = [
  ["spam", "スパム・宣伝"],
  ["harassment", "嫌がらせ・いじめ"],
  ["hate", "差別・ヘイト"],
  ["sexual", "性的な内容"],
  ["violence", "暴力・危険な行為"],
  ["self_harm", "自傷・自殺に関する内容"],
  ["privacy", "個人情報の公開"],
  ["impersonation", "なりすまし"],
  ["other", "その他"],
]

export function ReportDialog({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: "POST" | "COMMENT" | "USER" | "MESSAGE"; targetId: string }) {
  const [reason, setReason] = useState("")
  const [detail, setDetail] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) return setError("理由を選んでください")
    setSending(true)
    setError(null)
    try {
      await api("/api/reports", { method: "POST", body: { targetType, targetId, reasonCode: reason, detail: detail.trim() || undefined } })
      toast.success("通報を受け付けました。運営が確認します")
      onClose()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "送信できませんでした")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="通報する">
      <form onSubmit={submit} className="space-y-3">
        <fieldset>
          <legend className="field-label">理由</legend>
          <div className="space-y-1">
            {REASONS.map(([value, label]) => (
              <label key={value} className="flex min-h-[44px] items-center gap-3 rounded-[11px] px-2 hover:bg-canvas">
                <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="h-5 w-5" />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="field-label">詳しく（任意・1000文字まで）</span>
          <textarea className="textarea" value={detail} onChange={e => setDetail(e.target.value)} maxLength={1200} />
        </label>
        <p className="field-hint">通報した人の情報が相手に伝わることはありません。運営は通報された内容だけを確認します。</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={sending}>{sending ? "送信中…" : "通報する"}</button>
      </form>
    </Dialog>
  )
}
