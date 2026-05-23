import { createClient } from '@supabase/supabase-js'

/**
 * Service Role 클라이언트 — RLS를 우회하는 서버 전용 클라이언트.
 * SUPABASE_SERVICE_ROLE_KEY 환경변수 필요 (클라이언트에 노출 금지).
 * Supabase 대시보드 → Settings → API → service_role 키
 */
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null
