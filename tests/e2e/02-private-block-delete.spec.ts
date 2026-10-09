import { expect, test } from "@playwright/test"
import { createPost, db, newUser } from "./helpers"

test("private account: request → approve → posts become visible", async ({ browser }) => {
  const owner = await newUser(browser, "ひみつさん")
  await owner.page.goto("/settings")
  await owner.page.getByRole("switch", { name: "非公開アカウント" }).check()
  await expect(owner.page.getByText("非公開アカウントにしました")).toBeVisible()
  const postId = await createPost(owner.page, "フォロワー限定の日記")

  const viewer = await newUser(browser, "みるひと")
  await viewer.page.goto(`/post/${postId}`)
  await expect(viewer.page.getByText("この投稿は見つからないか、表示できません。")).toBeVisible()
  await viewer.page.goto(`/u/${owner.username}`)
  await expect(viewer.page.getByText("非公開アカウントです", { exact: true })).toBeVisible()
  await expect(viewer.page.getByText("喫茶店の引き出しが多い")).toBeVisible() // 3 items stay public
  await viewer.page.getByRole("button", { name: "フォローをリクエスト" }).click()
  await expect(viewer.page.getByRole("button", { name: "リクエスト済み" })).toBeVisible()

  await owner.page.goto("/notifications")
  await owner.page.getByRole("region", { name: "フォローリクエスト" }).getByRole("button", { name: "承認" }).click()
  await expect(owner.page.getByText("承認しました")).toBeVisible()

  await viewer.page.goto(`/post/${postId}`)
  await expect(viewer.page.getByText("フォロワー限定の日記")).toBeVisible()
})

test("block: both directions lose interaction", async ({ browser }) => {
  const a = await newUser(browser, "ブロックする人")
  const b = await newUser(browser, "される人")
  await b.page.goto(`/u/${a.username}`)
  await b.page.getByRole("button", { name: "フォロー", exact: true }).click()
  await a.page.goto(`/u/${b.username}`)
  await a.page.getByRole("button", { name: "その他の操作" }).click()
  await a.page.getByRole("button", { name: "ブロック" }).click()
  await a.page.getByRole("button", { name: "ブロックする" }).click()
  await expect(a.page.getByRole("button", { name: "ブロックを解除" })).toBeVisible()
  expect(await db().follow.count({ where: { OR: [{ followerId: b.id }, { followingId: b.id }] } })).toBe(0)

  await b.page.goto(`/u/${a.username}`)
  await expect(b.page.getByText("このアカウントは表示できません。")).toBeVisible()
  const res = await b.page.request.post("/api/dm", { data: { targetUserId: a.id }, headers: { Origin: new URL(b.page.url()).origin } })
  expect([403, 404]).toContain(res.status())
})

test("delete a post", async ({ browser }) => {
  const a = await newUser(browser, "けすひと")
  const postId = await createPost(a.page, "あとで消す投稿")
  await a.page.getByRole("button", { name: "投稿メニュー" }).click()
  await a.page.getByRole("button", { name: "削除" }).click()
  await a.page.getByRole("button", { name: "削除する" }).click()
  await a.page.waitForURL("**/profile")
  await a.page.goto(`/post/${postId}`)
  await expect(a.page.getByText("この投稿は見つからないか、表示できません。")).toBeVisible()
  expect((await db().post.findUniqueOrThrow({ where: { id: postId } })).status).toBe("DELETED")
})
