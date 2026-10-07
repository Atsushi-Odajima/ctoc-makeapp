import type { MetadataRoute } from "next"
import { APP_DESCRIPTION, APP_DISPLAY_NAME, BACKGROUND_COLOR, THEME_COLOR } from "@/config/brand"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_DISPLAY_NAME,
    short_name: APP_DISPLAY_NAME,
    description: APP_DESCRIPTION,
    id: "/feed",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    lang: "ja",
    categories: ["social", "lifestyle"],
    icons: [
      // The mark sits inside the central 80% safe zone on a full-bleed lilac background,
      // so the same files are valid for both "any" and "maskable".
      { src: "/brand/pwa_icon_192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/pwa_icon_512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/pwa_icon_192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/pwa_icon_512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
