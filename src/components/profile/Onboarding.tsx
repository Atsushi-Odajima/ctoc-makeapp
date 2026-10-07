"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/Icon"
import { Notice } from "@/components/ui/States"
import { useViewer } from "@/components/layout/ViewerContext"
import { api, ApiClientError } from "@/lib/client/api"
import { ProfileHero } from "./ProfileHero"

interface Option { id: string; label: string }
interface Options { strengths: Option[]; weaknesses: Option[]; hobbies: Option[] }
interface Selection { strength: string | null; weakness: string | null; hobbies: string[] }

const STEPS = ["イキリポイント", "残念な弱点", "趣味3つ"] as const

export function Onboarding({ userId, editing, next, initial }: { userId: string; editing: boolean; next: string; initial: Selection }) {
  const router = useRouter()
  const viewer = useViewer()
  const storageKey = `daynet:onboarding:${userId}`
  const [options, setOptions] = useState<Options | null>(null)
  const [step, setStep] = useState(0) // 0..2 steps, 3 = preview
  const [sel, setSel] = useState<Selection>(initial)
  const [filter, setFilter] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<Options>("/api/profile/options").then(r => {
      setOptions(r.data)
      // Restore locally saved progress (never for edits of an existing introduction).
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as (Selection & { step: number }) | null
        if (saved && !editing) {
          setSel({ strength: saved.strength, weakness: saved.weakness, hobbies: saved.hobbies })
          setStep(Math.min(3, saved.step))
        }
      } catch { /* ignore */ }
    }).catch(() => setError("選択肢を読み込めませんでした。再読み込みしてください"))
  }, [storageKey, editing])

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ ...sel, step })) } catch { /* ignore */ }
  }, [sel, step, storageKey])

  const lookup = useMemo(() => new Map((options ? [...options.strengths, ...options.weaknesses, ...options.hobbies] : []).map(o => [o.id, o])), [options])
  const canNext = step === 0 ? !!sel.strength : step === 1 ? !!sel.weakness : step === 2 ? sel.hobbies.length === 3 : true

  async function confirm() {
    if (!sel.strength || !sel.weakness || sel.hobbies.length !== 3) return
    setSaving(true)
    setError(null)
    try {
      await api("/api/profile/introduction", { method: "PUT", body: { strengthOptionId: sel.strength, weaknessOptionId: sel.weakness, hobbyOptionIds: sel.hobbies } })
      try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
      router.push(next)
      router.refresh()
    } catch (e) {
      setError(e instanceof ApiClientError ? Object.values(e.fieldErrors ?? {}).flat()[0] ?? e.message : "保存できませんでした")
    } finally {
      setSaving(false)
    }
  }

  function toggleHobby(id: string) {
    setSel(s => s.hobbies.includes(id) ? { ...s, hobbies: s.hobbies.filter(h => h !== id) } : s.hobbies.length >= 3 ? s : { ...s, hobbies: [...s.hobbies, id] })
  }

  const list = step === 0 ? options?.strengths : step === 1 ? options?.weaknesses : options?.hobbies
  const shown = (list ?? []).filter(o => !filter || o.label.includes(filter))

  return (
    <div className="mx-auto max-w-[640px] gutter">
      <p className="t-overline mt-4">{step < 3 ? `STEP ${step + 1} / 3` : "PREVIEW"}</p>
      <h1 className="t-h1">{step < 3 ? STEPS[step] : "この内容で設定しますか？"}</h1>
      <p className="mt-1 text-muted t-small">
        {step === 0 && "ちょっと自慢できることを1つ選んでください。"}
        {step === 1 && "憎めない弱点を1つ選んでください。"}
        {step === 2 && `好きなことを3つ選んでください（${sel.hobbies.length} / 3）。`}
        {step === 3 && "3つの項目はプロフィールの公開情報です。非公開アカウントでも、表示名・自己紹介とあわせて誰でも見られます（投稿は限定されます）。"}
      </p>
      <ol className="mt-3 flex gap-1" aria-label="進み具合">
        {[0, 1, 2].map(i => <li key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-ink" : "bg-line"}`} aria-current={i === step ? "step" : undefined}><span className="sr-only">{STEPS[i]}{i < step ? "（完了）" : ""}</span></li>)}
      </ol>

      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

      {step < 3 ? (
        <fieldset className="mt-4">
          <legend className="sr-only">{STEPS[step]}を選ぶ</legend>
          {step === 2 && (
            <label className="mb-3 block">
              <span className="sr-only">趣味を絞り込む</span>
              <input className="input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="趣味を絞り込む（例: 写真）" />
            </label>
          )}
          {!options ? <p aria-busy="true" className="text-muted">読み込み中…</p> : (
            <div className="flex flex-wrap gap-2">
              {shown.map(o => {
                const selected = step === 0 ? sel.strength === o.id : step === 1 ? sel.weakness === o.id : sel.hobbies.includes(o.id)
                const disabled = step === 2 && !selected && sel.hobbies.length >= 3
                return (
                  <label key={o.id} className={`interactive inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[11px] border px-3 text-[13px] ${selected ? "border-ink bg-ink font-bold text-white" : "border-control bg-surface"} ${disabled ? "opacity-45" : ""}`}>
                    <input
                      type={step === 2 ? "checkbox" : "radio"}
                      name={`step-${step}`}
                      className="sr-only"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => {
                        if (step === 0) setSel(s => ({ ...s, strength: o.id }))
                        else if (step === 1) setSel(s => ({ ...s, weakness: o.id }))
                        else toggleHobby(o.id)
                      }}
                    />
                    {selected && <Icon name="check" size={16} />}
                    {o.label}
                  </label>
                )
              })}
            </div>
          )}
          {step === 2 && sel.hobbies.length >= 3 && <p className="field-hint">3つ選びました。変えるときは、選んだものをもう一度押して外してください。</p>}
        </fieldset>
      ) : (
        <div className="mt-4">
          <ProfileHero user={{
            id: userId, name: viewer?.name ?? "", username: viewer?.username ?? "", avatar: viewer?.avatar ?? null, bio: null, website: null, isPrivate: false,
            strength: sel.strength ? lookup.get(sel.strength) ?? null : null,
            weakness: sel.weakness ? lookup.get(sel.weakness) ?? null : null,
            hobbies: sel.hobbies.map(h => lookup.get(h)).filter((o): o is Option => !!o),
          }} />
        </div>
      )}

      <div className="mt-6 flex gap-2">
        {step > 0 && <button type="button" className="btn btn-secondary flex-1" onClick={() => setStep(s => s - 1)}>戻る</button>}
        {step < 3 ? (
          <button type="button" className="btn btn-primary flex-1" disabled={!canNext} aria-disabled={!canNext} onClick={() => setStep(s => s + 1)}>
            {step === 2 ? "確認へ" : "次へ"}
          </button>
        ) : (
          <button type="button" className="btn btn-accent flex-1" disabled={saving} onClick={() => void confirm()}>{saving ? "保存中…" : editing ? "この内容で更新" : "この内容ではじめる"}</button>
        )}
      </div>
      {!canNext && step < 3 && <p className="field-hint text-center">{step === 2 ? "3つ選ぶと次へ進めます" : "1つ選ぶと次へ進めます"}</p>}
    </div>
  )
}
