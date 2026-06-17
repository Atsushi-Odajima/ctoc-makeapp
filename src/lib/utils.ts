import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffSecs = Math.floor((now.getTime() - past.getTime()) / 1000)
  if (diffSecs < 60) return "今"
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}分前`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}時間前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}日前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`
  return `${Math.floor(diffDays / 365)}年前`
}

export function formatMessageTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "昨日"
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
}

export function parseImages(images: string | string[]): string[] {
  if (Array.isArray(images)) return images
  try {
    const p = JSON.parse(images)
    return Array.isArray(p) ? p : []
  } catch {
    return images ? [images] : []
  }
}

export function getAvatarUrl(user: { avatar?: string | null; name: string; username?: string }): string {
  if (user.avatar) return user.avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff&rounded=true&size=150`
}

export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export function generateUsername(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Math.floor(Math.random() * 1000)
}
