import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import Line from "next-auth/providers/line"
import { compare } from "bcryptjs"
import { prisma } from "./db"
import { PrismaAdapter } from "@auth/prisma-adapter"

function makeUsername(name: string, email: string): string {
  const base = (name || email.split("@")[0])
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20)
  return `${base}_${Math.floor(Math.random() * 9000 + 1000)}`
}

const adapter = {
  ...PrismaAdapter(prisma),
  createUser: async (data: { name?: string | null; email: string; emailVerified?: Date | null; image?: string | null }) => {
    const username = makeUsername(data.name || "", data.email)
    return prisma.user.create({
      data: {
        name: data.name ?? "",
        email: data.email,
        avatar: data.image,
        username,
        password: "",
        onboardingDone: false,
      },
    })
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, auth, signIn, signOut } = (NextAuth as any)({
  adapter,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.password) return null
        const isValid = await compare(credentials.password as string, user.password)
        if (!isValid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          onboardingDone: user.onboardingDone,
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    }),
    Line({
      clientId: process.env.LINE_CLIENT_ID ?? "",
      clientSecret: process.env.LINE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, account }: { token: any; user: any; account: any }) {
      if (user) {
        token.id = user.id
        token.onboardingDone = (user as { onboardingDone?: boolean }).onboardingDone
      }
      if (account && account.provider !== "credentials") {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email! } })
        if (dbUser) {
          token.id = dbUser.id
          token.onboardingDone = dbUser.onboardingDone
        }
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { onboardingDone?: boolean }).onboardingDone = token.onboardingDone as boolean
        ;(session.user as { username?: string }).username = token.username as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
})

export const { GET, POST } = handlers
