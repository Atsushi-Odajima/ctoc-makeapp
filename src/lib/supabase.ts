import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.SUPABASE_URL
const anonKey = import.meta.env.SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    '.env に SUPABASE_URL / SUPABASE_ANON_KEY を設定してください(.env.example 参照)'
  )
}

export const supabase = createClient(url, anonKey)
