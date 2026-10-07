import { describe, expect, it } from "vitest"
import { parseCloudinaryUploadUrl } from "../../scripts/lib/legacy-url"

describe("legacy Cloudinary URL parsing (media:migrate-legacy)", () => {
  it("extracts cloud, resource type and public id with or without transformations/version", () => {
    expect(parseCloudinaryUploadUrl("https://res.cloudinary.com/demo/image/upload/c_limit,w_1080/v1718600000/feeld/abc.jpg"))
      .toEqual({ cloud: "demo", resourceType: "image", publicId: "feeld/abc", version: "1718600000" })
    expect(parseCloudinaryUploadUrl("https://res.cloudinary.com/demo/image/upload/v12/feeld/sub/x%20y.png"))
      .toEqual({ cloud: "demo", resourceType: "image", publicId: "feeld/sub/x y", version: "12" })
  })
  it("returns null for non-Cloudinary or non-upload URLs (cannot be revoked by us)", () => {
    expect(parseCloudinaryUploadUrl("https://images.unsplash.com/photo-1")).toBeNull()
    expect(parseCloudinaryUploadUrl("https://res.cloudinary.com/demo/image/authenticated/v1/a.jpg")).toBeNull()
    expect(parseCloudinaryUploadUrl("not a url")).toBeNull()
  })
})
