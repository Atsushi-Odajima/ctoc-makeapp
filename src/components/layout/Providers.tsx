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
        containerStyle={{ bottom: "calc(100px + env(safe-area-inset-bottom))" }}
        toastOptions={{
          duration: 3000,
          ariaProps: { role: "status", "aria-live": "polite" },
          style: { borderRadius: "10px", background: "#302B38", color: "#fff", fontSize: "12px", lineHeight: "18px", maxWidth: "90vw" },
        }}
      />
      <ServiceWorkerManager />
    </SessionProvider>
  )
}
