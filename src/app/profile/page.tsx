'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import Footer from '@/components/Footer'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [lang, setLang] = useState<'ko' | 'ja'>('ko')
  const [notifyComment, setNotifyComment] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedDone, setSavedDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 언어 감지
    const saved = localStorage.getItem('preferred-lang') as 'ko' | 'ja' | null
    if (saved === 'ko' || saved === 'ja') setLang(saved)
    else setLang(navigator.language.startsWith('ko') ? 'ko' : 'ja')

    // 유저 + 프로필 로드
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const profile = await res.json()
          setNotifyComment(profile.notify_comment ?? true)
        }
      }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notify_comment: notifyComment }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedDone(true)
      setTimeout(() => setSavedDone(false), 2500)
    } else {
      setError(lang === 'ko' ? '저장에 실패했습니다.' : '保存に失敗しました。')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-gray-500 text-sm">
            {lang === 'ko' ? '로그인이 필요합니다.' : 'ログインが必要です。'}
          </p>
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← {lang === 'ko' ? '홈으로' : 'ホームへ'}
          </Link>
        </div>
      </div>
    )
  }

  const displayName = user.user_metadata?.full_name || user.email || 'User'
  const initial = displayName[0].toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            ← {lang === 'ko' ? '홈으로' : 'ホームへ'}
          </Link>
          <h1 className="text-base font-bold text-gray-900">
            {lang === 'ko' ? '프로필 설정' : 'プロフィール設定'}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

          {/* 계정 정보 */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {lang === 'ko' ? '계정' : 'アカウント'}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base shrink-0">
                {initial}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {lang === 'ko' ? '이메일 알림' : 'メール通知'}
            </p>
            <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {lang === 'ko' ? '댓글 알림' : 'コメント通知'}
                </p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {lang === 'ko'
                    ? '내 글에 댓글 또는 대댓글이 달리면 이메일로 알림을 받습니다.'
                    : '自分の投稿にコメント・返信が届いたとき、メールで通知します。'}
                </p>
              </div>
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={notifyComment}
                onClick={() => setNotifyComment((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  notifyComment ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    notifyComment ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* 저장 버튼 */}
          <div className="px-6 py-5">
            {error && (
              <p className="text-sm text-red-500 mb-3">{error}</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || savedDone}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {savedDone
                ? (lang === 'ko' ? '✓ 저장되었습니다' : '✓ 保存しました')
                : saving
                  ? (lang === 'ko' ? '저장 중...' : '保存中...')
                  : (lang === 'ko' ? '설정 저장' : '設定を保存')}
            </button>
          </div>
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  )
}
