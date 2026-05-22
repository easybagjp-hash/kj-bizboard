import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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

  // 2. 해당 유저의 모든 게시글 author_name 업데이트
  const { error: postsError } = await supabase
    .from('posts').update({ author_name: name }).eq('user_id', user.id)
  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 })

  // 3. 해당 유저의 모든 댓글 author_name 업데이트
  const { error: commentsError } = await supabase
    .from('comments').update({ author_name: name }).eq('user_id', user.id)
  if (commentsError) return NextResponse.json({ error: commentsError.message }, { status: 500 })

  return NextResponse.json({ display_name: name })
}
