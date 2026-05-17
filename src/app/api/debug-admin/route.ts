import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  return NextResponse.json({
    logged_in: !!user,
    user_email: user?.email ?? null,
    admin_email_env: process.env.ADMIN_EMAIL ?? '(not set)',
    is_admin: user?.email === process.env.ADMIN_EMAIL,
    match: user?.email === process.env.ADMIN_EMAIL
      ? '✅ 일치'
      : `❌ 불일치: "${user?.email}" vs "${process.env.ADMIN_EMAIL}"`,
  })
}
