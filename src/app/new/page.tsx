'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import type { Attachment } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'


const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPT = '.jpg,.jpeg,.png,.gif,.pdf,.xlsx,.docx'

function fileIcon(type: string) {
  if (type.startsWith('image/')) return '🖼️'
  if (type === 'application/pdf') return '📄'
  if (type.includes('spreadsheet') || type.includes('excel')) return '📊'
  if (type.includes('wordprocessing') || type.includes('word')) return '📝'
  return '📎'
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}KB`
}

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPostContent />
    </Suspense>
  )
}

function NewPostContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [lang, setLang] = useState<'ko' | 'ja'>('ko')        // UI 표시 언어
  const [writingLang, setWritingLang] = useState<'ko' | 'ja'>('ko')  // 작성(원문) 언어
  const [form, setForm] = useState({
    title: '',
    content: '',
    author_name: '',
  })
  const [notifyComment, setNotifyComment] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitStep, setSubmitStep] = useState('')
  const [error, setError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    // URL 파라미터 우선, 없으면 브라우저 언어 자동 감지
    const paramLang = searchParams.get('lang')
    const detected = paramLang === 'ja' || paramLang === 'ko'
      ? paramLang
      : navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'ko'
    setWritingLang(detected)
    setLang(detected)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        const name = data.user.user_metadata?.full_name || data.user.email || ''
        setForm((f) => ({ ...f, author_name: name }))
        setNotifyEmail(data.user.email ?? '')
      }
      setAuthLoading(false)
    })
  }, [])

  const labels = {
    ko: {
      heading: '새 글 작성',
      sub: 'Claude AI가 자동으로 한국어↔일본어 번역합니다',
      writingIn: '작성 언어',
      title: '제목',
      content: '내용',
      author: '작성자명',
      submit: '번역 후 게시',
      submitting: '번역 중...',
      cancel: '취소',
      titlePlaceholder: '제목을 입력하세요',
      contentPlaceholder: '내용을 입력하세요',
      authorPlaceholder: '이름 또는 회사명',
    },
    ja: {
      heading: '新規投稿',
      sub: 'Claude AIが自動で韓国語↔日本語に翻訳します',
      writingIn: '投稿言語',
      title: 'タイトル',
      content: '内容',
      author: '投稿者名',
      submit: '翻訳して投稿',
      submitting: '翻訳中...',
      cancel: 'キャンセル',
      titlePlaceholder: 'タイトルを入力してください',
      contentPlaceholder: '内容を入力してください',
      authorPlaceholder: 'お名前または会社名',
    },
  }

  const t = labels[lang]

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('')
    const selected = Array.from(e.target.files ?? [])
    const errors: string[] = []
    const valid: File[] = []

    for (const file of selected) {
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`${file.name}: 허용되지 않는 형식입니다.`)
      } else if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: 10MB를 초과합니다.`)
      } else {
        valid.push(file)
      }
    }

    if (errors.length) setFileError(errors.join(' / '))
    setFiles((prev) => [...prev, ...valid])
    e.target.value = ''
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadFiles(): Promise<Attachment[]> {
    if (files.length === 0) return []
    const supabase = createClient()
    const results: Attachment[] = []

    for (const file of files) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}/${file.name}`
      const { error } = await supabase.storage.from('post-attachments').upload(path, file)
      if (error) throw new Error(`${file.name} 업로드 실패: ${error.message}`)
      const { data: { publicUrl } } = supabase.storage.from('post-attachments').getPublicUrl(path)
      results.push({ name: file.name, url: publicUrl, type: file.type, size: file.size })
    }

    return results
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let attachments: Attachment[] = []
      if (files.length > 0) {
        setSubmitStep(lang === 'ko' ? '파일 업로드 중...' : 'ファイルをアップロード中...')
        attachments = await uploadFiles()
      }

      setSubmitStep(lang === 'ko' ? '번역 중...' : '翻訳中...')
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        ...form,
        original_lang: writingLang,
        attachments,
        tags,
        notify_comment: notifyComment,
        notify_email: notifyComment ? notifyEmail.trim() : null,
      }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '오류가 발생했습니다.')
      }

      const post = await res.json()
      router.push(`/posts/${post.id}?lang=${lang}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setSubmitting(false)
      setSubmitStep('')
    }
  }

  async function handleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center">
          <p className="text-4xl mb-4">✍️</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {lang === 'ko' ? '로그인이 필요합니다' : 'ログインが必要です'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {lang === 'ko' ? '글을 작성하려면 Google 로그인이 필요합니다.' : '投稿するにはGoogleログインが必要です。'}
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors mb-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {lang === 'ko' ? 'Google로 로그인' : 'Googleでログイン'}
          </button>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            {lang === 'ko' ? '← 목록으로 돌아가기' : '← 一覧へ戻る'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            ← {lang === 'ko' ? '목록으로' : '一覧へ'}
          </Link>
          <h1 className="text-lg font-bold text-gray-900">{t.heading}</h1>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(lang === 'ko' ? (['ko', 'ja'] as const) : (['ja', 'ko'] as const)).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 ${lang === l ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                {l === 'ko' ? '한국어' : '日本語'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 mb-6 text-center">{t.sub}</p>

        <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

          {/* 작성 언어 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.writingIn}</label>
            <div className="flex gap-2">
              {(writingLang === 'ko' ? (['ko', 'ja'] as const) : (['ja', 'ko'] as const)).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setWritingLang(l)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    writingLang === l
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {l === 'ko' ? '한국어로 작성' : '日本語で作成'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {writingLang === 'ko'
                ? '한국어로 작성 → 일본어 자동 번역 저장'
                : '日本語で作成 → 韓国語に自動翻訳して保存'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.author}</label>
            <input
              type="text"
              required
              value={form.author_name}
              onChange={(e) => !user && setForm({ ...form, author_name: e.target.value })}
              readOnly={!!user}
              placeholder={t.authorPlaceholder}
              className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${user ? 'bg-gray-50 text-gray-500' : ''}`}
            />
            {user && (
              <p className="text-xs text-gray-400 mt-1">
                {lang === 'ko' ? 'Google 계정으로 로그인됨' : 'Googleアカウントでログイン中'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ko' ? '태그' : 'タグ'}
              <span className="text-gray-400 font-normal ml-1 text-xs">
                {lang === 'ko' ? `(선택 · 최대 5개 · 엔터로 추가)` : `(任意 · 最大5個 · Enterで追加)`}
              </span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const trimmed = tagInput.trim()
                  if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
                    setTags([...tags, trimmed])
                  }
                  setTagInput('')
                }
              }}
              placeholder={lang === 'ko' ? '태그 입력 후 엔터' : 'タグを入力してEnter'}
              disabled={tags.length >= 5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                      className="text-blue-400 hover:text-blue-700 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.title}</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t.titlePlaceholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.content}</label>
            <textarea
              required
              rows={8}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={t.contentPlaceholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 파일 첨부 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {lang === 'ko' ? '파일 첨부' : 'ファイル添付'}
              <span className="text-gray-400 font-normal ml-1">
                {lang === 'ko' ? '(선택)' : '(任意)'}
              </span>
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-lg px-4 py-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-sm text-gray-400">
                {lang === 'ko' ? '클릭하여 파일 선택' : 'クリックしてファイルを選択'}
              </p>
              <p className="text-xs text-gray-300 mt-1">JPG · PNG · GIF · PDF · XLSX · DOCX · 최대 10MB</p>
            </div>

            {fileError && (
              <p className="text-xs text-red-500 mt-1.5">{fileError}</p>
            )}

            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <li key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    {file.type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <span className="text-2xl w-10 text-center">{fileIcon(file.type)}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-gray-300 hover:text-red-500 text-xl leading-none"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 댓글 알림 설정 */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={notifyComment}
                onChange={(e) => setNotifyComment(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                {lang === 'ko'
                  ? '댓글이 달리면 이메일로 알림 받기'
                  : 'コメントが届いたらメールで通知する'}
              </span>
            </label>
            {notifyComment && (
              <div className="flex items-center gap-2 pl-6">
                <label className="text-xs text-gray-500 shrink-0">
                  {lang === 'ko' ? '알림 받을 이메일' : '通知先メール'}
                </label>
                <input
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder={lang === 'ko' ? '이메일 주소' : 'メールアドレス'}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg">
              <p className="text-sm text-red-500 flex-1">{error}</p>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                className="text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded hover:bg-red-100 shrink-0 whitespace-nowrap"
              >
                {lang === 'ko' ? '다시 시도' : '再試行'}
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Link
              href="/"
              className="flex-1 text-center px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {t.cancel}
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? submitStep : t.submit}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
