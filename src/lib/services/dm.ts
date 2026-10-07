import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { Errors } from "@/lib/api/errors"
import type { Viewer } from "@/lib/api/viewer"
import { decodeCursor, encodeCursor } from "@/lib/api/pagination"
import { canMessage, loadConversationForParticipant, pairKeyFor, type ConversationForViewer } from "@/lib/policies/messaging"
import { isBlockedEitherWay, isMutual } from "@/lib/policies/relationships"
import { toUserSummary, userSummarySelect, type UserSummary } from "@/lib/dto/user"
import { deliveryProvider } from "@/lib/media/delivery"
import { enforce } from "@/lib/rate-limit"
import { notify } from "./notifications"

export interface MessageDTO {
  id: string
  conversationId: string
  senderId: string
  content: string | null
  deleted: boolean
  createdAt: string
  readAt: string | null
  clientMessageId?: string | null
}

const messageSelect = { id: true, conversationId: true, senderId: true, content: true, deletedAt: true, createdAt: true, readAt: true, clientMessageId: true } as const
type MessageRow = Prisma.DirectMessageGetPayload<{ select: typeof messageSelect }>

export function toMessageDTO(row: MessageRow, viewerId: string): MessageDTO {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    content: row.deletedAt ? null : row.content,
    deleted: !!row.deletedAt,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    ...(row.senderId === viewerId ? { clientMessageId: row.clientMessageId } : {}),
  }
}

export async function listConversations(viewer: Viewer, box: "inbox" | "requests") {
  const blocked = (await prisma.block.findMany({ where: { OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }] }, select: { blockerId: true, blockedId: true } }))
    .map(b => (b.blockerId === viewer.id ? b.blockedId : b.blockerId))
  const where: Prisma.ConversationWhereInput = box === "requests"
    ? { participants: { some: { userId: viewer.id } }, state: "REQUESTED", initiatorId: { not: viewer.id, notIn: blocked } }
    : {
      participants: { some: { userId: viewer.id } },
      OR: [{ state: "ACCEPTED" }, { state: { in: ["REQUESTED", "DECLINED"] }, initiatorId: viewer.id }],
    }
  const rows = await prisma.conversation.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true, state: true, initiatorId: true, updatedAt: true,
      participants: { select: { userId: true, lastReadAt: true, user: { select: userSummarySelect } } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: messageSelect },
    },
  })
  const provider = await deliveryProvider()
  return Promise.all(rows.map(async row => {
    const me = row.participants.find(p => p.userId === viewer.id)
    const other = row.participants.find(p => p.userId !== viewer.id)
    const unreadCount = await prisma.directMessage.count({
      where: { conversationId: row.id, senderId: { not: viewer.id }, deletedAt: null, ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}) },
    })
    return {
      id: row.id,
      state: row.state,
      isInitiator: row.initiatorId === viewer.id,
      otherUser: other ? toUserSummary(other.user, provider) : null,
      lastMessage: row.messages[0] ? toMessageDTO(row.messages[0], viewer.id) : null,
      unreadCount,
      blocked: other ? blocked.includes(other.userId) : false,
      updatedAt: row.updatedAt.toISOString(),
    }
  }))
}

/** Start (or find) the 1:1 conversation with target. Requires a complete profile. */
export async function startConversation(viewer: Viewer, targetUserId: string) {
  if (viewer.id === targetUserId) throw Errors.invalid("自分にはメッセージを送れません")
  const target = await prisma.user.findFirst({ where: { id: targetUserId, status: "ACTIVE" }, select: { id: true, dmPolicy: true } })
  if (!target) throw Errors.notFound()
  if (await isBlockedEitherWay(viewer.id, target.id)) throw Errors.forbidden("この相手にはメッセージを送れません", "BLOCKED")
  const pairKey = pairKeyFor(viewer.id, target.id)
  const existing = await prisma.conversation.findUnique({ where: { pairKey }, select: { id: true } })
  if (existing) return { id: existing.id, created: false }
  if (target.dmPolicy === "CLOSED") throw Errors.forbidden("この相手は新しいメッセージを受け付けていません", "DM_CLOSED")

  const mutual = await isMutual(viewer.id, target.id)
  await enforce("dmNewPeer", viewer.id)
  try {
    const conversation = await prisma.conversation.create({
      data: {
        pairKey,
        state: mutual ? "ACCEPTED" : "REQUESTED",
        initiatorId: viewer.id,
        participants: { create: [{ userId: viewer.id }, { userId: target.id }] },
      },
      select: { id: true },
    })
    return { id: conversation.id, created: true }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.conversation.findUniqueOrThrow({ where: { pairKey }, select: { id: true } })
      return { id: row.id, created: false }
    }
    throw error
  }
}

