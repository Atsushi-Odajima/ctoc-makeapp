"use client"

export class ApiClientError extends Error {
  status: number
  code: string
  fieldErrors?: Record<string, string[]>
  retryAfter?: number
  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>, retryAfter?: number) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
  }
}

export interface ApiResult<T> {
  data: T
  nextCursor?: string | null
}

/** fetch wrapper for the {data,nextCursor} / {error} contract. Never cached by the browser. */
export async function api<T>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string; signal?: AbortSignal } = {}): Promise<ApiResult<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
      signal: init.signal,
    })
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error
    throw new ApiClientError(0, "NETWORK", "接続できませんでした。通信状態を確認して再試行してください")
  }
  const text = await response.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  if (!response.ok) {
    const err = (json as { error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]>; retryAfter?: number } } | null)?.error
    throw new ApiClientError(response.status, err?.code ?? "HTTP_" + response.status, friendlyMessage(response.status, err?.message, err?.retryAfter), err?.fieldErrors, err?.retryAfter)
  }
  return json as ApiResult<T>
}

function friendlyMessage(status: number, message: string | undefined, retryAfter?: number) {
  if (status === 401) return "ログインが必要です。もう一度ログインしてください"
  if (status === 404) return message || "見つからないか、表示できません"
  if (status === 429) {
    const at = new Date(Date.now() + (retryAfter ?? 60) * 1000)
    return `短時間に操作が集中しました。${at.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}ごろに再開できます`
  }
  return message || "うまくいきませんでした。時間をおいて再試行してください"
}

export function newClientId(prefix = "c"): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}_${random}`.slice(0, 60)
}

export function loginRedirect() {
  if (typeof window === "undefined") return
  const back = window.location.pathname + window.location.search
  window.location.href = `/login?callbackUrl=${encodeURIComponent(back)}`
}
