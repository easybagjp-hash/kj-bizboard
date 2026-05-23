import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { translatePost, translateTags } from '@/lib/translation'

export const maxDuration = 300

type Params = Promise<{ id: string }>

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  // 게시글 조회
  const { data: post, error } = await supabase
    .from('posts').select('*').eq('id', id).single()

  if (error || !post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 이미 번역된 경우 그대로 반환
  const isPending = post.title_ko === post.title_ja && post.content_ko === post.content_ja
  if (!isPending) {
    return NextResponse.json({ ...post, translation_pending: false })
  }

  const originalLang: 'ko' | 'ja' = post.original_lang
  const title = originalLang === 'ko' ? post.title_ko : post.title_ja
  const content = originalLang === 'ko' ? post.content_ko : post.content_ja
  const tagsSrc: string[] = post.tags || []

  try {
    const translated = await translatePost(title, content, originalLang)

    let tagsTranslated = tagsSrc
    try {
      tagsTranslated = tagsSrc.length > 0 ? await translateTags(tagsSrc, originalLang) : tagsSrc
    } catch { /* 태그 번역 실패 시 원본 유지 */ }

    const translatedData = originalLang === 'ko'
      ? { title_ja: translated.title, content_ja: translated.content }
      : { title_ko: translated.title, content_ko: translated.content }

    const tags_ko = originalLang === 'ko' ? tagsSrc : tagsTranslated
    const tags_ja = originalLang === 'ja' ? tagsSrc : tagsTranslated

    const db = supabaseAdmin ?? supabase
    const { data: updated, error: updateError } = await db
      .from('posts')
      .update({ ...translatedData, tags_ko, tags_ja })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Translate] DB 업데이트 실패:', updateError)
      return NextResponse.json({ error: 'DB 업데이트 실패: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ...updated, translation_pending: false })
  } catch (e) {
    console.error('[Translate] 번역 실패:', e)
    return NextResponse.json({ error: '번역에 실패했습니다.' }, { status: 500 })
  }
}
