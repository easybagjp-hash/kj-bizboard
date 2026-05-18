import { NextRequest, NextResponse } from 'next/server'
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

  // 알림 발송 (비동기, 실패해도 응답에 영향 없음)
  sendNotifications(id, data.id, user?.id ?? null, parent_id ?? null, content, author_name)
    .catch((e) => console.warn('[Notify] notification error:', e))

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
  // 게시글 정보 조회
  const { data: post } = await supabase
    .from('posts')
    .select('user_id, title_ko, title_ja, original_lang, notify_comment, notify_email')
    .eq('id', postId)
    .single()

  if (!post) return

  const lang = post.original_lang as 'ko' | 'ja'
  const postTitle = lang === 'ko' ? post.title_ko : post.title_ja

  // 1) 글 작성자 알림 (댓글/대댓글 모두)
  if (post.notify_comment && post.notify_email) {
    // 본인 댓글이면 스킵
    const isSelf = post.user_id && post.user_id === commenterId
    if (!isSelf) {
      await sendCommentNotification({
        to: post.notify_email,
        lang,
        postTitle,
        commentContent,
        postId,
      })
    }
  }

  // 2) 부모 댓글 작성자 알림 (대댓글인 경우)
  if (parentId) {
    const { data: parentComment } = await supabase
      .from('comments')
      .select('user_id, notify_reply, notify_email')
      .eq('id', parentId)
      .single()

    if (parentComment && parentComment.notify_reply && parentComment.notify_email) {
      // 부모 댓글 작성자가 본인이면 스킵
      const isSelf = parentComment.user_id && parentComment.user_id === commenterId
      if (!isSelf) {
        await sendReplyNotification({
          to: parentComment.notify_email,
          lang,
          postTitle,
          replyContent: commentContent,
          replierName: commenterName,
          postId,
        })
      }
    }
  }
}
