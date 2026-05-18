import { NextRequest, NextResponse, after } from 'next/server'
import { supabase } from '@/lib/supabase'
import { translateText } from '@/lib/translation'
import { createClient } from '@/lib/supabase-server'
import { sendCommentNotification, sendReplyNotification } from '@/lib/email'

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
  const { content, original_lang, author_name, parent_id, notify_reply, notify_email } = body

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
    .insert([{
      ...commentData,
      post_id: id,
      original_lang,
      author_name,
      user_id: user?.id ?? null,
      parent_id: parent_id ?? null,
      notify_reply: notify_reply !== false,
      notify_email: notify_reply !== false ? (notify_email || null) : null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // after()로 응답 후 실행 보장 — Vercel 서버리스에서 fire-and-forget이 조기 종료되는 문제 해결
  const commenterId = user?.id ?? null
  after(async () => {
    try {
      await sendNotifications(id, data.id, commenterId, parent_id ?? null, content, author_name)
    } catch (e) {
      console.error('[Notify] sendNotifications 최상위 오류:', e)
    }
  })

  return NextResponse.json(data, { status: 201 })
}

async function sendNotifications(
  postId: string,
  commentId: string,
  commenterId: string | null,
  parentId: string | null,
  commentContent: string,
  commenterName: string,
) {
  console.log('[Notify] sendNotifications 시작 — postId:', postId, '| commentId:', commentId, '| parentId:', parentId)

  // 환경변수 확인
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[Notify] RESEND_API_KEY 환경변수가 없습니다. Vercel 환경변수 설정 필요.')
    return
  }
  console.log('[Notify] RESEND_API_KEY 확인 완료 (앞 4자리):', apiKey.slice(0, 4) + '****')

  // 게시글 정보 조회
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('user_id, title_ko, title_ja, original_lang, notify_comment, notify_email')
    .eq('id', postId)
    .single()

  if (postError) {
    console.error('[Notify] 게시글 조회 오류:', postError.message)
    return
  }
  if (!post) {
    console.warn('[Notify] 게시글을 찾을 수 없음 — postId:', postId)
    return
  }

  console.log('[Notify] 게시글 조회 완료 — notify_comment:', post.notify_comment, '| notify_email:', post.notify_email)

  const lang = post.original_lang as 'ko' | 'ja'
  const postTitle = lang === 'ko' ? post.title_ko : post.title_ja

  // 1) 글 작성자 알림 (댓글/대댓글 모두)
  if (!post.notify_comment) {
    console.log('[Notify] 글 작성자 알림 OFF — 스킵')
  } else if (!post.notify_email) {
    console.warn('[Notify] 글 작성자 notify_email 없음 — 스킵')
  } else {
    const isSelf = !!(post.user_id && post.user_id === commenterId)
    if (isSelf) {
      console.log('[Notify] 본인 댓글 — 글 작성자 알림 스킵')
    } else {
      console.log('[Notify] 글 작성자에게 댓글 알림 발송 시도 →', post.notify_email)
      await sendCommentNotification({
        to: post.notify_email,
        lang,
        postTitle,
        commentContent,
        postId,
      })
      console.log('[Notify] 글 작성자 댓글 알림 발송 완료')
    }
  }

  // 2) 부모 댓글 작성자 알림 (대댓글인 경우)
  if (!parentId) {
    console.log('[Notify] 대댓글 아님 — 부모 알림 없음')
    return
  }

  const { data: parentComment, error: parentError } = await supabase
    .from('comments')
    .select('user_id, notify_reply, notify_email')
    .eq('id', parentId)
    .single()

  if (parentError) {
    console.error('[Notify] 부모 댓글 조회 오류:', parentError.message)
    return
  }
  if (!parentComment) {
    console.warn('[Notify] 부모 댓글을 찾을 수 없음 — parentId:', parentId)
    return
  }

  console.log('[Notify] 부모 댓글 — notify_reply:', parentComment.notify_reply, '| notify_email:', parentComment.notify_email)

  if (!parentComment.notify_reply) {
    console.log('[Notify] 부모 댓글 작성자 알림 OFF — 스킵')
    return
  }
  if (!parentComment.notify_email) {
    console.warn('[Notify] 부모 댓글 notify_email 없음 — 스킵')
    return
  }

  const isSelf = !!(parentComment.user_id && parentComment.user_id === commenterId)
  if (isSelf) {
    console.log('[Notify] 본인 답글 — 부모 댓글 작성자 알림 스킵')
    return
  }

  console.log('[Notify] 부모 댓글 작성자에게 답글 알림 발송 시도 →', parentComment.notify_email)
  await sendReplyNotification({
    to: parentComment.notify_email,
    lang,
    postTitle,
    replyContent: commentContent,
    replierName: commenterName,
    postId,
  })
  console.log('[Notify] 부모 댓글 작성자 답글 알림 발송 완료')
}
