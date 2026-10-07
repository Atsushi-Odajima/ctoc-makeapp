import { expect, type Browser, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import sharp from "sharp"
import path from "node:path"
import os from "node:os"

let prisma: PrismaClient | null = null
export function db() {
  if (!process.env.E2E_DATABASE_URL) throw new Error("E2E_DATABASE_URL is not set (run via npm run test:e2e)")
  prisma ??= new PrismaClient({ datasources: { db: { url: process.env.E2E_DATABASE_URL } } })
  return prisma
}

let n = 0
export function uniq(prefix: string) {
  n++
  return `${prefix}_${Date.now().toString(36)}${n}`.slice(0, 30)
}

export async function register(page: Page, name: string, username = uniq("u")) {
  await page.goto("/register")
  await page.getByLabel(/表示名/).fill(name)
  await page.getByLabel(/ユーザー名/).fill(username)
  await page.getByLabel(/メールアドレス/).fill(`${username}@example.test`)
  await page.getByLabel(/パスワード/).fill("password-123")
  await page.getByRole("button", { name: "アカウントを作成" }).click()
  await page.waitForURL("**/onboarding")
  return { username, email: `${username}@example.test`, password: "password-123" }
}

export async function onboarding(page: Page) {
  await expect(page.getByText("STEP 1 / 3")).toBeVisible()
  // Next is disabled until a choice is made (required items cannot be skipped).
  await expect(page.getByRole("button", { name: "次へ" })).toBeDisabled()
  await page.getByText("喫茶店の引き出しが多い").click()
  await page.getByRole("button", { name: "次へ" }).click()
  await page.getByText("朝にめっぽう弱い").click()
  await page.getByRole("button", { name: "次へ" }).click()
  for (const h of ["写真", "散歩", "喫茶店"]) await page.getByText(h, { exact: true }).click()
  await page.getByRole("button", { name: "確認へ" }).click()
  await page.getByRole("button", { name: "この内容ではじめる" }).click()
  await page.waitForURL("**/feed")
}

export async function newUser(browser: Browser, name: string) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ja-JP" })
  const page = await context.newPage()
  const creds = await register(page, name)
  await onboarding(page)
  const user = await db().user.findUniqueOrThrow({ where: { username: creds.username } })
  return { context, page, ...creds, id: user.id }
}

export async function login(page: Page, email: string, password = "password-123") {
  await page.goto("/login")
  await page.getByLabel("メールアドレス").fill(email)
  await page.getByLabel("パスワード", { exact: true }).fill(password)
  await page.getByRole("button", { name: "ログイン" }).click()
  await page.waitForURL("**/feed")
}

export async function photoFile(): Promise<string> {
  const file = path.join(os.tmpdir(), `daynet-e2e-${process.pid}.jpg`)
  await sharp(path.resolve("design/DayNet/assets/demo_walk.png")).resize(900).jpeg({ quality: 80 })
    .withExif({ IFD0: { Make: "E2ECam" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "35/1 40/1 0/1" } }).toFile(file)
  return file
}

export async function createPost(page: Page, caption: string, opts: { photo?: boolean } = {}) {
  await page.goto("/create")
  await page.getByLabel("投稿本文").fill(caption)
  if (opts.photo) {
    await page.locator("input[type=file]").first().setInputFiles(await photoFile())
    await expect(page.getByText("準備できました")).toBeVisible({ timeout: 30_000 })
    await page.getByLabel(/代替テキスト/).fill("花屋の店先の花")
  }
  await page.getByRole("button", { name: "投稿する" }).last().click()
  await page.waitForURL(/\/post\/[^/?]+/)
  await expect(page.getByText("投稿しました。")).toBeVisible()
  return new URL(page.url()).pathname.split("/").pop()!
}

export async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}
