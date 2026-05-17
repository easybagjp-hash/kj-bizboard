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
        from: 'KJ BizBoard <onboarding@resend.dev>',
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
