// npm run db:report-duplicates
// Lists legacy conversations that did not receive a pairKey (duplicates of the same pair, or
// rows with != 2 participants). Read-only: deciding how to merge them is a human decision.
import "./lib/load-env.cjs"
import { PrismaClient } from "@prisma/client"

async function main() {
  const prisma = new PrismaClient()
  const rows = await prisma.$queryRaw<Array<{ id: string; participants: string; messages: bigint; createdAt: Date }>>`
    SELECT c.id, string_agg(p."userId", ',' ORDER BY p."userId") AS participants,
           (SELECT COUNT(*) FROM "DirectMessage" m WHERE m."conversationId" = c.id)::bigint AS messages, c."createdAt"
    FROM "Conversation" c LEFT JOIN "ConversationParticipant" p ON p."conversationId" = c.id
    WHERE c."pairKey" IS NULL
    GROUP BY c.id ORDER BY c."createdAt"`
  console.log(rows.length ? JSON.stringify(rows.map(r => ({ ...r, messages: Number(r.messages) })), null, 2) : "No conversations without pairKey.")
  await prisma.$disconnect()
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
