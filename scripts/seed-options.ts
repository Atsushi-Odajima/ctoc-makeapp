// npm run seed:options
// Upserts ONLY the operator-managed profile options. Never creates users, posts or other data.
import "./lib/load-env.cjs"
import { PrismaClient } from "@prisma/client"
import { PROFILE_OPTION_SEEDS } from "../src/config/profile-options"

async function main() {
  const prisma = new PrismaClient()
  try {
    for (const option of PROFILE_OPTION_SEEDS) {
      await prisma.profileOption.upsert({
        where: { id: option.id },
        create: option,
        update: { label: option.label, sortOrder: option.sortOrder, active: option.active, kind: option.kind },
      })
    }
    const counts = await prisma.profileOption.groupBy({ by: ["kind"], _count: { _all: true } })
    console.log("profile options:", counts.map(c => `${c.kind}=${c._count._all}`).join(" "))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
