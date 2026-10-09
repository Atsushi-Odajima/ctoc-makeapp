"use client"

import { SessionProvider } from "next-auth/react"
import { Toaster } from "react-hot-toast"
import { ServiceWorkerManager } from "./ServiceWorkerManager"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      {children}
      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: "calc(var(--nav-height) + 16px + env(safe-area-inset-bottom))" }}
        toastOptions={{
          duration: 3000,
          ariaProps: { role: "status", "aria-live": "polite" },
          style: { borderRadius: "8px", background: "#20211F", color: "#fff", fontSize: "14px", lineHeight: "1.5", fontWeight: 500, padding: "10px 14px", maxWidth: "90vw" },
        }}
      />
      <ServiceWorkerManager />
    </SessionProvider>
  )
}
