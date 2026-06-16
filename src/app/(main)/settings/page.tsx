"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ArrowLeft, Bell, Shield, Eye, LogOut, ChevronRight, Moon, Loader2, Save
} from "lucide-react"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Discovery settings
  const [lookingFor, setLookingFor] = useState("everyone")
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(50)
  const [maxDistance, setMaxDistance] = useState(50)
  const [showMe, setShowMe] = useState(true)

  // Notification settings
  const [notifyMatches, setNotifyMatches] = useState(true)
  const [notifyMessages, setNotifyMessages] = useState(true)

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        setLookingFor(data.lookingFor || "everyone")
        setMinAge(data.minAge || 18)
        setMaxAge(data.maxAge || 50)
        setMaxDistance(data.maxDistance || 50)
        setShowMe(data.showMe ?? true)
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveSettings() {
    setSaving(true)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookingFor, minAge, maxAge, maxDistance, showMe }),
      })
      toast.success("設定を保存しました")
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f0f4ff]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-100">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-slate-800">設定</h1>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold px-3 py-2 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Discovery Settings */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800">検索設定</h2>
          </div>

          <div className="p-4 space-y-5">
            {/* Show Me */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-700">プロフィールを表示</p>
                <p className="text-sm text-slate-400">オフにすると他のユーザーに表示されません</p>
              </div>
              <button
                onClick={() => setShowMe(!showMe)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  showMe ? "bg-blue-600" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                  showMe ? "left-6" : "left-0.5"
                )} />
              </button>
            </div>

            {/* Looking For */}
            <div>
              <p className="font-medium text-slate-700 mb-2">表示する性別</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "everyone", label: "全員" },
                  { value: "male", label: "男性" },
                  { value: "female", label: "女性" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setLookingFor(value)}
                    className={cn(
                      "py-2 rounded-xl border-2 text-sm font-medium transition-all",
                      lookingFor === value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-500"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div>
              <div className="flex justify-between mb-2">
                <p className="font-medium text-slate-700">年齢範囲</p>
                <span className="text-sm text-blue-600 font-medium">{minAge} 〜 {maxAge}歳</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>最小: {minAge}歳</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={maxAge}
                    value={minAge}
                    onChange={e => setMinAge(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>最大: {maxAge}歳</span>
                  </div>
                  <input
                    type="range"
                    min={minAge}
                    max={80}
                    value={maxAge}
                    onChange={e => setMaxAge(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Distance */}
            <div>
              <div className="flex justify-between mb-2">
                <p className="font-medium text-slate-700">最大距離</p>
                <span className="text-sm text-blue-600 font-medium">{maxDistance} km</span>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                value={maxDistance}
                onChange={e => setMaxDistance(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-800">通知</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { label: "マッチング通知", desc: "新しいマッチングがあったとき", value: notifyMatches, set: setNotifyMatches },
              { label: "メッセージ通知", desc: "新しいメッセージが届いたとき", value: notifyMessages, set: setNotifyMessages },
            ].map(({ label, desc, value, set }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="font-medium text-slate-700">{label}</p>
                  <p className="text-sm text-slate-400">{desc}</p>
                </div>
                <button
                  onClick={() => set(!value)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    value ? "bg-blue-600" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                    value ? "left-6" : "left-0.5"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Other Settings */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {[
              { icon: Shield, label: "プライバシー設定", color: "text-green-500" },
              { icon: Eye, label: "ブロック済みユーザー", color: "text-slate-500" },
              { icon: Moon, label: "ダークモード", color: "text-purple-500" },
            ].map(({ icon: Icon, label, color }) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors"
              >
                <Icon className={cn("w-5 h-5", color)} />
                <span className="flex-1 text-left font-medium text-slate-700">{label}</span>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-4 py-4 text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">ログアウト</span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Connectly v1.0.0 · Made with 💙 in Japan
        </p>
      </div>
    </div>
  )
}
