"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Edit3, Settings, LogOut, MapPin, Calendar, Loader2, Heart } from "lucide-react"
import { calculateAge, parsePhotos } from "@/lib/utils"
import type { UserProfile } from "@/types"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoIndex, setPhotoIndex] = useState(0)

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const photos = parsePhotos(profile.photos)
  const age = profile.birthdate ? calculateAge(profile.birthdate) : null

  return (
    <div className="h-full overflow-y-auto bg-[#f0f4ff]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-[#f0f4ff]">
        <h1 className="text-2xl font-bold text-slate-800">プロフィール</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/profile/edit")}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
          >
            <Edit3 className="w-5 h-5 text-blue-600" />
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
          >
            <Settings className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="mx-4 mb-4 bg-white rounded-3xl overflow-hidden shadow-sm">
        {/* Photos */}
        <div className="relative aspect-[4/5]">
          {photos.length > 0 ? (
            <img
              src={photos[photoIndex]}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-3">📸</div>
                <p className="text-slate-400 text-sm">写真を追加</p>
              </div>
            </div>
          )}

          {/* Photo dots */}
          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 px-4">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={cn(
                    "flex-1 h-1 rounded-full max-w-12 transition-all",
                    i === photoIndex ? "bg-white" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-white font-bold text-3xl">
              {profile.name}{age ? `, ${age}` : ""}
            </h2>
            {profile.location && (
              <div className="flex items-center gap-1 text-white/80 mt-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{profile.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-5 space-y-4">
          {profile.bio && (
            <div>
              <p className="text-slate-600 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {profile.birthdate && (
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <Calendar className="w-4 h-4" />
                {age}歳
              </div>
            )}
            {profile.gender && (
              <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                {profile.gender === "male" ? "👨 男性" : profile.gender === "female" ? "👩 女性" : "🌈 その他"}
              </div>
            )}
          </div>

          {profile.interests && profile.interests.length > 0 && (
            <div>
              <p className="text-slate-500 text-sm font-medium mb-2">趣味・興味</p>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map(interest => (
                  <span
                    key={interest.id}
                    className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-sm"
                  >
                    {interest.emoji || ""}
                    {interest.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Button */}
      <div className="mx-4 mb-4">
        <button
          onClick={() => router.push("/profile/edit")}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-200 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Edit3 className="w-5 h-5" />
          プロフィールを編集
        </button>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">アクティビティ</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Heart, label: "マッチング", value: "—" },
            { icon: Heart, label: "いいね", value: "—" },
            { icon: Heart, label: "訪問者", value: "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-blue-600">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="mx-4 mb-8">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-red-400 font-medium rounded-2xl border border-red-100 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          ログアウト
        </button>
      </div>
    </div>
  )
}
