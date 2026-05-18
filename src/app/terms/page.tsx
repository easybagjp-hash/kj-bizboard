'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/Footer'

export default function TermsPage() {
  const searchParams = useSearchParams()
  const [lang, setLang] = useState<'ko' | 'ja'>('ko')

  useEffect(() => {
    const p = searchParams.get('lang')
    if (p === 'ko' || p === 'ja') setLang(p)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            ← {lang === 'ko' ? '홈으로' : 'ホームへ'}
          </Link>
          <h1 className="text-base font-bold text-gray-900">
            {lang === 'ko' ? '이용약관' : '利用規約'}
          </h1>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(lang === 'ko' ? (['ko', 'ja'] as const) : (['ja', 'ko'] as const)).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 ${lang === l ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {l === 'ko' ? '한국어' : '日本語'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        {lang === 'ko' ? <TermsKo /> : <TermsJa />}
      </main>

      <Footer lang={lang} />
    </div>
  )
}

function TermsKo() {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">AI✦Cafe 이용약관</h2>
        <p className="text-xs text-gray-400">시행일: 2026년 5월 17일</p>
      </div>

      <Section title="제1조 (목적)">
        <p>이 약관은 AI✦Cafe(이하 "서비스")를 이용하는 회원과 운영자 간의 권리·의무 및 이용 조건을 규정함을 목적으로 합니다.</p>
      </Section>

      <Section title="제2조 (서비스 개요)">
        <p>AI✦Cafe는 한국과 일본 사용자 간의 비즈니스 및 생활 정보 교류를 위한 이중언어 커뮤니티 서비스입니다. Claude AI를 활용한 자동 번역 기능을 제공합니다.</p>
      </Section>

      <Section title="제3조 (이용자의 의무)">
        <ul>
          <li>타인의 명예를 훼손하거나 비방하는 게시물을 작성해서는 안 됩니다.</li>
          <li>스팸, 광고, 음란물 등 서비스 목적에 부합하지 않는 내용을 게시해서는 안 됩니다.</li>
          <li>타인의 개인정보를 동의 없이 수집하거나 게시해서는 안 됩니다.</li>
          <li>허위 정보를 유포하거나 사기 행위를 해서는 안 됩니다.</li>
          <li>저작권 등 지적재산권을 침해하는 콘텐츠를 게시해서는 안 됩니다.</li>
          <li>관련 법령을 위반하는 행위를 해서는 안 됩니다.</li>
        </ul>
      </Section>

      <Section title="제4조 (게시물의 관리)">
        <p>운영자는 다음 각 호에 해당하는 게시물을 사전 통보 없이 삭제하거나 숨김 처리할 수 있습니다.</p>
        <ul>
          <li>제3조를 위반한 게시물</li>
          <li>다른 이용자로부터 신고를 받은 게시물</li>
          <li>서비스의 목적과 관계없는 게시물</li>
        </ul>
        <p>이용자가 작성한 게시물의 저작권은 해당 이용자에게 귀속됩니다. 단, 운영자는 서비스 운영·홍보 목적으로 게시물을 활용할 수 있습니다.</p>
      </Section>

      <Section title="제5조 (자동 번역)">
        <p>서비스는 Claude AI를 이용하여 게시물을 자동 번역합니다. 번역 결과는 참고용이며, 오역이 포함될 수 있습니다. 번역 결과로 인한 오해나 손해에 대해 운영자는 책임을 지지 않습니다.</p>
      </Section>

      <Section title="제6조 (서비스의 변경 및 중단)">
        <p>운영자는 서비스의 내용을 변경하거나 중단할 수 있으며, 중단 시 사전에 공지합니다. 단, 불가피한 경우 사전 공지 없이 서비스가 중단될 수 있습니다.</p>
      </Section>

      <Section title="제7조 (면책사항)">
        <p>운영자는 다음 사항에 대해 책임을 지지 않습니다.</p>
        <ul>
          <li>이용자가 서비스에 게시한 정보의 정확성</li>
          <li>이용자 간 교류로 인해 발생한 분쟁 및 손해</li>
          <li>천재지변, 서버 장애 등 불가항력으로 인한 서비스 중단</li>
          <li>자동 번역 결과의 정확성</li>
        </ul>
      </Section>

      <Section title="제8조 (준거법 및 관할)">
        <p>이 약관은 대한민국 법령에 따라 해석되며, 분쟁 발생 시 운영자 소재지 관할 법원을 전속 관할로 합니다.</p>
      </Section>

      <Section title="제9조 (문의)">
        <p>
          이용약관에 관한 문의는{' '}
          <a href="mailto:contact@aicafe.community" className="text-blue-600 hover:underline">
            contact@aicafe.community
          </a>
          로 연락해주세요.
        </p>
      </Section>
    </div>
  )
}

function TermsJa() {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">AI✦Cafe 利用規約</h2>
        <p className="text-xs text-gray-400">施行日：2026年5月17日</p>
      </div>

      <Section title="第1条（目的）">
        <p>本規約は、AI✦Cafe（以下「サービス」）を利用するユーザーと運営者との間の権利・義務および利用条件を定めることを目的とします。</p>
      </Section>

      <Section title="第2条（サービス概要）">
        <p>AI✦Cafeは、韓国と日本のユーザー間でビジネスおよび生活情報を交流するためのバイリンガルコミュニティサービスです。Claude AIを活用した自動翻訳機能を提供します。</p>
      </Section>

      <Section title="第3条（ユーザーの義務）">
        <ul>
          <li>他者の名誉を傷つけたり、誹謗中傷する投稿を行ってはなりません。</li>
          <li>スパム、広告、わいせつ物など、サービスの目的に沿わないコンテンツを投稿してはなりません。</li>
          <li>他者の個人情報を同意なく収集・投稿してはなりません。</li>
          <li>虚偽情報の拡散や詐欺行為を行ってはなりません。</li>
          <li>著作権等の知的財産権を侵害するコンテンツを投稿してはなりません。</li>
          <li>関連法令に違反する行為を行ってはなりません。</li>
        </ul>
      </Section>

      <Section title="第4条（投稿の管理）">
        <p>運営者は、以下に該当する投稿を事前通知なく削除または非表示にすることができます。</p>
        <ul>
          <li>第3条に違反する投稿</li>
          <li>他のユーザーから通報された投稿</li>
          <li>サービスの目的と無関係な投稿</li>
        </ul>
        <p>ユーザーが投稿したコンテンツの著作権は当該ユーザーに帰属します。ただし、運営者はサービス運営・宣伝目的で投稿を利用することができます。</p>
      </Section>

      <Section title="第5条（自動翻訳）">
        <p>サービスはClaude AIを利用して投稿を自動翻訳します。翻訳結果は参考用であり、誤訳が含まれる場合があります。翻訳結果による誤解や損害について、運営者は責任を負いません。</p>
      </Section>

      <Section title="第6条（サービスの変更・中断）">
        <p>運営者はサービスの内容を変更または中断することができ、中断の場合は事前に告知します。ただし、やむを得ない場合は事前告知なくサービスが中断されることがあります。</p>
      </Section>

      <Section title="第7条（免責事項）">
        <p>運営者は以下の事項について責任を負いません。</p>
        <ul>
          <li>ユーザーがサービスに投稿した情報の正確性</li>
          <li>ユーザー間の交流により生じた紛争および損害</li>
          <li>天災、サーバー障害等の不可抗力によるサービス中断</li>
          <li>自動翻訳結果の正確性</li>
        </ul>
      </Section>

      <Section title="第8条（準拠法および管轄）">
        <p>本規約は日本法に準拠して解釈され、紛争が生じた場合は運営者所在地を管轄する裁判所を専属的合意管轄とします。</p>
      </Section>

      <Section title="第9条（お問い合わせ）">
        <p>
          利用規約に関するお問い合わせは{' '}
          <a href="mailto:contact@aicafe.community" className="text-blue-600 hover:underline">
            contact@aicafe.community
          </a>
          までご連絡ください。
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-gray-800 mb-2 pb-1 border-b border-gray-100">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  )
}
