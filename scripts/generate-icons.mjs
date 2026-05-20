/**
 * PWA 아이콘 생성 스크립트 (sharp 사용)
 * 실행: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

const BG_COLOR = '#1a1a2e'      // 다크 네이비
const STAR_COLOR = '#da7756'    // 클로드 주황
const TEXT_COLOR = '#ffffff'    // 흰색

/**
 * SVG로 아이콘 소스 생성 후 sharp로 PNG 변환
 * 안드로이드 적응형 아이콘: 텍스트를 중앙 70% 영역(safe zone) 안에 배치
 */
function buildSvg(size) {
  // safe zone = 중앙 70% → 텍스트 영역 = size * 0.70
  const safeSize = size * 0.70
  const fontSize = Math.round(safeSize * 0.30)      // "AI✦" 한 줄 크기
  const subFontSize = Math.round(safeSize * 0.16)   // "Cafe" 크기
  const cx = size / 2

  // AI✦ 와 Cafe 를 세로 중앙 기준으로 배치
  const gap = fontSize * 0.55
  const lineY1 = cx - gap * 0.5    // AI✦ 줄
  const lineY2 = cx + gap * 1.0    // Cafe 줄

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${BG_COLOR}"/>
  <!-- AI✦ (tspan으로 ✦만 주황색) -->
  <text
    x="${cx}" y="${lineY1}"
    text-anchor="middle" dominant-baseline="central"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-weight="800"
    font-size="${fontSize}"
  ><tspan fill="${TEXT_COLOR}">AI</tspan><tspan fill="${STAR_COLOR}">✦</tspan></text>
  <!-- Cafe -->
  <text
    x="${cx}" y="${lineY2}"
    text-anchor="middle" dominant-baseline="central"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-weight="700"
    font-size="${subFontSize}"
    fill="${TEXT_COLOR}"
    letter-spacing="6"
  >Cafe</text>
</svg>`
}

async function generateIcon(size, filename) {
  const svg = buildSvg(size)
  const svgBuffer = Buffer.from(svg)
  const outPath = path.join(PUBLIC_DIR, filename)

  await sharp(svgBuffer)
    .png()
    .toFile(outPath)

  console.log(`✓ ${filename} (${size}x${size}) → ${outPath}`)
}

async function main() {
  console.log('🎨 PWA 아이콘 생성 중...\n')
  await generateIcon(512, 'icon-512.png')
  await generateIcon(192, 'icon-192.png')
  console.log('\n✅ 완료!')
}

main().catch((e) => { console.error(e); process.exit(1) })
