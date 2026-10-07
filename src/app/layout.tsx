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
  title: "ハレノワ",
  description: "写真、日記、コミュニティ、足あとでゆるくつながる日本向けSNS",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
      { url: "/icon-120.png", sizes: "120x120" },
      { url: "/icon-152.png", sizes: "152x152" },
      { url: "/icon-167.png", sizes: "167x167" },
      { url: "/apple-touch-icon-180.png", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ハレノワ",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B1F3A",
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
              style: { borderRadius: "6px", background: "#0B1F3A", color: "#fff" },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
