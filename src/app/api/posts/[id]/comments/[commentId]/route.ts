import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'
import { translateText } from '@/lib/translation'

type Params = Promise<{ id: string; commentId: string }>

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { commentId } = await params
  const body = await req.json()
  const { content, author_name } = body

  if (!content) return NextResponse.json({ error: '내용은 필수입니다.' }, { status: 400 })

  const { data: comment, error: fetchError } = await supabase
    .from('comments').select('author_name, user_id, original_lang').eq('id', commentId).single()

  if (fetchError || !comment) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  const isOwnerByUserId = user && comment.user_id && comment.user_id === user.id
  const isOwnerByName = !comment.user_id && comment.author_name === author_name

  if (!isOwnerByUserId && !isOwnerByName) {
    return NextResponse.json({ error: '작성자명이 일치하지 않습니다.' }, { status: 403 })
  }

  const targetLang = comment.original_lang === 'ko' ? 'ja' : 'ko'
  const translated = await translateText(content, comment.original_lang, targetLang)
  const updateData =
    comment.original_lang === 'ko'
      ? { content_ko: content, content_ja: translated }
      : { content_ja: content, content_ko: translated }

  const { data, error } = await supabase
    .from('comments')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { commentId } = await params
  const body = await req.json()

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { status } = body
  if (!['active', 'hidden', 'deleted'].includes(status)) {
    return NextResponse.json({ error: '유효하지 않은 상태값입니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('comments').update({ status }).eq('id', commentId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { commentId } = await params
  const body = await req.json()

  const { data: comment, error: fetchError } = await supabase
    .from('comments').select('author_name, user_id').eq('id', commentId).single()

  if (fetchError || !comment) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  const isOwnerByUserId = user && comment.user_id && comment.user_id === user.id
  const isOwnerByName = comment.author_name === body.author_name

  if (!isOwnerByUserId && !isOwnerByName) {
    return NextResponse.json({ error: '작성자명이 일치하지 않습니다.' }, { status: 403 })
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
