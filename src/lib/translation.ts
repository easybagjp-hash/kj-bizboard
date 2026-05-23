import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─── URL 보존 유틸 ───────────────────────────────────────────────────────────
// 번역 전: URL → __URL_n__ 플레이스홀더로 치환 (Claude가 URL을 번역·변형하지 않도록)
// 번역 후: __URL_n__ → 원본 URL 복원
// URL 표시(링크 변환)는 AutoLink 컴포넌트에서 별도로 처리

const URL_REGEX = /https?:\/\/[^\s]+/g

function extractUrls(text: string): { clean: string; urls: string[] } {
  const urls: string[] = []
  const clean = text.replace(URL_REGEX, (url) => {
    urls.push(url)
    return `__URL_${urls.length - 1}__`
  })
  return { clean, urls }
}

function restoreUrls(text: string, urls: string[]): string {
  if (urls.length === 0) return text
  return text.replace(/__URL_(\d+)__/g, (_, i) => urls[Number(i)] ?? '')
}
// ─────────────────────────────────────────────────────────────────────────────

/** 단일 텍스트 청크를 번역 (max_tokens: 4096) */
async function translateSingle(text: string, from: 'ko' | 'ja', to: 'ko' | 'ja'): Promise<string> {
  const langMap = { ko: '한국어', ja: '日本語' }

  // 1. URL을 플레이스홀더로 치환 — 번역과 URL 처리를 완전히 분리
  const { clean, urls } = extractUrls(text)

  // 2. 플레이스홀더를 제거했을 때 번역할 텍스트가 없으면 Claude 호출 건너뜀
  //    (URL만 있는 단락 → 그대로 반환. Claude에 URL만 보내면 빈 문자열 반환으로 URL 증발)
  const textOnly = clean.replace(/__URL_\d+__/g, '').trim()
  if (!textOnly) return text

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: `You are a professional Korean-Japanese business translator.
Translate the given text from ${langMap[from]} to ${langMap[to]} accurately and naturally.
Output only the translated text with no explanations or additional content.
If the text contains placeholders like __URL_0__, __URL_1__, etc., keep them exactly as-is without translating or modifying them.`,
    messages: [
      { role: 'user', content: clean },
    ],
  })

  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')

  // 3. 번역 완료 후 플레이스홀더를 원본 URL로 복원
  //    Claude가 플레이스홀더를 누락했을 경우 해당 URL을 말미에 추가 (안전망)
  const restored = restoreUrls(block.text, urls)
  const missing = urls.filter((_, i) => !block.text.includes(`__URL_${i}__`))
  return missing.length > 0 ? restored + '\n' + missing.join('\n') : restored
}

/** 긴 텍스트를 문단 단위로 청크 분할 (기본 최대 1400자/청크) */
function splitIntoChunks(text: string, maxSize = 1400): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > maxSize) {
      chunks.push(current)
      current = para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/**
 * 텍스트 번역.
 * 1500자 이하: 단일 API 호출
 * 1500자 초과: 문단 단위로 분할 후 순차 번역, 결합
 */
export async function translateText(text: string, from: 'ko' | 'ja', to: 'ko' | 'ja'): Promise<string> {
  if (text.length <= 1500) {
    return translateSingle(text, from, to)
  }

  const chunks = splitIntoChunks(text)
  const results: string[] = []
  for (const chunk of chunks) {
    results.push(await translateSingle(chunk, from, to))
  }
  return results.join('\n\n')
}

export async function translateTags(tags: string[], sourceLang: 'ko' | 'ja'): Promise<string[]> {
  if (tags.length === 0) return []
  const targetLang = sourceLang === 'ko' ? 'ja' : 'ko'
  const langMap = { ko: '한국어', ja: '日本語' }

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
  if (translated.length !== tags.length) return tags
  return translated
}

export async function translatePost(
  title: string,
  content: string,
  originalLang: 'ko' | 'ja'
): Promise<{ title: string; content: string }> {
  const targetLang = originalLang === 'ko' ? 'ja' : 'ko'

  // 타임아웃 위험을 줄이기 위해 제목·내용을 순차 번역
  const translatedTitle = await translateText(title, originalLang, targetLang)
  const translatedContent = await translateText(content, originalLang, targetLang)

  return { title: translatedTitle, content: translatedContent }
}
