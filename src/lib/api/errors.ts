// Error contract (spec §6): { error: { code, message, fieldErrors?, retryAfter? } }
// 401 unauthenticated, 404 missing OR not viewable, 403 not allowed, 409 conflict,
// 413 too large, 422 invalid input, 429 rate limited, 503 external dependency unavailable.

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: FieldErrors
  readonly retryAfter?: number

  constructor(status: number, code: string, message: string, extra: { fieldErrors?: FieldErrors; retryAfter?: number } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = extra.fieldErrors
    this.retryAfter = extra.retryAfter
  }
}

export const Errors = {
  unauthenticated: () => new ApiError(401, "UNAUTHENTICATED", "ログインしてください"),
  notFound: (message = "見つからないか、表示できません") => new ApiError(404, "NOT_FOUND", message),
  forbidden: (message = "この操作はできません", code = "FORBIDDEN") => new ApiError(403, code, message),
  conflict: (message: string, code = "CONFLICT") => new ApiError(409, code, message),
  tooLarge: (message: string) => new ApiError(413, "PAYLOAD_TOO_LARGE", message),
  invalid: (message: string, fieldErrors?: FieldErrors, code = "INVALID_INPUT") => new ApiError(422, code, message, { fieldErrors }),
  rateLimited: (retryAfter: number) =>
    new ApiError(429, "RATE_LIMITED", "短時間に操作が集中しました。しばらくしてからお試しください", { retryAfter }),
  unavailable: (message: string, code = "SERVICE_UNAVAILABLE") => new ApiError(503, code, message),
  profileRequired: () =>
    new ApiError(403, "PROFILE_REQUIRED", "投稿・コメント・DMの前に、イキリポイント・残念な弱点・趣味3つを設定してください"),
}
