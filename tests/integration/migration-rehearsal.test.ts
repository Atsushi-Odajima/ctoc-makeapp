import { afterAll, describe, expect, it } from "vitest"
import { execSync } from "node:child_process"
import { mkdtempSync, readFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { prisma as testPrisma } from "@/lib/db"
import { copySqliteToPostgres } from "../../scripts/lib/sqlite-copy"

// Rehearses MIGRATION_RUNBOOK.txt against throwaway databases on the local test server.
const created: string[] = []
const base = new URL(process.env.DATABASE_URL!)

async function freshDb(tag: string) {
  const name = `daynet_rehearsal_${tag}_${Date.now()}`
  await testPrisma.$executeRawUnsafe(`CREATE DATABASE ${name}`)
  created.push(name)
  const url = new URL(base.toString())
  url.pathname = `/${name}`
  return url.toString()
}

function cli(cmd: string, url: string) {
  return execSync(cmd, { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "pipe" }).toString()
}

afterAll(async () => {
  for (const name of created) await testPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
})

const LEGACY_TABLES = ["User", "Post", "Like", "Comment", "Follow", "Story", "Footprint", "Notification", "Conversation", "ConversationParticipant", "DirectMessage", "Account", "Session"]

async function snapshot(db: PrismaClient, tables: string[]) {
  const out: Record<string, string[]> = {}
  for (const t of tables) {
    const key = t === "Like" ? `"userId"||':'||"postId"` : t === "Follow" ? `"followerId"||':'||"followingId"` : t === "ConversationParticipant" ? `"conversationId"||':'||"userId"` : t === "CommunityMember" ? `"communityId"||':'||"userId"` : `"id"`
    out[t] = (await db.$queryRawUnsafe<Array<{ k: string }>>(`SELECT ${key} AS k FROM "${t}" ORDER BY 1`)).map(r => r.k)
  }
  return out
}

async function seedLegacy(db: PrismaClient, opts: { withCommunities: boolean }) {
  const exec = (sql: string) => db.$executeRawUnsafe(sql)
  await exec(`INSERT INTO "User" (id,email,password,name,username,"isPrivate","onboardingDone","updatedAt") VALUES
    ('u1','a@example.test','$2b$12$x','あきら','akira',false,true,now()),
    ('u2','b@example.test','','ぶん','bun_1234',true,false,now()),
    ('u3','c@example.test','$2b$12$y','ちえ','chie',false,true,now())`)
  await exec(`INSERT INTO "Account" (id,"userId",type,provider,"providerAccountId",access_token) VALUES ('acc1','u2','oauth','google','g-1','tok')`)
  await exec(`INSERT INTO "Session" (id,"sessionToken","userId",expires) VALUES ('s1','st1','u1',now() + interval '1 day')`)
  await exec(`INSERT INTO "Post" (id,"userId",caption,images,"createdAt","updatedAt") VALUES
    ('p1','u1','写真','["https://res.cloudinary.com/demo/image/upload/v1/feeld/a.jpg","https://images.unsplash.com/x.jpg"]',now() - interval '2 day',now()),
    ('p2','u2','日記','[]',now() - interval '1 day',now()),
    ('p3','u3','壊れた画像JSON','not-json',now(),now())`)
  await exec(`INSERT INTO "Like" ("userId","postId") VALUES ('u2','p1'),('u3','p1')`)
  await exec(`INSERT INTO "Comment" (id,"postId","userId",content) VALUES ('c1','p1','u2','いいね')`)
  await exec(`INSERT INTO "Comment" (id,"postId","userId",content,"parentId") VALUES ('c2','p1','u1','ありがとう','c1')`)
  await exec(`INSERT INTO "Follow" ("followerId","followingId") VALUES ('u1','u2'),('u2','u1'),('u3','u1')`)
  await exec(`INSERT INTO "Story" (id,"userId","imageUrl","expiresAt") VALUES ('st1','u1','https://example.test/s.jpg',now() + interval '1 day')`)
  await exec(`INSERT INTO "Footprint" (id,"visitorId","visitedId") VALUES ('f1','u2','u1'),('f2','u2','u1')`)
  await exec(`INSERT INTO "Notification" (id,"userId",type,"fromUserId","postId") VALUES ('n1','u1','like','u2','p1')`)
  // Two conversations for the same pair (possible with the old participants.every lookup).
  await exec(`INSERT INTO "Conversation" (id,"createdAt","updatedAt") VALUES ('cv1',now() - interval '3 day',now()),('cv2',now(),now())`)
  await exec(`INSERT INTO "ConversationParticipant" ("conversationId","userId") VALUES ('cv1','u1'),('cv1','u2'),('cv2','u2'),('cv2','u1')`)
  await exec(`INSERT INTO "DirectMessage" (id,"conversationId","senderId",content) VALUES ('m1','cv1','u1','こんにちは'),('m2','cv2','u2','やあ')`)
  if (opts.withCommunities) {
    await exec(`INSERT INTO "Community" (id,slug,name,description,category,"ownerId","updatedAt") VALUES ('cm1','walk','散歩','説明','おでかけ','u1',now())`)
    await exec(`INSERT INTO "CommunityMember" ("communityId","userId",role) VALUES ('cm1','u1','owner'),('cm1','u3','member')`)
    await exec(`UPDATE "Post" SET "communityId"='cm1' WHERE id='p2'`)
  }
}

async function assertMigrated(db: PrismaClient, before: Record<string, string[]>, opts: { withCommunities: boolean }) {
  expect(await snapshot(db, Object.keys(before))).toEqual(before) // nothing lost, nothing invented
  const posts = await db.post.findMany({ orderBy: { id: "asc" } })
  expect(posts.every(p => p.status === "PUBLISHED" && p.publishedAt?.getTime() === p.createdAt.getTime())).toBe(true)
  expect(posts.find(p => p.id === "p1")!.kind).toBe("PHOTO")
  expect(posts.find(p => p.id === "p3")!.kind).toBe("NOTE") // invalid JSON tolerated
  const media = await db.media.findMany({ where: { postId: "p1" }, orderBy: { sortOrder: "asc" } })
  expect(media.map(m => [m.provider, m.legacyUrl, m.status, m.ownerId])).toEqual([
    ["legacy-url", "https://res.cloudinary.com/demo/image/upload/v1/feeld/a.jpg", "READY", "u1"],
    ["legacy-url", "https://images.unsplash.com/x.jpg", "READY", "u1"],
  ])
  const convs = await db.conversation.findMany({ orderBy: { createdAt: "asc" } })
  expect(convs.map(c => c.pairKey)).toEqual(["u1:u2", null]) // oldest wins, duplicate kept for review
  expect(convs.every(c => c.state === "ACCEPTED")).toBe(true)
  expect((await db.follow.findMany()).every(f => f.status === "ACCEPTED" && f.acceptedAt)).toBe(true)
  const users = await db.user.findMany({ orderBy: { id: "asc" } })
  expect(users.map(u => [u.profileVersion, u.role, u.status, u.footprintOptIn])).toEqual([[0, "USER", "ACTIVE", false], [0, "USER", "ACTIVE", false], [0, "USER", "ACTIVE", false]])
  expect((await db.footprint.findMany()).every(f => f.visitDay === null)).toBe(true)
  if (opts.withCommunities) {
    const members = await db.communityMember.findMany({ orderBy: { userId: "asc" } })
    expect(members.map(m => [m.userId, m.role, m.status])).toEqual([["u1", "OWNER", "ACTIVE"], ["u3", "MEMBER", "ACTIVE"]])
    expect(posts.find(p => p.id === "p2")!.visibility).toBe("COMMUNITY")
  }
}

describe("migration rehearsal", () => {
  it("existing Neon database created by `prisma db push` (2026-06 schema) → baseline + v4 without data loss", async () => {
    const url = await freshDb("neon")
    cli(`npx prisma db execute --file tests/fixtures/legacy-2026-06-neon-schema.sql --url "${url}"`, url)
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
      await seedLegacy(db, { withCommunities: false })
      const before = await snapshot(db, LEGACY_TABLES)
      // Runbook: show the concrete diff first (read-only), then baseline + deploy.
      const diff = cli(`npx prisma migrate diff --from-url "${url}" --to-migrations prisma/migrations --shadow-database-url "${await freshDb("shadow1")}" --script`, url)
      expect(diff).toContain("NewsArticle") // tables introduced after June are listed for review
      expect(diff).not.toMatch(/DROP TABLE/)
      cli(`npx prisma db execute --file prisma/migrations/0001_baseline/migration.sql --url "${url}"`, url)
      cli(`npx prisma migrate resolve --applied 0001_baseline`, url)
      cli(`npx prisma migrate deploy`, url)
      await assertMigrated(db, before, { withCommunities: false })
      const drift = cli(`npx prisma migrate diff --from-url "${url}" --to-schema-datamodel prisma/schema.prisma --exit-code || true`, url)
      expect(drift).toContain("No difference detected")
    } finally {
      await db.$disconnect()
    }
  }, 180_000)

  it("existing SQLite file (2026-10 schema) → copy into baseline → v4, counts and ids identical", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "daynet-sqlite-"))
    const sqlitePath = path.join(dir, "legacy.db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require("node:sqlite")
    const lite = new DatabaseSync(sqlitePath)
    lite.exec(readFileSync("tests/fixtures/legacy-2026-10-sqlite-schema.sql", "utf8"))
    const ms = (d: number) => Date.UTC(2026, 9, d)
    lite.exec(`INSERT INTO "User" (id,email,password,name,username,"isPrivate","onboardingDone","lastActive","createdAt","updatedAt") VALUES
      ('u1','a@example.test','h','あきら','akira',0,1,${ms(1)},${ms(1)},${ms(1)}),
      ('u2','b@example.test','','ぶん','bun_1234',1,0,${ms(1)},${ms(1)},${ms(1)}),
      ('u3','c@example.test','h','ちえ','chie',0,1,${ms(1)},'2026-10-01 00:00:00',${ms(1)})`)
    lite.exec(`INSERT INTO "Account" (id,"userId",type,provider,"providerAccountId",access_token) VALUES ('acc1','u2','oauth','google','g-1','tok')`)
    lite.exec(`INSERT INTO "Session" (id,"sessionToken","userId",expires) VALUES ('s1','st1','u1',${ms(20)})`)
    lite.exec(`INSERT INTO "Community" (id,slug,name,description,category,"isPrivate","ownerId","createdAt","updatedAt") VALUES ('cm1','walk','散歩','説明','おでかけ',0,'u1',${ms(1)},${ms(1)})`)
    lite.exec(`INSERT INTO "Post" (id,"userId",caption,images,"communityId","createdAt","updatedAt") VALUES
      ('p1','u1','写真','["https://res.cloudinary.com/demo/image/upload/v1/feeld/a.jpg","https://images.unsplash.com/x.jpg"]',NULL,${ms(2)},${ms(2)}),
      ('p2','u2','日記','[]','cm1',${ms(3)},${ms(3)}),
      ('p3','u3','壊れた画像JSON','not-json',NULL,${ms(4)},${ms(4)})`)
    lite.exec(`INSERT INTO "Like" ("userId","postId","createdAt") VALUES ('u2','p1',${ms(2)}),('u3','p1',${ms(2)})`)
    lite.exec(`INSERT INTO "Comment" (id,"postId","userId",content,"parentId","createdAt") VALUES ('c2','p1','u1','ありがとう','c1',${ms(3)}),('c1','p1','u2','いいね',NULL,${ms(2)})`)
    lite.exec(`INSERT INTO "Follow" ("followerId","followingId","createdAt") VALUES ('u1','u2',${ms(1)}),('u2','u1',${ms(1)}),('u3','u1',${ms(1)})`)
    lite.exec(`INSERT INTO "Story" (id,"userId","imageUrl","expiresAt","createdAt") VALUES ('st1','u1','https://example.test/s.jpg',${ms(20)},${ms(1)})`)
    lite.exec(`INSERT INTO "Footprint" (id,"visitorId","visitedId","visitedAt") VALUES ('f1','u2','u1',${ms(2)}),('f2','u2','u1',${ms(2)})`)
    lite.exec(`INSERT INTO "Notification" (id,"userId",type,"fromUserId","postId",read,"createdAt") VALUES ('n1','u1','like','u2','p1',0,${ms(2)})`)
    lite.exec(`INSERT INTO "Conversation" (id,"createdAt","updatedAt") VALUES ('cv1',${ms(1)},${ms(1)}),('cv2',${ms(5)},${ms(5)})`)
    lite.exec(`INSERT INTO "ConversationParticipant" ("conversationId","userId") VALUES ('cv1','u1'),('cv1','u2'),('cv2','u2'),('cv2','u1')`)
    lite.exec(`INSERT INTO "DirectMessage" (id,"conversationId","senderId",content,"createdAt") VALUES ('m1','cv1','u1','こんにちは',${ms(1)}),('m2','cv2','u2','やあ',${ms(5)})`)
    lite.exec(`INSERT INTO "CommunityMember" ("communityId","userId",role,"createdAt") VALUES ('cm1','u1','owner',${ms(1)}),('cm1','u3','member',${ms(1)})`)
    lite.close()

    const url = await freshDb("sqlite")
    cli(`npx prisma db execute --file prisma/migrations/0001_baseline/migration.sql --url "${url}"`, url)
    cli(`npx prisma migrate resolve --applied 0001_baseline`, url)
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
      const report = await copySqliteToPostgres(sqlitePath, db, () => undefined)
      expect(report.tables.find(t => t.table === "Comment")).toEqual({ table: "Comment", source: 2, copied: 2 })
      const before = await snapshot(db, [...LEGACY_TABLES, "Community", "CommunityMember"])
      cli(`npx prisma migrate deploy`, url)
      await assertMigrated(db, before, { withCommunities: true })
      const u3 = await db.user.findUniqueOrThrow({ where: { id: "u3" } })
      expect(u3.createdAt.toISOString()).toBe("2026-10-01T00:00:00.000Z") // ISO-text dates also converted
      expect((await db.user.findUniqueOrThrow({ where: { id: "u2" } })).isPrivate).toBe(true)
      // A second copy into a non-empty target is refused.
      await expect(copySqliteToPostgres(sqlitePath, db, () => undefined)).rejects.toThrow(/not empty/)
    } finally {
      await db.$disconnect()
    }
  }, 180_000)
})
