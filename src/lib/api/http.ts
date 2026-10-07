import { NextResponse } from "next/server"
import { ZodError, type ZodType } from "zod"
import { ApiError, Errors, type FieldErrors } from "./errors"

const NO_STORE = { "Cache-Control": "private, no-store" }

export function ok<T>(data: T, extra: { nextCursor?: string | null; status?: number; headers?: Record<string, string> } = {}) {
  const body: { data: T; nextCursor?: string | null } = { data }
  if (extra.nextCursor !== undefined) body.nextCursor = extra.nextCursor
  return NextResponse.json(body, { status: extra.status ?? 200, headers: { ...NO_STORE, ...extra.headers } })
}

export function errorResponse(error: ApiError) {
  const headers: Record<string, string> = { ...NO_STORE }
  if (error.retryAfter) headers["Retry-After"] = String(error.retryAfter)
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}),
      },
    },
    { status: error.status, headers },
  )
}

export function zodFieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_"
    ;(out[key] ||= []).push(issue.message)
  }
  return out
}

function isPrismaKnownError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string"
    && (error as { code: string }).code.startsWith("P")
}

/** Wrap a route handler so every failure is mapped to the error contract and nothing internal leaks. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error)
      if (error instanceof ZodError) return errorResponse(Errors.invalid("入力内容を確認してください", zodFieldErrors(error)))
      if (isPrismaKnownError(error) && error.code === "P2002") {
        return errorResponse(Errors.conflict("同じ内容がすでに登録されています"))
      }
      if (isPrismaKnownError(error) && error.code === "P2025") return errorResponse(Errors.notFound())
      // Log only the error class/message — never request bodies (may contain DMs, passwords, tokens).
      console.error("[api] unhandled error:", error instanceof Error ? `${error.name}: ${error.message}` : "unknown")
      return errorResponse(new ApiError(500, "INTERNAL", "サーバーで問題が発生しました。時間をおいてお試しください"))
    }
  }
}

export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const length = Number(request.headers.get("content-length") || 0)
  if (length > maxBytes) throw Errors.tooLarge("送信データが大きすぎます")
  const text = await request.text()
  if (text.length > maxBytes) throw Errors.tooLarge("送信データが大きすぎます")
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw Errors.invalid("JSONの形式が正しくありません")
  }
}

export async function parseBody<T>(request: Request, schema: ZodType<T>, maxBytes?: number): Promise<T> {
  const body = await readJson(request, maxBytes)
  const result = schema.safeParse(body)
  if (!result.success) throw Errors.invalid("入力内容を確認してください", zodFieldErrors(result.error))
  return result.data
}

export function parseQuery<T>(url: string | URL, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(url).searchParams.entries())
  const result = schema.safeParse(params)
  if (!result.success) throw Errors.invalid("クエリが正しくありません", zodFieldErrors(result.error))
  return result.data
}
