import { z } from "zod"

// Length limits are counted in grapheme clusters (what a person perceives as one character),
// so emoji sequences and combining marks count once. Text is never NFKC-normalised: full-width
// and half-width characters are stored exactly as typed.
export const LIMITS = {
  caption: 2200,
  comment: 1000,
  bio: 160,
  displayName: 30,
  dm: 2000,
  altText: 200,
  reportDetail: 1000,
  communityName: 40,
  communityDescription: 240,
} as const

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter("ja", { granularity: "grapheme" })
  : null

export function graphemeLength(value: string): number {
  if (!segmenter) return Array.from(value).length
  return Array.from(segmenter.segment(value)).length
}

// Strip ASCII/C1 control characters except tab and newline; normalise CRLF. Plain text only.
export function cleanPlainText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
}

export function plainText(max: number, opts: { min?: number; label?: string } = {}) {
  const min = opts.min ?? 0
  return z
    .string()
    .transform(value => cleanPlainText(value))
    .refine(value => graphemeLength(value.trim()) >= min, { message: min > 0 ? "入力してください" : "" })
    .refine(value => graphemeLength(value) <= max, { message: `${max}文字以内で入力してください` })
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export const httpUrl = z
  .string()
  .trim()
  .max(300, "URLが長すぎます")
  .refine(isHttpUrl, { message: "http:// または https:// から始まるURLを入力してください" })

export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/
export const username = z
  .string()
  .trim()
  .regex(USERNAME_PATTERN, "ユーザー名は半角英小文字・数字・_ で3〜30文字にしてください")

export const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "IDが正しくありません")
