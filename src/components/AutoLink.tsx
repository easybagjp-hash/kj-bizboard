import React from 'react'

type Segment = { type: 'text' | 'url'; value: string }

function parseSegments(text: string): Segment[] {
  const URL_REGEX = /https?:\/\/[^\s]+/g
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = URL_REGEX.exec(text)) !== null) {
    // URL 끝의 문장 부호(., , 등)는 URL에서 제외
    let url = match[0]
    const trailingMatch = url.match(/[.,!?;:'")\]>]+$/)
    const trailing = trailingMatch ? trailingMatch[0] : ''
    if (trailing) url = url.slice(0, url.length - trailing.length)

    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'url', value: url })
    if (trailing) segments.push({ type: 'text', value: trailing })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments
}

/**
 * 텍스트 안의 http(s):// URL을 클릭 가능한 링크로 자동 변환.
 * 부모 요소의 whitespace-pre-wrap과 함께 사용 가능.
 */
export default function AutoLink({ text }: { text: string }) {
  const segments = parseSegments(text)

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'url' ? (
          <a
            key={i}
            href={seg.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline underline-offset-2 break-all"
          >
            {seg.value}
          </a>
        ) : (
          <React.Fragment key={i}>{seg.value}</React.Fragment>
        )
      )}
    </>
  )
}
