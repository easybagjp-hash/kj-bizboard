'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/Footer'

export default function PrivacyPage() {
  const searchParams = useSearchParams()
  const initialLang = (searchParams.get('lang') as 'ko' | 'ja') || 'ko'
  const [lang, setLang] = useState<'ko' | 'ja'>(initialLang)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            ← {lang === 'ko' ? '홈으로' : 'ホームへ'}
          </Link>
          <h1 className="text-base font-bold text-gray-900">
            {lang === 'ko' ? '개인정보처리방침' : 'プライバシーポリシー'}
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
        {lang === 'ko' ? <PrivacyKo /> : <PrivacyJa />}
      </main>

      <Footer lang={lang} />
    </div>
  )
}

function PrivacyKo() {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">AI✦Cafe 개인정보처리방침</h2>
        <p className="text-xs text-gray-400">시행일: 2026년 5월 17일</p>
      </div>

      <Section title="제1조 (수집하는 개인정보)">
        <p>AI✦Cafe는 서비스 제공을 위해 다음의 정보를 수집합니다.</p>
        <ul>
          <li><strong>회원가입 시:</strong> Google OAuth를 통한 이메일 주소, 프로필 정보 (Google이 제공하는 범위 내)</li>
          <li><strong>서비스 이용 시:</strong> 작성한 게시물 및 댓글, 작성자명, 카테고리, 태그</li>
          <li><strong>문의 시:</strong> 이름, 이메일 주소, 문의 내용</li>
          <li><strong>자동 수집:</strong> 접속 일시, IP 주소 (서버 로그)</li>
        </ul>
      </Section>

      <Section title="제2조 (개인정보 수집 및 이용 목적)">
        <ul>
          <li>회원 식별 및 서비스 제공</li>
          <li>게시물 및 댓글 작성자 관리</li>
          <li>신고·문의 처리 및 운영자 연락</li>
          <li>서비스 개선 및 통계 분석</li>
          <li>불법 이용 방지 및 서비스 보안</li>
        </ul>
      </Section>

      <Section title="제3조 (개인정보 보관 기간)">
        <ul>
          <li><strong>회원 정보:</strong> 회원 탈퇴 또는 서비스 종료 시까지</li>
          <li><strong>게시물·댓글:</strong> 이용자 삭제 요청 또는 서비스 종료 시까지</li>
          <li><strong>문의 내용:</strong> 처리 완료 후 1년</li>
          <li><strong>서버 로그:</strong> 최대 90일</li>
        </ul>
      </Section>

      <Section title="제4조 (제3자 제공)">
        <p>운영자는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 다음의 경우는 예외입니다.</p>
        <ul>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 의거하거나 수사기관의 요청이 있는 경우</li>
        </ul>
      </Section>

      <Section title="제5조 (제3자 서비스 이용)">
        <p>서비스는 다음의 외부 서비스를 활용합니다.</p>
        <ul>
          <li><strong>Google OAuth:</strong> 로그인 인증 (Google 개인정보처리방침 적용)</li>
          <li><strong>Supabase:</strong> 데이터베이스 및 인증 서버 (미국 소재)</li>
          <li><strong>Anthropic Claude AI:</strong> 게시물 자동 번역 (번역 목적으로만 전송)</li>
          <li><strong>Resend:</strong> 이메일 발송 서비스</li>
        </ul>
      </Section>

      <Section title="제6조 (이용자의 권리)">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>자신의 게시물·댓글 수정 및 삭제</li>
          <li>개인정보 열람·정정·삭제 요청</li>
          <li>개인정보 처리 정지 요청</li>
        </ul>
        <p>권리 행사는 <a href="mailto:contact@aicafe.community" className="text-blue-600 hover:underline">contact@aicafe.community</a>로 요청해주세요.</p>
      </Section>

      <Section title="제7조 (쿠키 및 세션)">
        <p>서비스는 로그인 상태 유지를 위해 쿠키 및 세션을 사용합니다. 브라우저 설정에서 쿠키를 비활성화하면 일부 기능 이용이 제한될 수 있습니다.</p>
      </Section>

      <Section title="제8조 (개인정보 보호책임자)">
        <p>
          개인정보 관련 문의는{' '}
          <a href="mailto:contact@aicafe.community" className="text-blue-600 hover:underline">
            contact@aicafe.community
          </a>
          로 연락해주세요. 접수 후 7영업일 이내에 답변드립니다.
        </p>
      </Section>

      <Section title="제9조 (방침 변경)">
        <p>개인정보처리방침이 변경될 경우 서비스 내 공지를 통해 사전 안내합니다. 변경된 방침은 공지일로부터 적용됩니다.</p>
      </Section>
    </div>
  )
}

