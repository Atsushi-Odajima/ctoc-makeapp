import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import Line from "next-auth/providers/line"
import { compare } from "bcryptjs"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"
import { enabledOAuthProviders } from "./auth-providers"
import { clientIp, hashKey, hit, isLimited } from "./rate-limit"
import { USERNAME_PATTERN } from "./validation/text"

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited"
}

// A precomputed bcrypt hash so that unknown accounts take the same time as wrong passwords.
const DUMMY_HASH = "$2b$12$BVSzxWhgOwIUtZGHlVjV/eyD3YL/n2ruwmPvDmV7K4RfMTsnqLgEi"

async function uniqueUsername(name: string, email: string): Promise<string> {
  const base = (name || email.split("@")[0] || "user")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20)
  const stem = base.length >= 3 ? base : `user${base}`
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${stem}_${Math.floor(Math.random() * 90000 + 10000)}`.slice(0, 30)
    if (!USERNAME_PATTERN.test(candidate)) continue
    const taken = await prisma.user.findFirst({ where: { username: { equals: candidate, mode: "insensitive" } }, select: { id: true } })
    if (!taken) return candidate
  }
  return `user_${Date.now().toString(36)}`
}

const baseAdapter = PrismaAdapter(prisma)
const adapter = {
  ...baseAdapter,
  createUser: async (data: { name?: string | null; email: string; image?: string | null }) => {
    const username = await uniqueUsername(data.name || "", data.email)
    const user = await prisma.user.create({
      data: {
        name: (data.name ?? "").slice(0, 30),
        email: data.email,
        avatar: data.image && /^https:\/\//.test(data.image) ? data.image : null,
        username,
        password: "",
        onboardingDone: false,
      },
    })
    return { ...user, emailVerified: null, image: null }
  },
}

const authSecret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "development" ? "daynet-local-dev-secret-change-me" : undefined)

const oauth = enabledOAuthProviders()
const providers = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : ""
      const password = typeof credentials?.password === "string" ? credentials.password : ""
      if (!email || !password || email.length > 254 || password.length > 200) return null

      const ip = clientIp(request.headers)
      const accountKey = hashKey(email)
      const ipKey = hashKey(ip)
      // Refuse early when either the account or the IP is over the limit. The message given to
      // the user is the same whether or not the account exists.
      if ((await isLimited("loginAccount", accountKey)) || (await isLimited("loginIp", ipKey))) {
        throw new RateLimitedSignin()
      }

      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true, name: true, username: true, password: true, status: true },
      })
      const valid = await compare(password, user?.password || DUMMY_HASH)
      if (!user || !user.password || !valid || user.status !== "ACTIVE") {
        await hit("loginAccount", accountKey)
        await hit("loginIp", ipKey)
        return null
      }
      return { id: user.id, email: user.email, name: user.name, username: user.username }
    },
  }),
  ...(oauth.includes("google") ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })] : []),
  ...(oauth.includes("facebook") ? [Facebook({ clientId: process.env.FACEBOOK_CLIENT_ID!, clientSecret: process.env.FACEBOOK_CLIENT_SECRET! })] : []),
  ...(oauth.includes("line") ? [Line({ clientId: process.env.LINE_CLIENT_ID!, clientSecret: process.env.LINE_CLIENT_SECRET! })] : []),
]

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: adapter as any,
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id
        token.authTime = Math.floor(Date.now() / 1000)
      }
      if (account && account.provider !== "credentials" && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email }, select: { id: true } })
        if (dbUser) token.id = dbUser.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id
        ;(session as unknown as { authTime?: number }).authTime = typeof token.authTime === "number" ? token.authTime : undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: authSecret,
})
