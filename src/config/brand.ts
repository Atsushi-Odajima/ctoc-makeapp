// Brand constants (DayNet v4). The product number R05 is a production-material id only and is
// never shown in the app.
export const APP_DISPLAY_NAME = "DayNet"
export const APP_DESCRIPTION = "写真・動画・日記を投稿し、趣味の集まりで話せるSNS。"
export const APP_TAGLINE = "写真と動画で、日常をつなぐ。"
export const THEME_COLOR = "#F7F4F5"
export const BACKGROUND_COLOR = "#F7F4F5"

// CinemiX is a sibling app. This is a description only: no shared login, no data exchange.
export const CINEMIX_NOTE = "DayNetとCinemiXは、同じ系列のアプリです。"
export const CINEMIX_URL: string | undefined = process.env.NEXT_PUBLIC_CINEMIX_URL || undefined

export const COLORS = {
  canvas: "#F7F4F5",
  surface: "#FFFFFF",
  ink: "#302B38",
  accent: "#EF7C68",
  lilac: "#E2DDF0",
  muted: "#665F6E",
  line: "#D7D0DB",
  controlBorder: "#897F91",
  focus: "#79528C",
  success: "#2F674D",
  warning: "#82530A",
  error: "#AA3446",
} as const