function PrivacyJa() {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">AI✦Cafe プライバシーポリシー</h2>
        <p className="text-xs text-gray-400">施行日：2026年5月17日</p>
      </div>

      <Section title="第1条（収集する個人情報）">
        <p>AI✦Cafeは、サービス提供のために以下の情報を収集します。</p>
        <ul>
          <li><strong>会員登録時：</strong>Google OAuthによるメールアドレス、プロフィール情報（Googleが提供する範囲内）</li>
          <li><strong>サービス利用時：</strong>作成した投稿・コメント、投稿者名、カテゴリ、タグ</li>
          <li><strong>お問い合わせ時：</strong>お名前、メールアドレス、お問い合わせ内容</li>
          <li><strong>自動収集：</strong>アクセス日時、IPアドレス（サーバーログ）</li>
        </ul>
      </Section>

      <Section title="第2条（個人情報の収集・利用目的）">
        <ul>
          <li>会員の識別およびサービス提供</li>
          <li>投稿・コメントの投稿者管理</li>
          <li>通報・お問い合わせの処理および運営者への連絡</li>
          <li>サービス改善および統計分析</li>
          <li>不正利用の防止およびサービスセキュリティ</li>
        </ul>
      </Section>

      <Section title="第3条（個人情報の保管期間）">
        <ul>
          <li><strong>会員情報：</strong>退会またはサービス終了まで</li>
          <li><strong>投稿・コメント：</strong>ユーザーの削除要請またはサービス終了まで</li>
          <li><strong>お問い合わせ内容：</strong>処理完了後1年間</li>
          <li><strong>サーバーログ：</strong>最大90日間</li>
        </ul>
      </Section>

      <Section title="第4条（第三者への提供）">
        <p>運営者は原則としてユーザーの個人情報を外部に提供しません。ただし、以下の場合は例外です。</p>
        <ul>
          <li>ユーザーが事前に同意した場合</li>
          <li>法令に基づく場合、または捜査機関からの要請がある場合</li>
        </ul>
      </Section>

      <Section title="第5条（第三者サービスの利用）">
        <p>サービスは以下の外部サービスを活用しています。</p>
        <ul>
          <li><strong>Google OAuth：</strong>ログイン認証（Googleプライバシーポリシーが適用）</li>
          <li><strong>Supabase：</strong>データベースおよび認証サーバー（米国所在）</li>
          <li><strong>Anthropic Claude AI：</strong>投稿の自動翻訳（翻訳目的のみに送信）</li>
          <li><strong>Resend：</strong>メール送信サービス</li>
        </ul>
      </Section>

      <Section title="第6条（ユーザーの権利）">
        <p>ユーザーはいつでも以下の権利を行使できます。</p>
        <ul>
          <li>自身の投稿・コメントの編集および削除</li>
          <li>個人情報の閲覧・訂正・削除の請求</li>
          <li>個人情報処理の停止請求</li>
        </ul>
        <p>権利の行使は <a href="mailto:contact@aicafe.community" className="text-blue-600 hover:underline">contact@aicafe.community</a> までご請求ください。</p>
      </Section>

      <Section title="第7条（クッキーおよびセッション）">
        <p>サービスはログイン状態の維持のためクッキーおよびセッションを使用します。ブラウザの設定でクッキーを無効にすると、一部の機能が制限される場合があります。</p>
      </Section>

      <Section title="第8条（個人情報保護責任者）">
        <p>
          個人情報に関するお問い合わせは{' '}
          <a href="mailto:contact@aicafe.community" className="text-blue-600 hover:underline">
            contact@aicafe.community
          </a>
          までご連絡ください。受付後7営業日以内にご回答いたします。
        </p>
      </Section>

      <Section title="第9条（ポリシーの変更）">
        <p>プライバシーポリシーが変更される場合は、サービス内の告知によって事前にお知らせします。変更後のポリシーは告知日より適用されます。</p>
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
