import { describe, expect, it } from "vitest"
import { graphemeLength, plainText, httpUrl, username, cleanPlainText, LIMITS } from "@/lib/validation/text"
import { introductionSchema, profilePatchSchema, dmSendSchema } from "@/lib/validation/schemas"
import { validateIntroduction } from "@/lib/services/profile"
import { PROFILE_OPTION_SEEDS } from "@/config/profile-options"

describe("grapheme counting (全角・絵文字)", () => {
  it("counts user-perceived characters", () => {
    expect(graphemeLength("こんにちは")).toBe(5)
    expect(graphemeLength("ＡＢＣ１２３")).toBe(6)
    expect(graphemeLength("👨‍👩‍👧‍👦")).toBe(1)
    expect(graphemeLength("🇯🇵🌸")).toBe(2)
    expect(graphemeLength("が")).toBe(1) // composed
    expect(graphemeLength("が")).toBe(1) // combining dakuten
  })

  it("enforces the limits in graphemes, not UTF-16 units", () => {
    const comment = plainText(LIMITS.comment, { min: 1 })
    expect(comment.safeParse("😀".repeat(1000)).success).toBe(true)
    expect(comment.safeParse("😀".repeat(1001)).success).toBe(false)
    expect(plainText(LIMITS.displayName).safeParse("あ".repeat(30)).success).toBe(true)
    expect(plainText(LIMITS.displayName).safeParse("あ".repeat(31)).success).toBe(false)
    expect(comment.safeParse("   ").success).toBe(false)
  })

  it("keeps full-width text as typed (no NFKC) and strips control characters", () => {
    expect(plainText(100).parse("ＤａｙＮｅｔ　です")).toBe("ＤａｙＮｅｔ　です")
    expect(cleanPlainText("a\u0000b\r\nc\u0007")).toBe("ab\nc")
  })

  it("accepts only http/https URLs", () => {
    expect(httpUrl.safeParse("https://example.com/a").success).toBe(true)
    expect(httpUrl.safeParse("javascript:alert(1)").success).toBe(false)
    expect(httpUrl.safeParse("data:text/html,x").success).toBe(false)
    expect(httpUrl.safeParse("ftp://x").success).toBe(false)
  })

  it("usernames are lowercase ASCII/digits/underscore 3-30", () => {
    expect(username.safeParse("kirin_days").success).toBe(true)
    expect(username.safeParse("Kirin").success).toBe(false)
    expect(username.safeParse("ab").success).toBe(false)
    expect(username.safeParse("きりん").success).toBe(false)
  })
})

describe("strict schemas", () => {
  it("profile PATCH cannot carry internal flags", () => {
    expect(profilePatchSchema.safeParse({ onboardingDone: true }).success).toBe(false)
    expect(profilePatchSchema.safeParse({ role: "ADMIN" }).success).toBe(false)
    expect(profilePatchSchema.safeParse({ bio: "やあ", isPrivate: true }).success).toBe(true)
  })
  it("introduction needs exactly 3 hobbies", () => {
    const base = { strengthOptionId: "a", weaknessOptionId: "b" }
    expect(introductionSchema.safeParse({ ...base, hobbyOptionIds: ["x", "y"] }).success).toBe(false)
    expect(introductionSchema.safeParse({ ...base, hobbyOptionIds: ["x", "y", "z", "w"] }).success).toBe(false)
    expect(introductionSchema.safeParse({ ...base, hobbyOptionIds: ["x", "y", "z"] }).success).toBe(true)
  })
  it("DM text limit is 2000 graphemes", () => {
    expect(dmSendSchema.safeParse({ content: "あ".repeat(2000), clientMessageId: "abcdefgh" }).success).toBe(true)
    expect(dmSendSchema.safeParse({ content: "あ".repeat(2001), clientMessageId: "abcdefgh" }).success).toBe(false)
  })
})

describe("introduction option validation", () => {
  const options = new Map(PROFILE_OPTION_SEEDS.map(o => [o.id, { kind: o.kind, active: o.active }]))
  const empty = { strengthOptionId: null, weaknessOptionId: null, hobbyIds: [] as string[] }
  const good = { strengthOptionId: "str_cafe_drawer", weaknessOptionId: "weak_mornings", hobbyOptionIds: ["hobby_cafe", "hobby_walk", "hobby_photo"] }

  it("accepts a valid selection and the seeded lists match the spec counts", () => {
    expect(validateIntroduction(good, options, empty)).toBeNull()
    expect(PROFILE_OPTION_SEEDS.filter(o => o.kind === "STRENGTH")).toHaveLength(6)
    expect(PROFILE_OPTION_SEEDS.filter(o => o.kind === "WEAKNESS")).toHaveLength(6)
    expect(PROFILE_OPTION_SEEDS.filter(o => o.kind === "HOBBY")).toHaveLength(18)
    expect(new Set(PROFILE_OPTION_SEEDS.map(o => o.id)).size).toBe(PROFILE_OPTION_SEEDS.length)
  })
  it("rejects duplicates, wrong kinds and unknown ids", () => {
    expect(validateIntroduction({ ...good, hobbyOptionIds: ["hobby_cafe", "hobby_cafe", "hobby_walk"] }, options, empty)).toHaveProperty("hobbyOptionIds")
    expect(validateIntroduction({ ...good, strengthOptionId: "hobby_cafe" }, options, empty)).toHaveProperty("strengthOptionId")
    expect(validateIntroduction({ ...good, weaknessOptionId: "nope" }, options, empty)).toHaveProperty("weaknessOptionId")
  })
  it("a retired option stays valid only for users who already chose it", () => {
    const retired = new Map(options)
    retired.set("hobby_cafe", { kind: "HOBBY", active: false })
    expect(validateIntroduction(good, retired, empty)).toHaveProperty("hobbyOptionIds")
    expect(validateIntroduction(good, retired, { ...empty, hobbyIds: ["hobby_cafe"] })).toBeNull()
  })
})
