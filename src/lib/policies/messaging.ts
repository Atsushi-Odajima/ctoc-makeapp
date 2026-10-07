import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import { isBlockedEitherWay } from "./relationships"

/** Canonical identifier of a 1:1 conversation: the two user ids sorted and joined with ':'. */
export function pairKeyFor(a: string, b: string): string {
  if (!a || !b || a === b) throw new Error("pairKey needs two different users")
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

export interface ConversationForViewer {
  id: string
  state: "REQUESTED" | "ACCEPTED" | "DECLINED"
  initiatorId: string | null
  otherUserId: string | null
}

/**
 * Every DM operation starts here. A non-participant gets 404 (the conversation's existence is
 * not revealed), so messages can never be read or written by someone outside the pair.
 */
export async function loadConversationForParticipant(conversationId: string, viewerId: string): Promise<ConversationForViewer> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId: viewerId } } },
    select: { id: true, state: true, initiatorId: true, participants: { select: { userId: true } } },
  })
  if (!conversation) throw Errors.notFound()
  const other = conversation.participants.find(p => p.userId !== viewerId)
  return { id: conversation.id, state: conversation.state, initiatorId: conversation.initiatorId, otherUserId: other?.userId ?? null }
}

export type SendDecision =
  | { ok: true }
  | { ok: false; status: 403 | 409; code: string; message: string }

/** canMessage (pure part): given conversation state, decide whether the viewer may send now. */
export function canSendPure(input: {
  viewerId: string
  state: "REQUESTED" | "ACCEPTED" | "DECLINED"
  initiatorId: string | null
  otherUserActive: boolean
  blocked: boolean
  viewerMessagesInRequest: number
}): SendDecision {
  if (!input.otherUserActive) return { ok: false, status: 403, code: "RECIPIENT_UNAVAILABLE", message: "この相手にはメッセージを送れません" }
  if (input.blocked) return { ok: false, status: 403, code: "BLOCKED", message: "この相手にはメッセージを送れません" }
  if (input.state === "DECLINED") return { ok: false, status: 403, code: "REQUEST_DECLINED", message: "このメッセージリクエストは受け付けられませんでした" }
  if (input.state === "REQUESTED") {
    if (input.initiatorId !== input.viewerId) {
      return { ok: false, status: 409, code: "REQUEST_PENDING", message: "リクエストを承認すると返信できます" }
    }
    if (input.viewerMessagesInRequest >= 1) {
      return { ok: false, status: 409, code: "REQUEST_LIMIT", message: "相手が承認するまで、追加のメッセージは送れません" }
    }
  }
  return { ok: true }
}

export async function canMessage(conversation: ConversationForViewer, viewerId: string): Promise<SendDecision> {
  const other = conversation.otherUserId
    ? await prisma.user.findUnique({ where: { id: conversation.otherUserId }, select: { status: true } })
    : null
  const blocked = conversation.otherUserId ? await isBlockedEitherWay(viewerId, conversation.otherUserId) : false
  const viewerMessagesInRequest = conversation.state === "REQUESTED"
    ? await prisma.directMessage.count({ where: { conversationId: conversation.id, senderId: viewerId } })
    : 0
  return canSendPure({
    viewerId,
    state: conversation.state,
    initiatorId: conversation.initiatorId,
    otherUserActive: other?.status === "ACTIVE",
    blocked,
    viewerMessagesInRequest,
  })
}
