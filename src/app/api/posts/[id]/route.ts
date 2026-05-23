import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'
import { translatePost, translateTags } from '@/lib/translation'

export const maxDuration = 60

type Params = Promise<{ id: string }>

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL

  const { data, error } = await supabase.from('posts').select('*').eq('id', id).single()

  if (error || !data) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  if (!isAdmin && data.status !== 'active') {
    return NextResponse.json({ error: '존재하지 않는 게시글입니다.' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const body = await req.json()
  const { title, content, author_name, original_lang, category, tags, notify_comment, notify_email } = body

  if (!title || !content) {
    return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 })
  }

  const { data: post, error: fetchError } = await supabase
    .from('posts').select('author_name, user_id, original_lang').eq('id', id).single()

  if (fetchError || !post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  const isOwnerByUserId = user && post.user_id && post.user_id === user.id
  const isOwnerByName = !post.user_id && post.author_name === author_name

  if (!isOwnerByUserId && !isOwnerByName) {
    return NextResponse.json({ error: '작성자명이 일치하지 않습니다.' }, { status: 403 })
  }

  const sourceLang: 'ko' | 'ja' = (original_lang === 'ko' || original_lang === 'ja')
    ? original_lang
    : post.original_lang

  const translated = await translatePost(title, content, sourceLang)
  const updateData =
    sourceLang === 'ko'
      ? { title_ko: title, content_ko: content, title_ja: translated.title, content_ja: translated.content }
      : { title_ja: title, content_ja: content, title_ko: translated.title, content_ko: translated.content }

  const tagsSrc: string[] = tags ?? []
  const tagsTranslated = tagsSrc.length > 0 ? await translateTags(tagsSrc, sourceLang) : []
  const tags_ko = sourceLang === 'ko' ? tagsSrc : tagsTranslated
  const tags_ja = sourceLang === 'ja' ? tagsSrc : tagsTranslated

  const { data, error } = await supabase
    .from('posts')
    .update({
      ...updateData,
      original_lang: sourceLang,
      category: category || '',
      tags: tagsSrc,
      tags_ko,
      tags_ja,
      notify_comment: notify_comment !== false,
      notify_email: notify_comment !== false ? (notify_email || null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
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
    .from('posts').update({ status }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const body = await req.json()

  const { data: post, error: fetchError } = await supabase
    .from('posts').select('author_name, user_id').eq('id', id).single()

  if (fetchError || !post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  const isOwnerByUserId = user && post.user_id && post.user_id === user.id
  const isOwnerByName = post.author_name === body.author_name

  if (!isOwnerByUserId && !isOwnerByName) {
    return NextResponse.json({ error: '작성자명이 일치하지 않습니다.' }, { status: 403 })
  }

  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
