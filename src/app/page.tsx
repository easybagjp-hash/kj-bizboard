'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Post } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import Footer from '@/components/Footer'


const REPORT_REASONS = {
  ko: ['스팸·광고', '욕설·비방', '허위정보', '기타'],
  ja: ['スパム・広告', '誹謗中傷', '虚偽情報', 'その他'],
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm not-italic">{part}</mark>
          : part
      )}
    </>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [lang, setLang] = useState<'ko' | 'ja'>('ko')

  function handleSetLang(l: 'ko' | 'ja') {
    setLang(l)
    localStorage.setItem('preferred-lang', l)
  }
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const [reportTarget, setReportTarget] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)

  const [contactOpen, setContactOpen] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSubmitting, setContactSubmitting] = useState(false)
  const [contactDone, setContactDone] = useState(false)

  async function handleContact(e: React.FormEvent) {
    e.preventDefault()
    setContactSubmitting(true)
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactForm),
    })
    setContactSubmitting(false)
    setContactDone(true)
  }

  function closeContact() {
    setContactOpen(false)
    setContactDone(false)
    setContactForm({ name: '', email: '', message: '' })
  }

  useEffect(() => {
    // Detect language: localStorage → browser language → default ja
    const saved = localStorage.getItem('preferred-lang') as 'ko' | 'ja' | null
    if (saved === 'ko' || saved === 'ja') {
      setLang(saved)
    } else {
      const bl = navigator.language
      setLang(bl.startsWith('ko') ? 'ko' : 'ja')
    }

    fetchPosts('')
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  function fetchPosts(q: string) {
    setLoading(true)
    const url = q ? `/api/posts?q=${encodeURIComponent(q)}` : '/api/posts'
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setPosts(Array.isArray(data) ? data : []); setLoading(false) })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchInput.trim()
    setSearchQuery(q)
    fetchPosts(q)
  }

  function clearSearch() {
    setSearchInput('')
    setSearchQuery('')
    setSearchOpen(false)
    fetchPosts('')
  }

  const isAdmin = !!(user && user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL)

  async function handleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  async function handleStatusChange(e: React.MouseEvent, postId: string, status: string) {
    e.stopPropagation()
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(`[Admin 오류 ${res.status}] ${data.error ?? '알 수 없는 오류'}`)
      return
    }
    fetchPosts(searchQuery)
  }

  async function submitReport() {
    if (!reportTarget) return
    setReportSubmitting(true)
    await fetch(`/api/posts/${reportTarget}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reportReason }),
    })
    setReportSubmitting(false)
    setReportSuccess(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI<span style={{ color: '#da7756' }}>✦</span>Cafe
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {lang === 'ko' ? 'AI로 연결하는 한일 비즈니스 커뮤니티' : 'AIでつながる日韓ビジネスコミュニティ'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 검색 아이콘 */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${searchOpen || searchQuery ? 'text-blue-600' : 'text-gray-400 hover:text-gray-700'}`}
              aria-label="search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            <button
              onClick={() => setContactOpen(true)}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors hidden sm:block"
            >
              {lang === 'ko' ? '문의하기' : 'お問い合わせ'}
            </button>

            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(lang === 'ko' ? (['ko', 'ja'] as const) : (['ja', 'ko'] as const)).map((l) => (
                <button
                  key={l}
                  onClick={() => handleSetLang(l)}
                  className={`px-3 py-1.5 ${lang === l ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {l === 'ko' ? '한국어' : '日本語'}
                </button>
              ))}
            </div>

            {user ? (
              <>
                {isAdmin && (
                  <span className="text-xs font-bold text-orange-500 border border-orange-200 bg-orange-50 px-2 py-0.5 rounded">
                    ADMIN
                  </span>
                )}
                <Link href="/my" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                  {lang === 'ko' ? '내 글' : 'マイ投稿'}
                </Link>
                <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">
                  {lang === 'ko' ? '로그아웃' : 'ログアウト'}
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {lang === 'ko' ? 'Google 로그인' : 'Googleログイン'}
              </button>
            )}

            <Link
              href={`/new?lang=${lang}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {lang === 'ko' ? '글쓰기' : '投稿する'}
            </Link>
          </div>
        </div>

        {/* 검색바 */}
        {searchOpen && (
          <div className="border-t border-gray-100 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={lang === 'ko' ? '제목, 내용 검색...' : 'タイトル・内容を検索...'}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  {lang === 'ko' ? '검색' : '検索'}
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-white"
                  >
                    {lang === 'ko' ? '초기화' : 'リセット'}
                  </button>
                )}
              </form>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 검색 결과 헤더 */}
        {searchQuery && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-700">
              {lang === 'ko'
                ? <><span className="font-semibold text-blue-600">"{searchQuery}"</span> 검색 결과 <span className="font-semibold">{posts.length}건</span></>
                : <><span className="font-semibold text-blue-600">「{searchQuery}」</span>の検索結果 <span className="font-semibold">{posts.length}件</span></>
              }
            </span>
            <button onClick={clearSearch} className="text-xs text-gray-400 hover:text-gray-600 underline">
              {lang === 'ko' ? '검색 초기화' : 'クリア'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            {lang === 'ko' ? '불러오는 중...' : '読み込み中...'}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            {searchQuery
              ? (lang === 'ko' ? '검색 결과가 없습니다.' : '検索結果がありません。')
              : (lang === 'ko' ? '게시글이 없습니다.' : '投稿がありません。')}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const title = lang === 'ko' ? post.title_ko : post.title_ja
              const content = lang === 'ko' ? post.content_ko : post.content_ja
              const isHidden = post.status === 'hidden'

              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/posts/${post.id}?lang=${lang}`)}
                  className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer ${
                    isHidden ? 'border-orange-200 opacity-60' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isHidden && (
                          <span className="text-xs font-bold text-orange-500 border border-orange-300 bg-orange-50 px-1.5 py-0.5 rounded">
                            숨김
                          </span>
                        )}
                        {post.updated_at && (
                          <span className="text-xs text-gray-400">
                            {lang === 'ko' ? '수정됨' : '編集済み'}
                          </span>
                        )}
                      </div>
                      <h2 className="font-semibold text-gray-900 truncate">
                        <Highlight text={title} query={searchQuery} />
                      </h2>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        <Highlight text={content} query={searchQuery} />
                      </p>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {post.tags.map((tag) => (
                            <span key={tag} className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-400 shrink-0">
                      <p>{post.author_name}</p>
                      <p className="mt-1">{new Date(post.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>

                  {/* 신고 + 어드민 버튼 */}
                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-gray-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setReportTarget(post.id)
                        setReportReason('')
                        setReportSuccess(false)
                      }}
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                    >
                      {lang === 'ko' ? '신고' : '通報'}
                    </button>

                    {isAdmin && (
                      <div className="flex gap-1 ml-2">
                        {post.status !== 'hidden' && (
                          <button
                            onClick={(e) => handleStatusChange(e, post.id, 'hidden')}
                            className="text-xs px-2 py-0.5 rounded border border-orange-200 text-orange-500 hover:bg-orange-50"
                          >
                            {lang === 'ko' ? '숨기기' : '非表示'}
                          </button>
                        )}
                        {post.status === 'hidden' && (
                          <button
                            onClick={(e) => handleStatusChange(e, post.id, 'active')}
                            className="text-xs px-2 py-0.5 rounded border border-green-200 text-green-600 hover:bg-green-50"
                          >
                            {lang === 'ko' ? '복구' : '復元'}
                          </button>
                        )}
                        <button
                          onClick={(e) => handleStatusChange(e, post.id, 'deleted')}
                          className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          {lang === 'ko' ? '삭제' : '削除'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 신고 모달 */}
      {reportTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            {reportSuccess ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-base font-bold text-gray-900 mb-1">
                  {lang === 'ko' ? '신고가 접수되었습니다.' : '通報を受け付けました。'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {lang === 'ko' ? '운영자가 검토 후 조치합니다.' : '管理者が確認後、対応いたします。'}
                </p>
                <button
                  onClick={() => setReportTarget(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  {lang === 'ko' ? '확인' : '閉じる'}
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {lang === 'ko' ? '게시글 신고' : '投稿を通報'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {lang === 'ko' ? '신고 사유를 선택해주세요.' : '通報理由を選択してください。'}
                </p>
                <div className="space-y-2 mb-4">
                  {REPORT_REASONS[lang].map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reportReason === r}
                        onChange={() => setReportReason(r)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{r}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReportTarget(null)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {lang === 'ko' ? '취소' : 'キャンセル'}
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={!reportReason || reportSubmitting}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                  >
                    {reportSubmitting
                      ? (lang === 'ko' ? '제출 중...' : '送信中...')
                      : (lang === 'ko' ? '신고하기' : '通報する')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 문의 모달 */}
      {contactOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            {contactDone ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-base font-bold text-gray-900 mb-1">
                  {lang === 'ko' ? '문의가 접수되었습니다.' : 'お問い合わせを受け付けました。'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {lang === 'ko' ? '빠른 시일 내에 답변드리겠습니다.' : '早急にご返答いたします。'}
                </p>
                <button
                  onClick={closeContact}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  {lang === 'ko' ? '확인' : '閉じる'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleContact}>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {lang === 'ko' ? '문의하기' : 'お問い合わせ'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {lang === 'ko' ? '운영자에게 문의 내용을 보내드립니다.' : '管理者にお問い合わせ内容を送信します。'}
                </p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === 'ko' ? '이름 *' : 'お名前 *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={lang === 'ko' ? '홍길동' : '山田太郎'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === 'ko' ? '이메일 (선택)' : 'メールアドレス（任意）'}
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === 'ko' ? '문의 내용 *' : 'お問い合わせ内容 *'}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder={lang === 'ko' ? '문의 내용을 입력해주세요.' : 'お問い合わせ内容をご入力ください。'}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeContact}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {lang === 'ko' ? '취소' : 'キャンセル'}
                  </button>
                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {contactSubmitting
                      ? (lang === 'ko' ? '전송 중...' : '送信中...')
                      : (lang === 'ko' ? '보내기' : '送信する')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <Footer lang={lang} />
    </div>
  )
}
