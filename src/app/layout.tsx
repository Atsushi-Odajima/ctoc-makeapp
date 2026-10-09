import type { Metadata, Viewport } from "next"
import "./fonts.css"
import "./globals.css"
import { Providers } from "@/components/layout/Providers"
import { APP_DESCRIPTION, APP_DISPLAY_NAME, THEME_COLOR } from "@/config/brand"

export const metadata: Metadata = {
  metadataBase: process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN) : undefined,
  title: { default: APP_DISPLAY_NAME, template: `%s | ${APP_DISPLAY_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_DISPLAY_NAME,
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon_32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple_touch_icon_180.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_DISPLAY_NAME },
  openGraph: {
    siteName: APP_DISPLAY_NAME,
    title: APP_DISPLAY_NAME,
    description: APP_DESCRIPTION,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: APP_DISPLAY_NAME }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: APP_DISPLAY_NAME, description: APP_DESCRIPTION, images: ["/brand/og.png"] },
  formatDetection: { telephone: false },
}

// No maximum-scale / user-scalable lock: pinch zoom and 200% text must keep working.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* Fonts are self-hosted (OFL, see src/app/fonts.css); no external font CDN. Preload only the
            kana/punctuation slice that every Japanese page needs (regular and bold). */}
        <link rel="preload" href="/fonts/zkgn-400-117.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/zkgn-700-117.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <Providers><div id="app-root">{children}</div></Providers>
      </body>
    </html>
  )
}
