import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // .env の SUPABASE_URL / SUPABASE_ANON_KEY をそのままクライアントへ公開する
  envPrefix: ['VITE_', 'SUPABASE_'],
})
