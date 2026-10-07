import { expect, test } from "@playwright/test"
import { createPost, db, newUser } from "./helpers"

// 登録 → 必須3項目 → 写真投稿 → 他アカウントが返信 → DM
test("register, required profile, photo post, reply from another account, DM", async ({ browser }) => {
  const a = await newUser(browser, "きりん")
  const postId = await createPost(a.page, "帰り道に、ちょっと遠回り。🌸", { photo: true })

  // The photo is delivered through a short-lived URL; the image itself loads.
  const img = a.page.getByRole("img", { name: "花屋の店先の花" })
  await expect(img).toBeVisible()
  expect(await img.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const src = await img.getAttribute("src")
  expect(src).toMatch(/\/api\/media\/local-file\/.+exp=\d+&sig=/)
  expect(src).not.toContain("daynet/media")

  // Reactions persist across reloads.
  await a.page.getByRole("button", { name: /気持ちわかる/ }).click()
  await expect(a.page.getByRole("button", { name: /気持ちわかる 1件/ })).toHaveAttribute("aria-pressed", "true")
  await a.page.reload()
  await expect(a.page.getByRole("button", { name: /気持ちわかる 1件/ })).toHaveAttribute("aria-pressed", "true")

  const b = await newUser(browser, "なつ")
  await b.page.goto(`/u/${a.username}`)
  await expect(b.page.getByText("喫茶店の引き出しが多い")).toBeVisible()
  await b.page.getByRole("button", { name: "フォロー", exact: true }).click()
  await expect(b.page.getByRole("button", { name: "フォロー中" })).toBeVisible()
  await b.page.goto(`/post/${postId}`)
  await b.page.getByPlaceholder("コメントを書く").fill("この色の組み合わせ、いいですね。")
  await b.page.getByRole("button", { name: "送信" }).click()
  await expect(b.page.getByText("この色の組み合わせ、いいですね。")).toBeVisible()

  // A sees the reply in notifications and as the excerpt in the feed.
  await a.page.goto("/notifications")
  await expect(a.page.getByText("さんが返信しました")).toBeVisible()
  await a.page.goto("/feed")
  await expect(a.page.getByText("この色の組み合わせ、いいですね。")).toBeVisible()

  // A follows back → mutual → regular DM.
  await a.page.goto(`/u/${b.username}`)
  await a.page.getByRole("button", { name: "フォロー", exact: true }).click()
  await a.page.getByRole("button", { name: /メッセージ/ }).click()
  await a.page.waitForURL(/\/messages\/.+/)
  await a.page.getByLabel("メッセージ本文").fill("写真の花屋さん、あの路地のお店です。")
  await a.page.getByRole("button", { name: "送信", exact: true }).click()
  await expect(a.page.getByText("送信済み")).toBeVisible()

  const conversationUrl = a.page.url()
  await b.page.goto(conversationUrl)
  await expect(b.page.getByText("写真の花屋さん、あの路地のお店です。")).toBeVisible()
  await b.page.getByLabel("メッセージ本文").fill("今度行ってみます！")
  await b.page.getByRole("button", { name: "送信", exact: true }).click()
  // A's open conversation picks the reply up via 5 s polling.
  await expect(a.page.getByText("今度行ってみます！")).toBeVisible({ timeout: 15_000 })
  expect(await db().directMessage.count({ where: { conversation: { participants: { some: { userId: a.id } } } } })).toBe(2)
})
