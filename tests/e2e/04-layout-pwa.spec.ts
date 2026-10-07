import { expect, test } from "@playwright/test"
import { createPost, login, newUser, noHorizontalScroll } from "./helpers"

// 720x450 = a 1440x900 window at 200% zoom (text and UI enlarged twice).
const SIZES: Array<[number, number]> = [[390, 844], [320, 568], [768, 1024], [1440, 900], [720, 450]]
const PAGES = ["/feed", "/feed?tab=discover", "/communities", "/create", "/messages", "/profile", "/notifications", "/settings", "/explore", "/onboarding"]

test("no horizontal scrolling at 390/320/768/1440 and 200% zoom, nav exposes the current page", async ({ browser }) => {
  const a = await newUser(browser, "とても長い表示名の人🌸🌸🌸ながいながいなまえ")
  await createPost(a.page, "長い本文 " + "あいうえおABCDEFG😀".repeat(40), { photo: true })
  for (const [w, h] of SIZES) {
    await a.page.setViewportSize({ width: w, height: h })
    for (const path of PAGES) {
      await a.page.goto(path)
      await a.page.waitForLoadState("networkidle")
      expect(await noHorizontalScroll(a.page), `${w}x${h} ${path}`).toBeLessThanOrEqual(0)
    }
  }
  await a.page.setViewportSize({ width: 390, height: 844 })
  await a.page.goto("/communities")
  const current = a.page.getByRole("navigation", { name: "メインナビゲーション" }).last().locator('[aria-current="page"]')
  await expect(current).toHaveText(/集まり/)
  // Touch targets in the bottom nav are at least 44px.
  for (const box of await a.page.getByRole("navigation", { name: "メインナビゲーション" }).last().getByRole("link").evaluateAll(els => els.map(e => e.getBoundingClientRect()))) {
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.width).toBeGreaterThanOrEqual(44)
  }
})

test("brand, manifest and metadata use DayNet only", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json()
  expect(manifest).toMatchObject({ name: "DayNet", short_name: "DayNet", start_url: "/feed", display: "standalone", theme_color: "#F7F4F5", background_color: "#F7F4F5" })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]))
  await page.goto("/")
  await expect(page).toHaveTitle("DayNet")
  const html = await page.content()
  for (const old of ["ハレノワ", "Harenowa", "Feeld", "mixta", "DotNet", "R05"]) expect(html).not.toContain(old)
  expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute("href")).toContain("apple_touch_icon_180.png")
})

test("service worker caches only static files; logout and account switch clear drafts", async ({ browser }) => {
  const a = await newUser(browser, "したがき")
  await a.page.goto("/feed")
  await a.page.evaluate(async () => { await navigator.serviceWorker.ready })
  await a.page.reload()
  await a.page.goto("/messages")
  const cached: string[] = await a.page.evaluate(async () => {
    const out: string[] = []
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) out.push(new URL(req.url).pathname)
    return out
  })
  expect(cached.length).toBeGreaterThan(0)
  for (const path of cached) expect(path).toMatch(/^\/(_next\/static|brand|fonts)\/|^\/offline\.html$/)

  await a.page.goto("/create")
  await a.page.getByLabel("投稿本文").fill("Aさんの下書き（他人に見えてはいけない）")
  await a.page.waitForTimeout(1200) // autosave
  await a.page.goto("/settings")
  await a.page.getByRole("button", { name: "ログアウト" }).click()
  await a.page.waitForURL("**/login")

  const b = await newUser(browser, "べつのひと") // fresh account
  await login(a.page, b.email) // same browser profile as A
  await a.page.goto("/create")
  await expect(a.page.getByLabel("投稿本文")).toHaveValue("")
  await b.context.close()
})
