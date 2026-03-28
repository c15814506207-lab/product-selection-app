import { createClient } from '@supabase/supabase-js'

/** 与 src/config/edgeFunctions.js 默认项目一致；生产环境仍应在 Netlify 配置 VITE_SUPABASE_URL */
const DEFAULT_SUPABASE_URL = 'https://pecotugrfppvuuwvcmyf.supabase.co'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '') || DEFAULT_SUPABASE_URL
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

if (!supabaseAnonKey) {
  throw new Error(
    '缺少 VITE_SUPABASE_PUBLISHABLE_KEY。请在 Netlify → Site → Environment variables 中添加 Supabase 的 anon public key（与 VITE_SUPABASE_URL 同属一个项目），保存后重新部署。',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)