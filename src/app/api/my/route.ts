import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const [postsResult, commentsResult] = await Promise.all([
    supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('comments').select('*, posts(title_ko, title_ja)').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    posts: postsResult.data ?? [],
    comments: commentsResult.data ?? [],
  })
}
