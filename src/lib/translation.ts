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

export async function translateTags(tags: string[], sourceLang: 'ko' | 'ja'): Promise<string[]> {
  if (tags.length === 0) return []
  const targetLang = sourceLang === 'ko' ? 'ja' : 'ko'
  const langMap = { ko: '한국어', ja: '日本語' }

  // 태그 목록을 한 번의 API 호출로 번역 (비용·속도 최적화)
  const input = tags.join('\n')
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    system: `You are a professional Korean-Japanese translator specializing in short labels and tags.
Translate each tag from ${langMap[sourceLang]} to ${langMap[targetLang]}.
Rules:
- Output ONLY the translated tags, one per line, in the same order as input
- Keep tags short and concise (1-4 words)
- No explanations, no numbering, no extra text`,
    messages: [{ role: 'user', content: input }],
  })

  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')

  const translated = block.text.trim().split('\n').map(t => t.trim()).filter(Boolean)
  // 번역 결과 수가 다르면 원본으로 fallback
  if (translated.length !== tags.length) return tags
  return translated
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
