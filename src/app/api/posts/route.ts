import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { translatePost, translateTags } from '@/lib/translation'
import { createClient } from '@/lib/supabase-server'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL

  let query = supabase.from('posts').select('*').order('created_at', { ascending: false })
  if (!isAdmin) {
    query = query.eq('status', 'active')
  } else {
    query = query.neq('status', 'deleted')
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')
    query = query.or(
      `title_ko.ilike.%${escaped}%,content_ko.ilike.%${escaped}%,title_ja.ilike.%${escaped}%,content_ja.ilike.%${escaped}%,author_name.ilike.%${escaped}%,tags_ko.cs.{${q}},tags_ja.cs.{${q}}`
    )
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, content, original_lang, author_name, category, tags, notify_comment, notify_email } = body

  if (!title || !content || !original_lang || !author_name) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  const serverSupabase = await createClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  // 번역 실패 시 원문을 반대 언어 필드에도 저장 (fallback)
  let translationFailed = false
  let translated: { title: string; content: string }
  try {
    translated = await translatePost(title, content, original_lang)
  } catch (e) {
    console.error('[Translation] translatePost 실패:', e)
    translationFailed = true
    translated = { title, content }
  }

  const postData =
    original_lang === 'ko'
      ? { title_ko: title, content_ko: content, title_ja: translated.title, content_ja: translated.content }
      : { title_ja: title, content_ja: content, title_ko: translated.title, content_ko: translated.content }

  const attachments = body.attachments ?? []
  const tagsSrc: string[] = tags ?? []

  let tagsTranslated: string[] = []
  try {
    tagsTranslated = tagsSrc.length > 0 ? await translateTags(tagsSrc, original_lang) : []
  } catch {
    tagsTranslated = tagsSrc  // 태그 번역 실패 시 원본 태그 사용
  }

  const tags_ko = original_lang === 'ko' ? tagsSrc : tagsTranslated
  const tags_ja = original_lang === 'ja' ? tagsSrc : tagsTranslated

  const { data, error } = await supabase
    .from('posts')
    .insert([{
      ...postData,
      original_lang,
      author_name,
      category: category || '',
      user_id: user?.id ?? null,
      attachments,
      tags: tagsSrc,
      tags_ko,
      tags_ja,
      notify_comment: notify_comment !== false,
      notify_email: notify_comment !== false ? (notify_email || null) : null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { ...data, ...(translationFailed && { translation_failed: true }) },
    { status: 201 }
  )
}
