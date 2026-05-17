import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { translateText } from '@/lib/translation'
import { createClient } from '@/lib/supabase-server'

type Params = Promise<{ id: string }>

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL

  let query = supabase
    .from('comments')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  if (!isAdmin) {
    query = query.eq('status', 'active')
  } else {
    query = query.neq('status', 'deleted')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const body = await req.json()
  const { content, original_lang, author_name, parent_id } = body

  if (!content || !original_lang || !author_name) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  const targetLang = original_lang === 'ko' ? 'ja' : 'ko'
  const translated = await translateText(content, original_lang, targetLang)

  const commentData =
    original_lang === 'ko'
      ? { content_ko: content, content_ja: translated }
      : { content_ko: translated, content_ja: content }

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  const { data, error } = await supabase
    .from('comments')
    .insert([{ ...commentData, post_id: id, original_lang, author_name, user_id: user?.id ?? null, parent_id: parent_id ?? null }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
