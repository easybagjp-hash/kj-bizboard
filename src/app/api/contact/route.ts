import { NextRequest, NextResponse } from 'next/server'
import { sendAdminNotification } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json()

  if (!name || !message) {
    return NextResponse.json({ error: '이름과 문의 내용은 필수입니다.' }, { status: 400 })
  }

  await sendAdminNotification(
    `[AI*Cafe 문의] ${name}`,
    `이름: ${name}\n이메일: ${email || '미입력'}\n\n${message}`,
  )

  return NextResponse.json({ ok: true })
}
