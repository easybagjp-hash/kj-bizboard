import { NextRequest, NextResponse, after } from 'next/server'
import { supabase } from '@/lib/supabase'
import { translatePost, translateTags } from '@/lib/translation'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

  const attachments = body.attachments ?? []
  const tagsSrc: string[] = tags ?? []

  // 번역 전: 원문을 양쪽 언어 필드에 동일하게 저장 (번역 중 임시 상태)
  const postData = original_lang === 'ko'
    ? { title_ko: title, content_ko: content, title_ja: title, content_ja: content }
    : { title_ja: title, content_ja: content, title_ko: title, content_ko: content }

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
      tags_ko: tagsSrc,
      tags_ja: tagsSrc,
      notify_comment: notify_comment !== false,
      notify_email: notify_comment !== false ? (notify_email || null) : null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const postId = data.id

  // 응답 후 백그라운드에서 번역 실행
  after(async () => {
    const db = supabaseAdmin ?? supabase
    if (!supabaseAdmin) {
      console.warn('[Background Translation] supabaseAdmin 없음 — SUPABASE_SERVICE_ROLE_KEY 설정 필요. RLS로 인해 업데이트가 차단될 수 있습니다.')
    }
    try {
      const translated = await translatePost(title, content, original_lang as 'ko' | 'ja')
      let tagsTranslated = tagsSrc
      try {
        tagsTranslated = tagsSrc.length > 0 ? await translateTags(tagsSrc, original_lang as 'ko' | 'ja') : tagsSrc
      } catch { /* 태그 번역 실패 시 원본 사용 */ }

      const translatedData = original_lang === 'ko'
        ? { title_ja: translated.title, content_ja: translated.content }
        : { title_ko: translated.title, content_ko: translated.content }

      const tags_ko = original_lang === 'ko' ? tagsSrc : tagsTranslated
      const tags_ja = original_lang === 'ja' ? tagsSrc : tagsTranslated

      const { error: updateError } = await db
        .from('posts')
        .update({ ...translatedData, tags_ko, tags_ja })
        .eq('id', postId)

      if (updateError) console.error('[Background Translation] DB 업데이트 실패:', updateError)
      else console.log(`[Background Translation] 완료: post ${postId}`)
    } catch (e) {
      console.error('[Background Translation] 번역 실패:', e)
    }
  })

  // translation_pending: 양쪽 필드가 동일하면 아직 번역 중
  const translation_pending = data.title_ko === data.title_ja && data.content_ko === data.content_ja
  return NextResponse.json({ ...data, translation_pending }, { status: 201 })
}
