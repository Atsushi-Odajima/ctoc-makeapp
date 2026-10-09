"use client"

import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Tabs } from "@/components/ui/Tabs"
import { Notice, Skeletons } from "@/components/ui/States"
import { api, ApiClientError } from "@/lib/client/api"
import { formatDateTime } from "@/lib/client/format"

interface Report { id: string; targetType: "POST" | "COMMENT" | "USER" | "MESSAGE"; targetId: string; reasonCode: string; detail: string | null; state: string; createdAt: string }
interface Detail {
  report: Report
  target: { kind: string; id: string; text: string | null; hidden?: boolean; status?: string; author: { id: string; username: string; name: string }; createdAt: string; mediaCount?: number } | null
  history: Array<{ action: string; reason: string; createdAt: string; actor: { username: string } }>
}

const TYPE_LABEL = { POST: "投稿", COMMENT: "コメント", USER: "ユーザー", MESSAGE: "メッセージ" }

export function ModerationQueue() {
  const [state, setState] = useState<"OPEN" | "REVIEWING" | "RESOLVED">("OPEN")
  const [reports, setReports] = useState<Report[] | null>(null)
  const [selected, setSelected] = useState<Detail | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api<Report[]>(`/api/moderation/reports?state=${state}`).then(r => setReports(r.data)).catch(() => setReports([]))
  }, [state])
  useEffect(load, [load])

  async function open(id: string) {
    setReason("")
    setSelected((await api<Detail>(`/api/moderation/reports/${id}`)).data)
  }

  async function act(action: string) {
    if (!selected) return
    if (!reason.trim()) return toast.error("判断の理由を入力してください（監査記録に残ります）")
    setBusy(true)
    try {
      await api("/api/moderation/actions", { method: "POST", body: { reportId: selected.report.id, targetType: selected.report.targetType, targetId: selected.report.targetId, action, reason } })
      toast.success("記録しました")
      await open(selected.report.id)
      load()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "操作できませんでした")
    } finally {
      setBusy(false)
    }
  }

  const t = selected?.report.targetType
  return (
    <div className="wide-column gutter desktop:px-6 desktop:pt-6">
      <h1 className="t-h1 mt-4">通報の確認</h1>
      <p className="mb-3 text-muted t-small">通報された内容だけを表示します。会話の全体や他の投稿は表示しません。すべての判断は理由とともに記録され、変更・削除できません。</p>
      <Tabs label="状態" value={state} onChange={v => { setReports(null); setSelected(null); setState(v) }} items={[{ value: "OPEN", label: "未対応" }, { value: "REVIEWING", label: "確認中" }, { value: "RESOLVED", label: "対応済み" }]} />
      <div className="mt-4 grid gap-4 desktop:grid-cols-[320px_1fr]">
        <div>
          {!reports ? <Skeletons count={1} /> : reports.length === 0 ? <p className="text-muted t-small">ありません。</p> : (
            <ul>
              {reports.map(r => (
                <li key={r.id}>
                  <button type="button" className={`w-full border-b border-line py-3 text-left ${selected?.report.id === r.id ? "font-bold" : ""}`} onClick={() => void open(r.id)} aria-pressed={selected?.report.id === r.id}>
                    <span className="block t-small">{TYPE_LABEL[r.targetType]} · {r.reasonCode}</span>
                    <span className="block text-muted t-tiny">{formatDateTime(r.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selected && (
          <section className="space-y-3 rounded-[8px] bg-surface p-5" aria-label="通報の詳細">
            <p className="t-small">理由: <b>{selected.report.reasonCode}</b>{selected.report.detail && <> — {selected.report.detail}</>}</p>
            {selected.target ? (
              <div className="rounded-[8px] border border-line p-3">
                <p className="text-muted t-tiny">{TYPE_LABEL[selected.report.targetType]} · @{selected.target.author.username} · {formatDateTime(selected.target.createdAt)}{selected.target.hidden ? " · 非表示中" : ""}{selected.target.status ? ` · ${selected.target.status}` : ""}</p>
                <p className="mt-1 whitespace-pre-wrap t-body">{selected.target.text ?? "（本文なし）"}</p>
                {selected.target.mediaCount ? <p className="text-muted t-tiny">添付 {selected.target.mediaCount}件（運営画面では表示しません）</p> : null}
              </div>
            ) : <Notice tone="info">対象はすでに削除されています。</Notice>}
            <label className="block"><span className="field-label">判断の理由（必須・監査記録）</span><textarea className="textarea" value={reason} onChange={e => setReason(e.target.value)} /></label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void act("review")}>確認中にする</button>
              {t !== "USER" && <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void act("hide")}>非表示にする</button>}
              {(t === "POST" || t === "COMMENT") && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void act("restore")}>復元する</button>}
              {t === "USER" && <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void act("suspend_user")}>アカウントを停止</button>}
              {t === "USER" && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void act("unsuspend_user")}>停止を解除</button>}
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void act("dismiss")}>問題なしとして閉じる</button>
            </div>
            {selected.history.length > 0 && (
              <div>
                <h3 className="t-section">対応の記録</h3>
                <ul className="mt-1 space-y-1 t-small">{selected.history.map((h, i) => <li key={i}>{formatDateTime(h.createdAt)} @{h.actor.username}: {h.action} — {h.reason}</li>)}</ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
