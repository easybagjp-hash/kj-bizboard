import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─── URL 보존 유틸 ───────────────────────────────────────────────────────────
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

/**
 * 단일 텍스트 청크를 번역.
 * 단락 구조(\n\n)는 코드에서 직접 보존 — Claude에 맡기지 않음.
 * 단락 배열을 JSON으로 전달해 번역 후, \n\n으로 재결합.
 */
async function translateSingle(text: string, from: 'ko' | 'ja', to: 'ko' | 'ja'): Promise<string> {
  const langMap = { ko: '한국어', ja: '日本語' }

  // 1. URL 치환
  const { clean: afterUrl, urls } = extractUrls(text)

  // 2. 번역할 텍스트가 없으면 건너뜀 (URL만 있는 단락)
  const textOnly = afterUrl.replace(/__URL_\d+__/g, '').trim()
  if (!textOnly) return text

  // 3. \n\n으로 단락 분리 — 빈 단락(연속 줄바꿈)도 위치 그대로 보존
  const allParagraphs = afterUrl.split('\n\n')

  // 4. 번역이 필요한 단락만 추출 (텍스트 있는 것만 Claude에 보냄)
  //    빈 단락, URL-only 단락은 Claude에 보내지 않고 원문 그대로 보존
  const translatableIndices: number[] = []
  const translatableParagraphs: string[] = []
  allParagraphs.forEach((p, i) => {
    if (p.replace(/__URL_\d+__/g, '').trim() !== '') {
      translatableIndices.push(i)
      translatableParagraphs.push(p)
    }
  })

  // 5. 단락 내 단일 \n → __NL__ 치환
  const encoded = translatableParagraphs.map(p => p.replace(/\n/g, '__NL__'))

  // 6. JSON 배열로 전달
  const inputJson = JSON.stringify(encoded)

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: `You are a professional Korean-Japanese business translator.
Input: a JSON array of strings (one string per paragraph) in ${langMap[from]}.
Output: a JSON array with the SAME number of elements, each translated to ${langMap[to]}.
Rules:
- Output ONLY the raw JSON array — no markdown fences, no explanation, no extra text
- Translate each element accurately and naturally
- Keep "__URL_0__", "__URL_1__" etc. placeholders exactly as-is
- Keep "__NL__" placeholders exactly as-is (they represent line breaks within a paragraph)
- Do NOT add, remove, merge, or reorder elements`,
    messages: [{ role: 'user', content: inputJson }],
  })

  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')

  // 7. JSON 파싱 (마크다운 코드블록 감싸진 경우 제거)
  const rawOutput = block.text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let translatedNonEmpty: string[]
  try {
    const parsed = JSON.parse(rawOutput)
    if (Array.isArray(parsed) && parsed.length > 0) {
      translatedNonEmpty = parsed.map(String)
    } else {
      translatedNonEmpty = [rawOutput]
    }
  } catch {
    translatedNonEmpty = [rawOutput]
  }

  // 8. 번역된 단락을 원래 위치에 복원, 빈 단락/URL-only 단락도 원위치 삽입
  const result = allParagraphs.map((p, i) => {
    const transPos = translatableIndices.indexOf(i)
    if (transPos !== -1) {
      const translated = translatedNonEmpty[transPos] ?? translatableParagraphs[transPos]
      return translated.replace(/__NL__/g, '\n')
    }
    return p  // 빈 단락 또는 URL-only 단락 → 원문 그대로 보존
  })

  const rejoined = result.join('\n\n')

  // 8. URL 복원
  const restored = restoreUrls(rejoined, urls)

  // Claude에게 실제로 보낸 텍스트에 포함된 URL만 누락 여부 체크
  // (URL-only 단락은 Claude에 보내지 않으므로 block.text에 없어도 정상)
  const sentText = translatableParagraphs.join('\n')
  const missing = urls.filter((_, i) =>
    sentText.includes(`__URL_${i}__`) && !block.text.includes(`__URL_${i}__`)
  )
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

  const translatedTitle = await translateText(title, originalLang, targetLang)
  const translatedContent = await translateText(content, originalLang, targetLang)

  return { title: translatedTitle, content: translatedContent }
}
