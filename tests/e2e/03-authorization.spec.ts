import { expect, test } from "@playwright/test"
import { db, newUser } from "./helpers"

test("authorization failures are refused in the browser and at the API", async ({ browser, baseURL }) => {
  const anon = await browser.newPage()
  await anon.goto("/feed")
  await expect(anon).toHaveURL(/\/login/)

  const a = await newUser(browser, "えー")
  const b = await newUser(browser, "びー")
  const c = await newUser(browser, "しー")
  const conversation = await db().conversation.create({
    data: { pairKey: [a.id, b.id].sort().join(":"), participants: { create: [{ userId: a.id }, { userId: b.id }] } },
  })

  // C opens A–B's conversation: not found, and a POST does not add a message.
  await c.page.goto(`/messages/${conversation.id}`)
  await expect(c.page.getByText("この会話は見つからないか、表示できません。")).toBeVisible()
  const post = await c.page.request.post(`/api/dm/${conversation.id}`, {
    data: { content: "割り込み", clientMessageId: "e2e-intruder-1" },
    headers: { Origin: baseURL! },
  })
  expect([403, 404]).toContain(post.status())
  expect(await db().directMessage.count({ where: { conversationId: conversation.id } })).toBe(0)

  // Cross-site write is rejected by the Origin check.
  const csrf = await a.page.request.post("/api/posts", { data: { caption: "csrf" }, headers: { Origin: "https://evil.example" } })
  expect(csrf.status()).toBe(403)

  // Public DTO has no private fields.
  const profile = await c.page.request.get(`/api/users/${a.username}`)
  const text = await profile.text()
  expect(text).not.toContain("@example.test")
  expect(text).not.toContain("password")

  // The moderation queue does not exist for normal users.
  const admin = await a.page.goto("/admin/reports")
  expect(admin?.status()).toBe(404)
  expect((await a.page.request.get("/api/moderation/reports")).status()).toBe(404)

  // Private community content is not readable by non-members.
  const community = await db().community.create({
    data: { slug: `secret-${Date.now()}`, name: "ひみつの集まり", description: "メンバーだけ", category: "その他", isPrivate: true, ownerId: a.id, members: { create: { userId: a.id, role: "OWNER" } } },
  })
  await db().post.create({ data: { userId: a.id, caption: "メンバー限定の話", communityId: community.id, visibility: "COMMUNITY", status: "PUBLISHED", publishedAt: new Date() } })
  await c.page.goto(`/communities/${community.slug}`)
  await expect(c.page.getByText("非公開の集まりです", { exact: true })).toBeVisible()
  await expect(c.page.getByText("メンバー限定の話")).toHaveCount(0)
  expect((await c.page.request.get(`/api/communities/${community.slug}/posts`)).status()).toBe(404)
  expect((await anon.request.get(`/api/communities/${community.slug}/members`)).status()).toBe(404)
})
