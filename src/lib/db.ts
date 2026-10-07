import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Query logging is off: queries can carry DM text, emails or tokens as parameters.
// Expected errors (e.g. unique-constraint races) are handled by callers; route() logs the rest
// without request data.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn"] : [],
    errorFormat: "minimal",
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