export async function conversationDetail(viewer: Viewer, conversationId: string, opts: { after?: string | null; before?: string | null; limit: number }) {
  const conversation = await loadConversationForParticipant(conversationId, viewer.id)
  const otherRow = conversation.otherUserId
    ? await prisma.user.findUnique({ where: { id: conversation.otherUserId }, select: userSummarySelect })
    : null
  const provider = await deliveryProvider()
  const decision = await canMessage(conversation, viewer.id)

  let messages: MessageRow[]
  let olderCursor: string | null = null
  const after = decodeCursor(opts.after)
  if (after) {
    // Incremental polling: everything newer than the last message the client has.
    messages = await prisma.directMessage.findMany({
      where: { conversationId: conversation.id, OR: [{ createdAt: { gt: after.t } }, { createdAt: after.t, id: { gt: after.id } }] },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 200,
      select: messageSelect,
    })
  } else {
    const before = decodeCursor(opts.before)
    const rows = await prisma.directMessage.findMany({
      where: { conversationId: conversation.id, ...(before ? { OR: [{ createdAt: { lt: before.t } }, { createdAt: before.t, id: { lt: before.id } }] } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      select: messageSelect,
    })
    const hasMore = rows.length > opts.limit
    messages = (hasMore ? rows.slice(0, opts.limit) : rows).reverse()
    olderCursor = hasMore && messages[0] ? encodeCursor({ t: messages[0].createdAt, id: messages[0].id }) : null
  }
  return {
    conversation: {
      id: conversation.id,
      state: conversation.state,
      isInitiator: conversation.initiatorId === viewer.id,
      otherUser: otherRow ? toUserSummary(otherRow, provider) : (null as UserSummary | null),
      canSend: decision.ok,
      cannotSendReason: decision.ok ? null : decision.message,
    },
    messages: messages.map(m => toMessageDTO(m, viewer.id)),
    olderCursor,
  }
}

/**
 * Send with an idempotent clientMessageId: the same (sender, clientMessageId) returns the
 * first stored message; reusing it with different content/conversation is a 409.
 */
export async function sendMessage(viewer: Viewer, conversationId: string, input: { content: string; clientMessageId: string }) {
  const conversation: ConversationForViewer = await loadConversationForParticipant(conversationId, viewer.id)
  const existing = await prisma.directMessage.findUnique({
    where: { senderId_clientMessageId: { senderId: viewer.id, clientMessageId: input.clientMessageId } },
    select: messageSelect,
  })
  if (existing) {
    if (existing.conversationId !== conversation.id || existing.content !== input.content) {
      throw Errors.conflict("同じ送信IDが別の内容で使われています", "CLIENT_MESSAGE_ID_REUSED")
    }
    return { message: toMessageDTO(existing, viewer.id), replayed: true }
  }
  const decision = await canMessage(conversation, viewer.id)
  if (!decision.ok) {
    throw decision.status === 409 ? Errors.conflict(decision.message, decision.code) : Errors.forbidden(decision.message, decision.code)
  }
  await enforce("dmMessage", viewer.id)
  let row: MessageRow
  try {
    row = await prisma.$transaction(async tx => {
      const created = await tx.directMessage.create({
        data: { conversationId: conversation.id, senderId: viewer.id, content: input.content, clientMessageId: input.clientMessageId },
        select: messageSelect,
      })
      await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: conversation.id, userId: viewer.id } },
        data: { lastReadAt: created.createdAt },
      })
      return created
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return sendMessage(viewer, conversationId, input) // concurrent retry with the same id
    }
    throw error
  }
  if (conversation.state === "REQUESTED" && conversation.otherUserId) {
    await notify({ userId: conversation.otherUserId, type: "dm_request", fromUserId: viewer.id }).catch(() => undefined)
  }
  return { message: toMessageDTO(row, viewer.id), replayed: false }
}

export async function answerConversation(viewer: Viewer, conversationId: string, accept: boolean) {
  const conversation = await loadConversationForParticipant(conversationId, viewer.id)
  if (conversation.state !== "REQUESTED" || conversation.initiatorId === viewer.id) {
    throw Errors.conflict("承認待ちのリクエストではありません", "NOT_A_REQUEST")
  }
  await prisma.conversation.update({ where: { id: conversation.id }, data: { state: accept ? "ACCEPTED" : "DECLINED" } })
  return { id: conversation.id, state: accept ? "ACCEPTED" : "DECLINED" }
}

export async function markRead(viewer: Viewer, conversationId: string) {
  const conversation = await loadConversationForParticipant(conversationId, viewer.id)
  const now = new Date()
  // Reading a pending request does not tell the sender it was seen.
  if (conversation.state !== "ACCEPTED") return { readAt: null }
  await prisma.$transaction([
    prisma.directMessage.updateMany({ where: { conversationId: conversation.id, senderId: { not: viewer.id }, readAt: null }, data: { readAt: now } }),
    prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId: conversation.id, userId: viewer.id } }, data: { lastReadAt: now } }),
  ])
  return { readAt: now.toISOString() }
}
