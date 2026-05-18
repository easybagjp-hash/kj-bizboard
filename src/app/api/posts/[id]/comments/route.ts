import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { translateText } from '@/lib/translation'
import { createClient } from '@/lib/supabase-server'
import { sendCommentNotification } from '@/lib/email'

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

  // 알림 발송 (비동기, 실패해도 응답에 영향 없음)
  sendNotifications(id, data.id, user?.id ?? null, parent_id ?? null, content, original_lang)
    .catch((e) => console.warn('[Notify] notification error:', e))

  return NextResponse.json(data, { status: 201 })
}

async function sendNotifications(
  postId: string,
  commentId: string,
  commenterId: string | null,
  parentId: string | null,
  commentContent: string,
  commentLang: 'ko' | 'ja',
) {
  // 게시글 정보 조회
  const { data: post } = await supabase
    .from('posts')
    .select('user_id, title_ko, title_ja, original_lang, notify_comment')
    .eq('id', postId)
    .single()

  if (!post) return

  // 글 작성자가 알림 OFF 설정한 경우 전체 스킵
  if (!post.notify_comment) return

  // ── 글 작성자 알림 ──────────────────────────────────────────
  const postAuthorId = post.user_id as string | null
  if (postAuthorId && postAuthorId !== commenterId) {
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('email, notify_comment')
      .eq('id', postAuthorId)
      .maybeSingle()

    if (authorProfile?.notify_comment && authorProfile.email) {
      const lang = post.original_lang as 'ko' | 'ja'
      await sendCommentNotification({
        to: authorProfile.email,
        lang,
        postTitle: lang === 'ko' ? post.title_ko : post.title_ja,
        commentContent,
        postId,
      })
    }
  }

  // ── 부모 댓글 작성자 알림 (대댓글인 경우) ───────────────────
  if (parentId) {
    const { data: parentComment } = await supabase
      .from('comments')
      .select('user_id, original_lang')
      .eq('id', parentId)
      .maybeSingle()

    const parentAuthorId = parentComment?.user_id as string | null
    // 글 작성자와 동일하면 이미 위에서 알림 보냄 → 중복 방지
    if (
      parentAuthorId &&
      parentAuthorId !== commenterId &&
      parentAuthorId !== postAuthorId
    ) {
      const { data: parentProfile } = await supabase
        .from('profiles')
        .select('email, notify_comment')
        .eq('id', parentAuthorId)
        .maybeSingle()

      if (parentProfile?.notify_comment && parentProfile.email) {
        const lang = (parentComment?.original_lang ?? commentLang) as 'ko' | 'ja'
        await sendCommentNotification({
          to: parentProfile.email,
          lang,
          postTitle: lang === 'ko' ? post.title_ko : post.title_ja,
          commentContent,
          postId,
        })
      }
    }
  }
}
