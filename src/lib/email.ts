const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aicafe.community'
const FROM = process.env.EMAIL_FROM || 'AI✦Cafe <noreply@send.aicafe.community>'

export async function sendCommentNotification({
  to,
  lang,
  postTitle,
  commentContent,
  postId,
}: {
  to: string
  lang: 'ko' | 'ja'
  postTitle: string
  commentContent: string
  postId: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Notify] RESEND_API_KEY not set — skipping comment notification')
    return
  }

  const postUrl = `${SITE_URL}/posts/${postId}`
  const preview = commentContent.slice(0, 120) + (commentContent.length > 120 ? '…' : '')

  const subject =
    lang === 'ko'
      ? 'AI✦Cafe에 새 댓글이 달렸습니다'
      : 'AI✦Cafeに新しいコメントが届きました'

  const html =
    lang === 'ko'
      ? `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="color:#1d4ed8;margin:0 0 4px">AI✦Cafe</h2>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px">새 댓글 알림</p>
          <p style="font-size:14px;margin:0 0 6px"><strong>글 제목</strong></p>
          <p style="font-size:15px;margin:0 0 16px">${postTitle}</p>
          <p style="font-size:14px;margin:0 0 6px"><strong>댓글 내용</strong></p>
          <blockquote style="margin:0 0 20px;padding:12px 16px;background:#eff6ff;border-left:3px solid #93c5fd;border-radius:4px;font-size:14px;color:#374151">${preview}</blockquote>
          <a href="${postUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">→ 글 바로가기</a>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px"/>
          <p style="font-size:12px;color:#9ca3af">알림을 끄려면 <a href="${SITE_URL}/profile" style="color:#6b7280;text-decoration:underline">프로필 설정</a>에서 변경하세요.</p>
        </div>`
      : `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="color:#1d4ed8;margin:0 0 4px">AI✦Cafe</h2>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px">新着コメント通知</p>
          <p style="font-size:14px;margin:0 0 6px"><strong>投稿タイトル</strong></p>
          <p style="font-size:15px;margin:0 0 16px">${postTitle}</p>
          <p style="font-size:14px;margin:0 0 6px"><strong>コメント内容</strong></p>
          <blockquote style="margin:0 0 20px;padding:12px 16px;background:#eff6ff;border-left:3px solid #93c5fd;border-radius:4px;font-size:14px;color:#374151">${preview}</blockquote>
          <a href="${postUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">→ 投稿を見る</a>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px"/>
          <p style="font-size:12px;color:#9ca3af">通知をオフにするには <a href="${SITE_URL}/profile" style="color:#6b7280;text-decoration:underline">プロフィール設定</a> から変更できます。</p>
        </div>`

  console.log('[Email] sendCommentNotification — from:', FROM, '| to:', to, '| subject:', subject)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    const resBody = await res.text()
    if (!res.ok) {
      console.error('[Email] Resend API 오류 status:', res.status, '| body:', resBody)
    } else {
      console.log('[Email] Resend 발송 성공:', resBody)
    }
  } catch (e) {
    console.error('[Email] fetch 오류:', e)
  }
}

export async function sendReplyNotification({
  to,
  lang,
  postTitle,
  replyContent,
  replierName,
  postId,
}: {
  to: string
  lang: 'ko' | 'ja'
  postTitle: string
  replyContent: string
  replierName: string
  postId: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Notify] RESEND_API_KEY not set — skipping reply notification')
    return
  }

  const postUrl = `${SITE_URL}/posts/${postId}`
  const preview = replyContent.slice(0, 120) + (replyContent.length > 120 ? '…' : '')

  const subject =
    lang === 'ko'
      ? `AI✦Cafe에 ${replierName}님이 답글을 남겼습니다`
      : `AI✦Cafeで${replierName}さんが返信しました`

  const html =
    lang === 'ko'
      ? `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="color:#1d4ed8;margin:0 0 4px">AI✦Cafe</h2>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px">답글 알림</p>
          <p style="font-size:14px;margin:0 0 6px"><strong>글 제목</strong></p>
          <p style="font-size:15px;margin:0 0 16px">${postTitle}</p>
          <p style="font-size:14px;margin:0 0 6px"><strong>${replierName}님의 답글</strong></p>
          <blockquote style="margin:0 0 20px;padding:12px 16px;background:#eff6ff;border-left:3px solid #93c5fd;border-radius:4px;font-size:14px;color:#374151">${preview}</blockquote>
          <a href="${postUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">→ 글 바로가기</a>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px"/>
          <p style="font-size:12px;color:#9ca3af">알림을 끄려면 댓글 작성 시 알림 설정을 해제하세요.</p>
        </div>`
      : `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="color:#1d4ed8;margin:0 0 4px">AI✦Cafe</h2>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px">返信通知</p>
          <p style="font-size:14px;margin:0 0 6px"><strong>投稿タイトル</strong></p>
          <p style="font-size:15px;margin:0 0 16px">${postTitle}</p>
          <p style="font-size:14px;margin:0 0 6px"><strong>${replierName}さんの返信</strong></p>
          <blockquote style="margin:0 0 20px;padding:12px 16px;background:#eff6ff;border-left:3px solid #93c5fd;border-radius:4px;font-size:14px;color:#374151">${preview}</blockquote>
          <a href="${postUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">→ 投稿を見る</a>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px"/>
          <p style="font-size:12px;color:#9ca3af">通知をオフにするにはコメント投稿時に通知設定をオフにしてください。</p>
        </div>`

  console.log('[Email] sendReplyNotification — from:', FROM, '| to:', to, '| subject:', subject)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    const resBody = await res.text()
    if (!res.ok) {
      console.error('[Email] Resend API 오류 status:', res.status, '| body:', resBody)
    } else {
      console.log('[Email] Resend 발송 성공:', resBody)
    }
  } catch (e) {
    console.error('[Email] fetch 오류:', e)
  }
}

export async function sendAdminNotification(subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL

  if (!apiKey || !adminEmail) {
    console.warn('[Report] Email not sent — set RESEND_API_KEY and ADMIN_EMAIL in .env.local')
    console.warn('[Report]', subject, '\n', body)
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: adminEmail,
        subject,
        text: body,
      }),
    })
    if (!res.ok) console.warn('[Report] Email send failed:', await res.text())
  } catch (e) {
    console.warn('[Report] Email error:', e)
  }
}
