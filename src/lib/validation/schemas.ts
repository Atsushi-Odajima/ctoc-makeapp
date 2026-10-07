import { z } from "zod"
import { LIMITS, httpUrl, id, plainText, username } from "./text"

export const introductionSchema = z.object({
  strengthOptionId: id,
  weaknessOptionId: id,
  hobbyOptionIds: z.array(id).length(3, "趣味はちょうど3つ選んでください"),
}).strict()

// Only these fields can ever be changed through PATCH /api/profile. Unknown keys
// (onboardingDone, role, status, email, ...) are rejected with 422.
export const profilePatchSchema = z.object({
  name: plainText(LIMITS.displayName, { min: 1 }).optional(),
  bio: plainText(LIMITS.bio).nullable().optional(),
  website: z.union([httpUrl, z.literal(""), z.null()]).optional(),
  avatarMediaId: id.nullable().optional(),
  isPrivate: z.boolean().optional(),
  dmPolicy: z.enum(["MUTUAL_OR_REQUEST", "CLOSED"]).optional(),
  footprintOptIn: z.boolean().optional(),
}).strict()

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません").max(254),
  password: z.string().min(8, "パスワードは8文字以上にしてください").max(200),
  name: plainText(LIMITS.displayName, { min: 1 }),
  username: username.optional().or(z.literal("")),
}).strict()

export const createPostSchema = z.object({
  caption: plainText(LIMITS.caption).optional().default(""),
  mediaIds: z.array(id).max(5).optional().default([]),
  altTexts: z.record(z.string(), plainText(LIMITS.altText)).optional().default({}),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "COMMUNITY"]).optional().default("PUBLIC"),
  communitySlug: z.string().min(1).max(80).optional(),
  publish: z.boolean().optional().default(true),
  confirmPublicCommunity: z.boolean().optional().default(false),
  location: plainText(80).optional(),
}).strict()

export const editPostSchema = z.object({
  revision: z.number().int().min(0),
  caption: plainText(LIMITS.caption).optional(),
  altTexts: z.record(z.string(), plainText(LIMITS.altText)).optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS"]).optional(),
  confirmVisibilityExpansion: z.boolean().optional().default(false),
}).strict()

export const publishPostSchema = z.object({ revision: z.number().int().min(0) }).strict()

export const commentSchema = z.object({
  content: plainText(LIMITS.comment, { min: 1 }),
  parentId: id.optional().nullable(),
}).strict()

export const dmStartSchema = z.object({
  targetUserId: id,
}).strict()

export const dmSendSchema = z.object({
  content: plainText(LIMITS.dm, { min: 1 }),
  clientMessageId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "clientMessageIdが正しくありません"),
}).strict()

export const reportSchema = z.object({
  targetType: z.enum(["POST", "COMMENT", "USER", "MESSAGE"]),
  targetId: id,
  reasonCode: z.enum(["spam", "harassment", "hate", "sexual", "violence", "self_harm", "privacy", "impersonation", "other"]),
  detail: plainText(LIMITS.reportDetail).optional(),
}).strict()

export const moderationActionSchema = z.object({
  reportId: id.optional(),
  targetType: z.enum(["POST", "COMMENT", "USER", "MESSAGE"]),
  targetId: id,
  action: z.enum(["hide", "restore", "suspend_user", "unsuspend_user", "dismiss", "review"]),
  reason: plainText(500, { min: 1 }),
}).strict()

export const communityCreateSchema = z.object({
  name: plainText(LIMITS.communityName, { min: 2 }),
  description: plainText(LIMITS.communityDescription, { min: 5 }),
  category: plainText(24).optional().default("その他"),
  isPrivate: z.boolean().optional().default(false),
}).strict()

export const communityPatchSchema = z.object({
  name: plainText(LIMITS.communityName, { min: 2 }).optional(),
  description: plainText(LIMITS.communityDescription, { min: 5 }).optional(),
  category: plainText(24).optional(),
  isPrivate: z.boolean().optional(),
}).strict()

export const membershipPatchSchema = z.object({ showOnProfile: z.boolean() }).strict()

export const mediaSignSchema = z.object({
  kind: z.enum(["IMAGE", "VIDEO"]),
  mimeType: z.string().max(100),
  bytes: z.number().int().positive(),
  purpose: z.enum(["POST", "AVATAR"]).optional().default("POST"),
}).strict()

export const mediaCompleteSchema = z.object({
  mediaId: id,
  result: z.unknown().optional(),
}).strict()

export const footprintSchema = z.object({ username: z.string().min(1).max(64) }).strict()

export const notificationsReadSchema = z.object({
  ids: z.array(id).max(200).optional(),
  all: z.boolean().optional(),
}).strict()

export const accountDeleteSchema = z.object({
  password: z.string().max(200).optional(),
  confirm: z.literal("退会する", { message: "確認のため「退会する」と入力してください" }),
}).strict()
