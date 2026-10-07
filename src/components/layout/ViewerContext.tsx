"use client"

import { createContext, useContext, useEffect } from "react"
import type { UserSummary } from "@/lib/dto/user"
import { guardAccountSwitch } from "@/lib/client/personal-cache"

export interface ClientViewer extends UserSummary {
  profileComplete: boolean
  role: "USER" | "MODERATOR" | "ADMIN"
  isPrivate: boolean
}

const Ctx = createContext<ClientViewer | null>(null)

export function ViewerProvider({ viewer, children }: { viewer: ClientViewer | null; children: React.ReactNode }) {
  useEffect(() => {
    void guardAccountSwitch(viewer?.id ?? null)
  }, [viewer?.id])
  return <Ctx.Provider value={viewer}>{children}</Ctx.Provider>
}

export function useViewer() {
  return useContext(Ctx)
}
