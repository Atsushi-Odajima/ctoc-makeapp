import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Avatar from './Avatar'
import {
  REACTIONS,
  REACTION_MAP,
  type Like,
  type Reaction,
  type TargetType,
} from '../lib/types'

interface Props {
  targetType: TargetType
  targetId: string
  likes: Like[] // この対象に付いたリアクション(user embed 済み)
  onChanged: () => void
  compact?: boolean
}

export default function ReactionBar({
  targetType,
  targetId,
  likes,
  onChanged,
  compact = false,
}: Props) {
  const { session } = useAuth()
  const [showList, setShowList] = useState(false)
  const [busy, setBusy] = useState(false)
  const uid = session!.user.id

  const mine = likes.find((l) => l.user_id === uid)

  const toggle = async (reaction: Reaction) => {
    if (busy) return
    setBusy(true)
    try {
      if (mine && mine.reaction === reaction) {
        await supabase.from('likes').delete().eq('id', mine.id)
      } else if (mine) {
        await supabase.from('likes').update({ reaction }).eq('id', mine.id)
      } else {
        await supabase.from('likes').insert({
          user_id: uid,
          target_type: targetType,
          target_id: targetId,
          reaction,
        })
      }
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const recent = [...likes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((r) => {
          const count = likes.filter((l) => l.reaction === r.key).length
          const active = mine?.reaction === r.key
          return (
            <button
              key={r.key}
              onClick={() => toggle(r.key)}
              disabled={busy}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition active:scale-95 ${
                active
                  ? 'border-sky-400 bg-sky-100 font-bold text-sky-700'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              <span>{r.emoji}</span>
              {!compact && <span>{r.label}</span>}
              {count > 0 && <span>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Instagram 風: リアクションした人のアバター + 名前 */}
      {recent.length > 0 && (
        <button
          onClick={() => setShowList(true)}
          className="mt-1.5 flex items-center gap-1.5 text-left"
        >
          <span className="flex -space-x-2">
            {recent.slice(0, 3).map((l) => (
              <span key={l.id} className="rounded-full ring-2 ring-white">
                <Avatar avatar={l.user?.avatar} size="sm" />
              </span>
            ))}
          </span>
          <span className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {recent[0].user?.nickname ?? '誰か'}さん
            </span>
            {recent.length > 1 && `、他${recent.length - 1}人`}
            がリアクションしました
          </span>
        </button>
      )}

      {/* リアクション一覧モーダル */}
      {showList && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          onClick={() => setShowList(false)}
        >
          <div
            className="pb-safe max-h-[60dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <h3 className="mb-3 text-center text-sm font-bold text-slate-700">
              リアクションした人
            </h3>
            <ul className="space-y-2.5">
              {recent.map((l) => (
                <li key={l.id} className="flex items-center gap-2.5">
                  <Avatar avatar={l.user?.avatar} />
                  <span className="flex-1 text-sm font-medium text-slate-700">
                    {l.user?.nickname ?? '不明'}
                  </span>
                  <span className="text-lg">{REACTION_MAP[l.reaction].emoji}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
