import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 프로필이 없으면 기본값 반환 (아직 저장된 적 없는 신규 유저)
  if (!data) {
    return NextResponse.json({
      id: user.id,
      email: user.email ?? '',
      notify_comment: true,
    })
  }

  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const notify_comment = typeof body.notify_comment === 'boolean' ? body.notify_comment : true

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? '',
      notify_comment,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { display_name } = await req.json()
  const name = display_name?.trim()
  if (!name) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
  if (name.length > 30) return NextResponse.json({ error: '이름은 30자 이내로 입력해주세요.' }, { status: 400 })

  // 1. profiles 업데이트
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email ?? '', display_name: name })
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // bulk update 시 RLS 우회를 위해 admin 클라이언트 우선 사용 (없으면 user 클라이언트 fallback)
  // SUPABASE_SERVICE_ROLE_KEY 미설정 시 comments 업데이트가 RLS에 막혀 0건이 될 수 있음
  const db = supabaseAdmin ?? supabase
  if (!supabaseAdmin) {
    console.warn('[Profile PATCH] supabaseAdmin 없음 — RLS로 인해 comments 업데이트가 막힐 수 있습니다. SUPABASE_SERVICE_ROLE_KEY 설정을 확인하세요.')
  }

  // 2. 해당 유저의 모든 게시글 author_name 업데이트
  const { data: updatedPosts, error: postsError } = await db
    .from('posts').update({ author_name: name }).eq('user_id', user.id).select('id')
  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 })
  console.log(`[Profile PATCH] posts updated: ${updatedPosts?.length ?? 0}건`)

  // 3. 해당 유저의 모든 댓글/대댓글 author_name 업데이트
  const { data: updatedComments, error: commentsError } = await db
    .from('comments').update({ author_name: name }).eq('user_id', user.id).select('id')
  if (commentsError) return NextResponse.json({ error: commentsError.message }, { status: 500 })
  console.log(`[Profile PATCH] comments updated: ${updatedComments?.length ?? 0}건`)

  return NextResponse.json({
    display_name: name,
    posts_updated: updatedPosts?.length ?? 0,
    comments_updated: updatedComments?.length ?? 0,
  })
}
