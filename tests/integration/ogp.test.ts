import { beforeEach, describe, expect, it } from "vitest"
import { createUser, makePost, resetDb } from "../helpers/api"
import { generateMetadata } from "@/app/(app)/(public)/post/[id]/page"

beforeEach(async () => { await resetDb() })

describe("AC-E: OGP / metadata never exposes restricted posts", () => {
  it("public posts get a title/description; private, followers-only and missing posts get only the brand", async () => {
    const pub = await createUser()
    const priv = await createUser({ isPrivate: true })
    const open = await makePost(pub.id, { caption: "公開の散歩写真" })
    const secretA = await makePost(priv.id, { caption: "ひみつA", visibility: "PUBLIC" })
    const secretB = await makePost(pub.id, { caption: "ひみつB", visibility: "FOLLOWERS" })
    const meta = async (id: string) => JSON.stringify(await generateMetadata({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }))
    expect(await meta(open.id)).toContain("公開の散歩写真")
    for (const id of [secretA.id, secretB.id, "missing", "../../etc"]) {
      const m = await meta(id)
      expect(m).not.toContain("ひみつ")
      expect(m).toContain("DayNet")
      expect(m).not.toContain(priv.name)
    }
  })
})
