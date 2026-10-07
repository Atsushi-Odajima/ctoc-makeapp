"use client"

import { api } from "@/lib/client/api"
import type { MediaDTO } from "@/lib/media/delivery"

export interface SignResponse {
  mediaId: string
  expiresAt: string
  maxBytes: number
  upload: { url: string; method: "POST" | "PUT"; fields?: Record<string, string>; headers?: Record<string, string>; fileField?: string }
}

/** Upload straight to the provider (never through our API for Cloudinary), with real progress. */
export function uploadFile(sign: SignResponse, file: File, onProgress: (ratio: number) => void): { promise: Promise<unknown>; abort: () => void } {
  const xhr = new XMLHttpRequest()
  const promise = new Promise<unknown>((resolve, reject) => {
    xhr.open(sign.upload.method, sign.upload.url)
    for (const [k, v] of Object.entries(sign.upload.headers ?? {})) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {}) } catch { resolve({}) }
      } else reject(new Error(xhr.status === 413 ? "ファイルが大きすぎます" : "アップロードに失敗しました"))
    }
    xhr.onerror = () => reject(new Error("通信が切れました。もう一度お試しください"))
    xhr.onabort = () => reject(Object.assign(new Error("取り消しました"), { name: "AbortError" }))
    if (sign.upload.method === "POST") {
      const form = new FormData()
      for (const [k, v] of Object.entries(sign.upload.fields ?? {})) form.append(k, v)
      form.append(sign.upload.fileField ?? "file", file)
      xhr.send(form)
    } else {
      xhr.send(file)
    }
  })
  return { promise, abort: () => xhr.abort() }
}

export async function signUpload(kind: "IMAGE" | "VIDEO", file: File, purpose: "POST" | "AVATAR" = "POST") {
  return (await api<SignResponse>("/api/media/sign", { method: "POST", body: { kind, mimeType: normalizeMime(file), bytes: file.size, purpose } })).data
}

export async function completeUpload(mediaId: string, result: unknown) {
  return (await api<MediaDTO>("/api/media/complete", { method: "POST", body: { mediaId, result } })).data
}

/** iOS sometimes reports HEIC/MOV with empty or odd MIME types; map by extension for the
 * *request* only — the server and provider still verify the real content. */
export function normalizeMime(file: File): string {
  if (file.type) return file.type.toLowerCase()
  const ext = file.name.split(".").pop()?.toLowerCase()
  return ({ heic: "image/heic", heif: "image/heif", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mov: "video/quicktime", mp4: "video/mp4" } as Record<string, string>)[ext ?? ""] ?? "application/octet-stream"
}

export function videoDurationMs(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const v = document.createElement("video")
    v.preload = "metadata"
    v.muted = true
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) ? Math.round(v.duration * 1000) : null) }
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    v.src = url
  })
}
