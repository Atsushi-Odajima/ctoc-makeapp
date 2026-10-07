"use client"
import { signOut } from "next-auth/react"
import { purgePersonalCache } from "./personal-cache"

export async function signOutAndPurge() {
  await purgePersonalCache()
  await signOut({ callbackUrl: "/login" })
}
