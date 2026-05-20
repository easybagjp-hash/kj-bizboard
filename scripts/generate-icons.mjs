/**
 * PWA 아이콘 생성 스크립트 (sharp 사용)
 * 실행: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

const BG      = '#1a1a2e'  // 다크 네이비
const STAR    = '#da7756'  // 클로드 주황
const WHITE   = '#ffffff'

/**
 * 512 기준으로 비율 계산 → 다른 크기에서도 동일 비율 유지
 *
 * 레이아웃 (safe zone = 중앙 70% = 358px):
 *   ┌──────────────────────────────┐
 *   │  safe zone (70%)            │
 *   │                             │
 *   │        AI✳          ← 큰 글씨
 *   │       Cafe           ← 작은 글씨
 *   │                             │
 *   └──────────────────────────────┘
 *
 * tspan으로 ✳만 주황색 처리
 */
function buildSvg(S) {
  const cx = S / 2
  const cy = S / 2

  // 폰트 크기: safe zone(70%) 기준
  const safe     = S * 0.70
  const mainSize = Math.round(safe * 0.38)   // "AI✳" 크기
  const subSize  = Math.round(safe * 0.18)   // "Cafe" 크기
  const gap      = Math.round(mainSize * 0.6) // 두 줄 사이 간격

  // 두 줄을 세로 중앙 정렬
  const y1 = cy - gap * 0.38  // "AI✳" 줄
  const y2 = cy + gap * 0.72  // "Cafe" 줄

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" fill="${BG}"/>
  <!-- AI✳ (✳만 주황) -->
  <text
    x="${cx}" y="${y1}"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Arial Black, Arial, Helvetica, sans-serif"
    font-weight="900"
    font-size="${mainSize}"
  ><tspan fill="${WHITE}">AI</tspan><tspan fill="${STAR}">✳</tspan></text>
  <!-- Cafe -->
  <text
    x="${cx}" y="${y2}"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="700"
    font-size="${subSize}"
    fill="${WHITE}"
    letter-spacing="${Math.round(subSize * 0.12)}"
  >Cafe</text>
</svg>`
}

async function generateIcon(size, filename) {
  const svg = buildSvg(size)
  const outPath = path.join(PUBLIC_DIR, filename)
  await sharp(Buffer.from(svg)).png().toFile(outPath)
  const { size: bytes } = await import('fs').then(m => ({ size: m.statSync(outPath).size }))
  console.log(`✓ ${filename}  ${size}×${size}  (${(bytes / 1024).toFixed(1)} KB)`)
}

async function main() {
  console.log('🎨 PWA 아이콘 생성 중...\n')
  await generateIcon(512, 'icon-512.png')
  await generateIcon(192, 'icon-192.png')
  console.log('\n✅ 완료!')
}

main().catch(e => { console.error(e); process.exit(1) })
