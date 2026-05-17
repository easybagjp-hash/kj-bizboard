import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function translateText(text: string, from: 'ko' | 'ja', to: 'ko' | 'ja'): Promise<string> {
  const langMap = { ko: '한국어', ja: '日本語' }

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: `You are a professional Korean-Japanese business translator.
Translate the given text from ${langMap[from]} to ${langMap[to]} accurately and naturally.
Output only the translated text with no explanations or additional content.`,
    messages: [
      { role: 'user', content: text },
    ],
  })

  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  return block.text
}

export async function translatePost(
  title: string,
  content: string,
  originalLang: 'ko' | 'ja'
): Promise<{ title: string; content: string }> {
  const targetLang = originalLang === 'ko' ? 'ja' : 'ko'

  const [translatedTitle, translatedContent] = await Promise.all([
    translateText(title, originalLang, targetLang),
    translateText(content, originalLang, targetLang),
  ])

  return { title: translatedTitle, content: translatedContent }
}
