import type { Metadata, Viewport } from "next"
import { Noto_Sans_JP } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { SessionProvider } from "next-auth/react"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
  variable: "--font-noto",
})

export const metadata: Metadata = {
  title: "Feeld",
  description: "昔のSNSの良いとこ取り入れたSNS",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Feeld",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563EB",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body>
        <SessionProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: "16px", background: "#1E293B", color: "#fff" },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
