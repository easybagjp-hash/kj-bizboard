import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'
import { sendAdminNotification } from '@/lib/email'

type Params = Promise<{ id: string }>

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const body = await req.json()
  const { reason, reporter_name } = body

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  const { data: post } = await supabase
    .from('posts').select('title_ko, author_name').eq('id', id).single()

  const { error } = await supabase.from('reports').insert([{
    target_type: 'post',
    target_id: id,
    post_id: id,
    reason: reason || '사유 없음',
    reporter_name: reporter_name || (user?.email ?? '익명'),
    reporter_user_id: user?.id ?? null,
  }])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sendAdminNotification(
    `[신고] 게시글: ${post?.title_ko ?? id}`,
    [
      `게시글 ID: ${id}`,
      `제목: ${post?.title_ko ?? '-'}`,
      `작성자: ${post?.author_name ?? '-'}`,
      `신고 사유: ${reason || '사유 없음'}`,
      `신고자: ${reporter_name || (user?.email ?? '익명')}`,
    ].join('\n')
  )

  return NextResponse.json({ success: true })
}
