import Link from 'next/link'

export default function Footer({ lang }: { lang: 'ko' | 'ja' }) {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6 text-xs text-gray-400">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <p>
              <span className="text-gray-500 font-medium">
                {lang === 'ko' ? '운영자' : '運営者'}
              </span>
              {'  '}aicafe.community
            </p>
            <p>
              <span className="text-gray-500 font-medium">
                {lang === 'ko' ? '문의' : 'お問い合わせ'}
              </span>
              {'  '}
              <a
                href="mailto:contact@aicafe.community"
                className="hover:text-gray-600 underline underline-offset-2"
              >
                contact@aicafe.community
              </a>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/terms?lang=${lang}`} className="hover:text-gray-600">
              {lang === 'ko' ? '이용약관' : '利用規約'}
            </Link>
            <span className="text-gray-200">|</span>
            <Link href={`/privacy?lang=${lang}`} className="hover:text-gray-600">
              {lang === 'ko' ? '개인정보처리방침' : 'プライバシーポリシー'}
            </Link>
          </div>
        </div>
        <p className="mt-4 text-gray-300">
          © {new Date().getFullYear()} AI✦Cafe.{' '}
          {lang === 'ko'
            ? 'Claude AI로 자동 번역됩니다.'
            : 'Claude AIで自動翻訳されます。'}
        </p>
      </div>
    </footer>
  )
}
