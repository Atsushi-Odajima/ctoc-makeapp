// npm run media:migrate-legacy                 -> DRY RUN: prints the plan only
// npm run media:migrate-legacy -- --apply      -> copies legacy public images to authenticated assets
// npm run media:migrate-legacy -- --apply --destroy-public
//                                              -> additionally destroys the PUBLIC originals (+CDN
//                                                 invalidation) AFTER the copy was verified
// Steps per Media(provider='legacy-url'):
//   1. upload the legacy URL to Cloudinary as type=authenticated, public_id=<folder>/<owner>/<mediaId>
//   2. verify via the Admin API (exists, authenticated, owner path matches the Media owner/post)
//   3. switch the Media row to provider=cloudinary (Post.images is kept until the end of migration)
//   4. optionally destroy the public original (only Cloudinary-hosted originals of THIS cloud)
// Until step 4 is done for an item, it must not be described as fully private.
import "./lib/load-env.cjs"
import { PrismaClient } from "@prisma/client"
import { v2 as cloudinary } from "cloudinary"
import { arg } from "./lib/args"
import { parseCloudinaryUploadUrl } from "./lib/legacy-url"

const apply = arg("apply") === "true"
const destroyPublic = arg("destroy-public") === "true"
const limit = Number(arg("limit") && arg("limit") !== "true" ? arg("limit") : 100)

async function main() {
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    if (!process.env[key]) throw new Error(`${key} is not set`)
  }
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
  const folder = (process.env.CLOUDINARY_FOLDER || "daynet/media").replace(/^\/+|\/+$/g, "")
  const prisma = new PrismaClient()
  const items = await prisma.media.findMany({
    where: { provider: "legacy-url", status: "READY", legacyUrl: { not: null } },
    select: { id: true, ownerId: true, postId: true, legacyUrl: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  })
  console.log(`${items.length} legacy media (mode: ${apply ? "APPLY" : "DRY RUN"}${destroyPublic ? " + destroy public originals" : ""})`)
  const results: Array<Record<string, unknown>> = []
  for (const m of items) {
    const publicId = `${folder}/${m.ownerId}/${m.id}`
    const legacy = parseCloudinaryUploadUrl(m.legacyUrl!)
    const plan = { mediaId: m.id, from: legacy ? `cloudinary:${legacy.cloud}/${legacy.publicId}` : "external-url", to: `authenticated:${publicId}` }
    if (!apply) { results.push({ ...plan, status: "planned" }); continue }
    try {
      const uploaded = await cloudinary.uploader.upload(m.legacyUrl!, { public_id: publicId, type: "authenticated", overwrite: false, resource_type: "image" })
      const check = await cloudinary.api.resource(publicId, { type: "authenticated", resource_type: "image" })
      if (check.type !== "authenticated" || !String(check.public_id).startsWith(`${folder}/${m.ownerId}/`)) throw new Error("verification failed")
      if (m.postId) {
        const post = await prisma.post.findUnique({ where: { id: m.postId }, select: { userId: true } })
        if (!post || post.userId !== m.ownerId) throw new Error("post owner mismatch")
      }
      await prisma.media.update({
        where: { id: m.id },
        data: {
          provider: "cloudinary", providerPublicId: publicId, providerAssetId: uploaded.asset_id, resourceType: "image", deliveryType: "authenticated",
          version: String(uploaded.version), width: uploaded.width, height: uploaded.height, bytes: uploaded.bytes, format: uploaded.format,
        },
      })
      let destroyed: string = "kept"
      if (destroyPublic && legacy && legacy.cloud === process.env.CLOUDINARY_CLOUD_NAME) {
        const r = await cloudinary.uploader.destroy(legacy.publicId, { type: "upload", resource_type: legacy.resourceType, invalidate: true })
        destroyed = String(r.result)
      } else if (destroyPublic) destroyed = "not-ours (external URL; cannot be revoked)"
      results.push({ ...plan, status: "migrated", publicOriginal: destroyed })
    } catch (error) {
      results.push({ ...plan, status: "failed", error: error instanceof Error ? error.message : String(error) })
    }
  }
  console.log(JSON.stringify(results, null, 2))
  await prisma.$disconnect()
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
