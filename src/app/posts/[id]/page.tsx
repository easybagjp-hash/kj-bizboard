'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Post, Comment, Attachment } from '@/lib/supabase'

const CATEGORIES: { value: string; ko: string; ja: string }[] = [
  { value: 'AI·로봇',       ko: 'AI·로봇',        ja: 'AI·ロボット' },
  { value: 'ビジネス·취업',  ko: '비즈니스·취업',  ja: 'ビジネス·就職' },
  { value: '生活·문화',      ko: '생활·문화',      ja: '生活·文化' },
  { value: '質問·질문',      ko: '질문',           ja: '質問' },
  { value: '雑談·잡담',      ko: '잡담',           ja: '雑談' },
  { value: '제안·建議',      ko: '제안·건의',      ja: '提案·建議' },
]

function getCategoryLabel(category: string | null, lang: 'ko' | 'ja'): string {
  if (!category) return lang === 'ko' ? '미분류' : '未分類'
  const found = CATEGORIES.find((c) => c.value === category)
  return found ? found[lang] : category
}
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

type CommentNode = Comment & { replies: CommentNode[] }

function buildTree(flat: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []
  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }))
  flat.forEach((c) => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies.push(map.get(c.id)!)
    } else {
      roots.push(map.get(c.id)!)
    }
  })
  return roots
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const initialLang = (searchParams.get('lang') as 'ko' | 'ja') || 'ko'

  const [post, setPost] = useState<Post | null>(null)
  const [lang, setLang] = useState<'ko' | 'ja'>(initialLang)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentForm, setCommentForm] = useState({ author_name: '', content: '' })
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')

  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyForm, setReplyForm] = useState({ author_name: '', content: '' })
  const [submittingReply, setSubmittingReply] = useState(false)
  const [replyError, setReplyError] = useState('')

  const [commentWritingLang, setCommentWritingLang] = useState<'ko' | 'ja'>('ko')
  const [commentNotify, setCommentNotify] = useState(true)
  const [commentNotifyEmail, setCommentNotifyEmail] = useState('')
  const [replyWritingLang, setReplyWritingLang] = useState<'ko' | 'ja'>('ko')
  const [replyNotify, setReplyNotify] = useState(true)
  const [replyNotifyEmail, setReplyNotifyEmail] = useState('')

  useEffect(() => {
    setCommentWritingLang(lang)
    setReplyWritingLang(lang)
  }, [lang])

  // 삭제 모달 상태
  const [deleteModal, setDeleteModal] = useState<
    | { type: 'post' }
    | { type: 'comment'; commentId: string }
    | null
  >(null)
  const [deleteAuthor, setDeleteAuthor] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [editingPost, setEditingPost] = useState(false)
  const [editPostForm, setEditPostForm] = useState({ author_name: '', title: '', content: '' })
  const [editPostWritingLang, setEditPostWritingLang] = useState<'ko' | 'ja'>('ko')
  const [editPostCategory, setEditPostCategory] = useState<string>('AI·로봇')
  const [editPostTags, setEditPostTags] = useState<string[]>([])
  const [editPostTagInput, setEditPostTagInput] = useState('')
  const [editPostNotifyComment, setEditPostNotifyComment] = useState(true)
  const [editPostNotifyEmail, setEditPostNotifyEmail] = useState('')
  const [editPostSubmitting, setEditPostSubmitting] = useState(false)
  const [editPostError, setEditPostError] = useState('')

  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentForm, setEditCommentForm] = useState({ author_name: '', content: '' })
  const [editCommentWritingLang, setEditCommentWritingLang] = useState<'ko' | 'ja'>('ko')
  const [editCommentNotify, setEditCommentNotify] = useState(true)
  const [editCommentNotifyEmail, setEditCommentNotifyEmail] = useState('')
  const [editCommentSubmitting, setEditCommentSubmitting] = useState(false)
  const [editCommentError, setEditCommentError] = useState('')

  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)

  const REPORT_REASONS = {
    ko: ['스팸·광고', '욕설·비방', '허위정보', '기타'],
    ja: ['スパム・広告', '誹謗中傷', '虚偽情報', 'その他'],
  }

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then((data) => { setPost(data); setLoading(false) })
  }, [id])

  useEffect(() => {
    fetch(`/api/posts/${id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
  }, [id])

  useEffect(() => {
    const detected = navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'ko'
    setCommentWritingLang(detected)
    setReplyWritingLang(detected)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.email || ''
        setCommentForm((f) => ({ ...f, author_name: name }))
        setReplyForm((f) => ({ ...f, author_name: name }))
        setCommentNotifyEmail(data.user.email ?? '')
        setReplyNotifyEmail(data.user.email ?? '')
      }
    })
  }, [])

  const isAdmin = !!(user && user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL)

  async function handleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  function isOwner(item: { user_id: string | null }) {
    return !!(user && item.user_id && item.user_id === user.id)
  }

  async function handleStatusChange(target: 'post' | 'comment', targetId: string, status: string) {
    const url = target === 'post'
      ? `/api/posts/${id}`
      : `/api/posts/${id}/comments/${targetId}`

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const updated = await res.json()

    if (!res.ok) {
      alert(`[Admin 오류 ${res.status}] ${updated.error ?? '알 수 없는 오류'}`)
      return
    }

    if (target === 'post') {
      setPost((prev) => prev ? { ...prev, status: updated.status } : prev)
    } else {
      setComments((prev) => prev.map((c) => c.id === targetId ? { ...c, status: updated.status } : c))
    }
  }

  function startEditPost() {
    if (!post) return
    const title = post.original_lang === 'ko' ? post.title_ko : post.title_ja
    const content = post.original_lang === 'ko' ? post.content_ko : post.content_ja
    setEditPostWritingLang(post.original_lang)
    setEditPostCategory(post.category || 'AI·로봇')
    setEditPostTags(post.tags || [])
    setEditPostTagInput('')
    setEditPostNotifyComment(post.notify_comment ?? true)
    setEditPostNotifyEmail(post.notify_email || user?.email || '')
    setEditPostForm({
      author_name: user ? (user.user_metadata?.full_name || user.email || '') : '',
      title,
      content,
    })
    setEditPostError('')
    setEditingPost(true)
  }

  async function handleEditPostSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEditPostSubmitting(true)
    setEditPostError('')
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editPostForm,
          original_lang: editPostWritingLang,
          category: editPostCategory,
          tags: editPostTags,
          notify_comment: editPostNotifyComment,
          notify_email: editPostNotifyComment ? editPostNotifyEmail.trim() : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await res.json()
      setPost(updated)
      setEditingPost(false)
    } catch (err) {
      setEditPostError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setEditPostSubmitting(false)
    }
  }

  function startEditComment(node: CommentNode) {
    const content = node.original_lang === 'ko' ? node.content_ko : node.content_ja
    setEditCommentWritingLang(node.original_lang)
    setEditCommentNotify(node.notify_reply ?? true)
    setEditCommentNotifyEmail(node.notify_email || user?.email || '')
    setEditCommentForm({
      author_name: user ? (user.user_metadata?.full_name || user.email || '') : '',
      content,
    })
    setEditCommentError('')
    setEditingComment(node.id)
  }

  async function handleEditCommentSubmit(e: React.FormEvent, commentId: string) {
    e.preventDefault()
    setEditCommentSubmitting(true)
    setEditCommentError('')
    try {
      const res = await fetch(`/api/posts/${id}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editCommentForm,
          original_lang: editCommentWritingLang,
          notify_reply: editCommentNotify,
          notify_email: editCommentNotify ? editCommentNotifyEmail.trim() : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await res.json()
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, ...updated } : c))
      setEditingComment(null)
    } catch (err) {
      setEditCommentError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setEditCommentSubmitting(false)
    }
  }

  async function submitReport() {
    if (!reportTarget) return
    setReportSubmitting(true)
    const url = reportTarget.type === 'post'
      ? `/api/posts/${id}/report`
      : `/api/posts/${id}/comments/${reportTarget.id}/report`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reportReason }),
    })
    setReportSubmitting(false)
    setReportSuccess(true)
  }

  function openDeleteModal(modal: typeof deleteModal) {
    // 로그인 오너면 confirm만으로 바로 삭제
    const item = modal?.type === 'post' ? post : comments.find((c) => c.id === (modal as { commentId: string }).commentId)
    if (item && isOwner(item)) {
      if (confirm(lang === 'ko' ? '정말 삭제하시겠습니까?' : '本当に削除しますか？')) {
        deleteItem(modal, '')
      }
      return
    }
    setDeleteModal(modal)
    setDeleteAuthor('')
    setDeleteError('')
  }

  async function deleteItem(modal: typeof deleteModal, authorName: string) {
    if (!modal) return
    setDeleting(true)
    try {
      const url = modal.type === 'post'
        ? `/api/posts/${id}`
        : `/api/posts/${id}/comments/${modal.commentId}`

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_name: authorName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      if (modal.type === 'post') {
        window.location.href = '/'
      } else {
        setComments((prev) => prev.filter((c) => c.id !== modal.commentId))
        setDeleteModal(null)
        setDeleteAuthor('')
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDelete() {
    await deleteItem(deleteModal, deleteAuthor)
  }

  async function handleReplySubmit(e: React.FormEvent, parentId: string) {
    e.preventDefault()
    setReplyError('')
    setSubmittingReply(true)
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...replyForm,
          original_lang: replyWritingLang,
          parent_id: parentId,
          notify_reply: replyNotify,
          notify_email: replyNotify ? replyNotifyEmail.trim() : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '오류가 발생했습니다.')
      }
      const newComment = await res.json()
      setComments((prev) => [...prev, newComment])
      setReplyingTo(null)
      setReplyForm((f) => ({ ...f, content: '' }))
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmittingReply(false)
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCommentError('')
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...commentForm,
          original_lang: commentWritingLang,
          notify_reply: commentNotify,
          notify_email: commentNotify ? commentNotifyEmail.trim() : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '오류가 발생했습니다.')
      }
      const newComment = await res.json()
      setComments((prev) => [...prev, newComment])
      const keepName = user ? (user.user_metadata?.full_name || user.email || '') : ''
      setCommentForm({ author_name: keepName, content: '' })
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        {lang === 'ko' ? '불러오는 중...' : '読み込み中...'}
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        {lang === 'ko' ? '게시글을 찾을 수 없습니다.' : '投稿が見つかりません。'}
      </div>
    )
  }

  const isTranslated = post.original_lang !== lang

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/?lang=${lang}`} className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            ← {lang === 'ko' ? '목록으로' : '一覧へ'}
          </Link>
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className={`bg-white rounded-xl border p-8 ${post.status === 'hidden' ? 'border-orange-200' : 'border-gray-200'}`}>
          {post.status === 'hidden' && (
            <div className="mb-4 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-600 font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{lang === 'ko' ? '[숨김] 운영자에게만 표시되는 게시글입니다.' : '[非表示] 管理者にのみ表示されています。'}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              post.category ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-100'
            }`}>
              {getCategoryLabel(post.category, lang)}
            </span>
            {post.tags && post.tags.length > 0 && post.tags.map((tag) => (
              <span key={tag} className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
            {isTranslated && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                🤖 {lang === 'ko' ? 'Claude AI 번역' : 'Claude AI翻訳'}
              </span>
            )}
          </div>

          {editingPost ? (
            <form onSubmit={handleEditPostSubmit} className="space-y-5 mb-6 bg-gray-50 rounded-xl p-5 border border-gray-200">

              {/* 작성 언어 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {lang === 'ko' ? '작성 언어' : '投稿言語'}
                </label>
                <div className="flex gap-2">
                  {(['ko', 'ja'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setEditPostWritingLang(l)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        editPostWritingLang === l
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {l === 'ko' ? '한국어로 작성' : '日本語で作成'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {editPostWritingLang === 'ko'
                    ? '한국어로 작성 → 일본어 자동 번역 저장'
                    : '日本語で作成 → 韓国語に自動翻訳して保存'}
                </p>
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {lang === 'ko' ? '카테고리' : 'カテゴリ'}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setEditPostCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        editPostCategory === cat.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {cat[lang]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ko' ? '태그' : 'タグ'}
                  <span className="text-gray-400 font-normal ml-1 text-xs">
                    {lang === 'ko' ? '(선택 · 최대 5개 · 엔터로 추가)' : '(任意 · 最大5個 · Enterで追加)'}
                  </span>
                </label>
                <input
                  type="text"
                  value={editPostTagInput}
                  onChange={(e) => setEditPostTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const trimmed = editPostTagInput.trim()
                      if (trimmed && !editPostTags.includes(trimmed) && editPostTags.length < 5) {
                        setEditPostTags([...editPostTags, trimmed])
                      }
                      setEditPostTagInput('')
                    }
                  }}
                  placeholder={lang === 'ko' ? '태그 입력 후 엔터' : 'タグを入力してEnter'}
                  disabled={editPostTags.length >= 5}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
                {editPostTags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {editPostTags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setEditPostTags(editPostTags.filter((_, idx) => idx !== i))}
                          className="text-blue-400 hover:text-blue-700 leading-none"
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ko' ? '제목' : 'タイトル'}
                </label>
                <input
                  type="text"
                  required
                  value={editPostForm.title}
                  onChange={(e) => setEditPostForm({ ...editPostForm, title: e.target.value })}
                  placeholder={lang === 'ko' ? '제목을 입력하세요' : 'タイトルを入力してください'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ko' ? '내용' : '内容'}
                </label>
                <textarea
                  required
                  rows={10}
                  value={editPostForm.content}
                  onChange={(e) => setEditPostForm({ ...editPostForm, content: e.target.value })}
                  placeholder={lang === 'ko' ? '내용을 입력하세요' : '内容を入力してください'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 댓글 알림 설정 */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={editPostNotifyComment}
                    onChange={(e) => setEditPostNotifyComment(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {lang === 'ko' ? '댓글이 달리면 이메일로 알림 받기' : 'コメントが届いたらメールで通知する'}
                  </span>
                </label>
                {editPostNotifyComment && (
                  <div className="flex items-center gap-2 pl-6">
                    <label className="text-xs text-gray-500 shrink-0">
                      {lang === 'ko' ? '알림 받을 이메일' : '通知先メール'}
                    </label>
                    <input
                      type="email"
                      value={editPostNotifyEmail}
                      onChange={(e) => setEditPostNotifyEmail(e.target.value)}
                      placeholder={lang === 'ko' ? '이메일 주소' : 'メールアドレス'}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-blue-500">
                🤖 {lang === 'ko' ? '저장 시 반대 언어로 자동 번역됩니다.' : '保存時に自動翻訳されます。'}
              </p>
              {editPostError && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{editPostError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPost(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  {lang === 'ko' ? '취소' : 'キャンセル'}
                </button>
                <button
                  type="submit"
                  disabled={editPostSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {editPostSubmitting
                    ? (lang === 'ko' ? '번역 중...' : '翻訳中...')
                    : (lang === 'ko' ? '저장' : '保存')}
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                {lang === 'ko' ? post.title_ko : post.title_ja}
              </h1>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-100 flex-wrap">
                <span>{post.author_name}</span>
                <span>{new Date(post.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                {post.updated_at && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {lang === 'ko' ? '수정됨' : '編集済み'}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setReportTarget({ type: 'post', id }); setReportReason(''); setReportSuccess(false) }}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                  >
                    {lang === 'ko' ? '신고' : '通報'}
                  </button>
                  {isAdmin && (
                    <div className="flex gap-1">
                      {post.status !== 'hidden' && (
                        <button
                          onClick={() => handleStatusChange('post', id, 'hidden')}
                          className="text-xs px-2 py-0.5 rounded border border-orange-200 text-orange-500 hover:bg-orange-50"
                        >
                          {lang === 'ko' ? '숨기기' : '非表示'}
                        </button>
                      )}
                      {post.status === 'hidden' && (
                        <button
                          onClick={() => handleStatusChange('post', id, 'active')}
                          className="text-xs px-2 py-0.5 rounded border border-green-200 text-green-600 hover:bg-green-50"
                        >
                          {lang === 'ko' ? '복구' : '復元'}
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange('post', id, 'deleted')}
                        className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        {lang === 'ko' ? '삭제' : '削除'}
                      </button>
                    </div>
                  )}
                  {user && isOwner(post) && (
                    <>
                      <button
                        onClick={startEditPost}
                        className="text-xs text-blue-400 hover:text-blue-600 hover:underline"
                      >
                        {lang === 'ko' ? '수정' : '編集'}
                      </button>
                      <button
                        onClick={() => openDeleteModal({ type: 'post' })}
                        className="text-xs text-red-400 hover:text-red-600 hover:underline"
                      >
                        {lang === 'ko' ? '삭제' : '削除'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                {lang === 'ko' ? post.content_ko : post.content_ja}
              </div>
            </>
          )}

          {post.attachments && post.attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-3">
                {lang === 'ko' ? '첨부파일' : '添付ファイル'}
              </p>
              {/* 이미지 그리드 */}
              {post.attachments.filter((a: Attachment) => a.type.startsWith('image/')).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {post.attachments
                    .filter((a: Attachment) => a.type.startsWith('image/'))
                    .map((a: Attachment, i: number) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.url}
                          alt={a.name}
                          className="w-full h-40 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                </div>
              )}
              {/* 비이미지 파일 목록 */}
              {post.attachments.filter((a: Attachment) => !a.type.startsWith('image/')).length > 0 && (
                <ul className="space-y-2">
                  {post.attachments
                    .filter((a: Attachment) => !a.type.startsWith('image/'))
                    .map((a: Attachment, i: number) => (
                      <li key={i}>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
                        >
                          <span className="text-2xl">
                            {a.type === 'application/pdf' ? '📄'
                              : a.type.includes('spreadsheet') || a.type.includes('excel') ? '📊'
                              : '📝'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                            <p className="text-xs text-gray-400">
                              {a.size >= 1024 * 1024
                                ? `${(a.size / 1024 / 1024).toFixed(1)}MB`
                                : `${Math.round(a.size / 1024)}KB`}
                            </p>
                          </div>
                          <span className="text-xs text-blue-500 shrink-0">
                            {lang === 'ko' ? '다운로드' : 'ダウンロード'}
                          </span>
                        </a>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </article>

        {lang !== post.original_lang && (
          <div className="mt-6 bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-500 font-medium mb-3">
              {lang === 'ko' ? '🤖 이 글은 자동 번역된 글입니다' : '🤖 この記事は自動翻訳されています'}
            </p>
            <button
              onClick={() => setLang(post.original_lang)}
              className="text-sm text-blue-600 hover:underline"
            >
              {lang === 'ko' ? '→ 일본어 원문 보기' : '→ 韓国語の原文を見る'}
            </button>
          </div>
        )}

        {/* 댓글 섹션 */}
        <div className="mt-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            {lang === 'ko' ? `댓글 ${comments.length}개` : `コメント ${comments.length}件`}
          </h2>

          {/* 댓글 목록 */}
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 bg-white rounded-xl border border-gray-100">
              {lang === 'ko' ? '첫 번째 댓글을 남겨보세요.' : '最初のコメントを残してみてください。'}
            </p>
          ) : (
            <div className="space-y-3 mb-4">
              {(function renderTree(nodes: CommentNode[], depth: number): ReactNode {
                return nodes.map((node) => (
                  <div key={node.id} className={depth > 0 ? 'mt-2 ml-3 sm:ml-5 border-l-2 border-gray-100 pl-2 sm:pl-3' : ''}>
                    <div className={`bg-white rounded-xl p-4 ${
                      node.status === 'hidden'
                        ? 'border border-orange-200 opacity-70'
                        : depth === 0 ? 'border border-gray-200' : 'border border-gray-100'
                    }`}>
                      {node.status === 'hidden' && (
                        <p className="text-xs text-orange-500 mb-2">⚠️ {lang === 'ko' ? '[숨김]' : '[非表示]'}</p>
                      )}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {depth > 0 && <span className="text-gray-300 text-xs shrink-0">↳</span>}
                          <span className="text-sm font-medium text-gray-800">{node.author_name}</span>
                          {node.original_lang !== lang && (
                            <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                              🤖 {lang === 'ko' ? 'AI 번역' : 'AI翻訳'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <span className="text-xs text-gray-400">
                            {new Date(node.created_at).toLocaleDateString(
                              lang === 'ko' ? 'ko-KR' : 'ja-JP',
                              { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                          {depth < 2 && (
                            <button
                              onClick={() => {
                                if (!user) { handleLogin(); return }
                                setReplyingTo(replyingTo === node.id ? null : node.id)
                                setReplyError('')
                              }}
                              className="text-xs text-blue-400 hover:text-blue-600 hover:underline"
                            >
                              {lang === 'ko' ? '답글' : '返信'}
                            </button>
                          )}
                          <button
                            onClick={() => { setReportTarget({ type: 'comment', id: node.id }); setReportReason(''); setReportSuccess(false) }}
                            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                          >
                            {lang === 'ko' ? '신고' : '通報'}
                          </button>
                          {isAdmin && (
                            <div className="flex gap-1">
                              {node.status !== 'hidden' && (
                                <button
                                  onClick={() => handleStatusChange('comment', node.id, 'hidden')}
                                  className="text-xs px-1.5 py-0.5 rounded border border-orange-200 text-orange-500 hover:bg-orange-50"
                                >
                                  {lang === 'ko' ? '숨김' : '非表示'}
                                </button>
                              )}
                              {node.status === 'hidden' && (
                                <button
                                  onClick={() => handleStatusChange('comment', node.id, 'active')}
                                  className="text-xs px-1.5 py-0.5 rounded border border-green-200 text-green-600 hover:bg-green-50"
                                >
                                  {lang === 'ko' ? '복구' : '復元'}
                                </button>
                              )}
                              <button
                                onClick={() => handleStatusChange('comment', node.id, 'deleted')}
                                className="text-xs px-1.5 py-0.5 rounded border border-red-200 text-red-500 hover:bg-red-50"
                              >
                                {lang === 'ko' ? '삭제' : '削除'}
                              </button>
                            </div>
                          )}
                          {user && isOwner(node) && (
                            <>
                              <button
                                onClick={() => startEditComment(node)}
                                className="text-xs text-blue-400 hover:text-blue-600 hover:underline"
                              >
                                {lang === 'ko' ? '수정' : '編集'}
                              </button>
                              <button
                                onClick={() => openDeleteModal({ type: 'comment', commentId: node.id })}
                                className="text-xs text-red-400 hover:text-red-600 hover:underline"
                              >
                                {lang === 'ko' ? '삭제' : '削除'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingComment === node.id ? (
                        <form onSubmit={(e) => handleEditCommentSubmit(e, node.id)} className="space-y-2.5 mt-1">
                          {/* 작성 언어 선택 */}
                          <div>
                            <p className="text-xs text-gray-400 mb-1">
                              {lang === 'ko' ? '작성 언어' : '投稿言語'}
                            </p>
                            <div className="flex gap-1.5">
                              {(['ko', 'ja'] as const).map((l) => (
                                <button
                                  key={l}
                                  type="button"
                                  onClick={() => setEditCommentWritingLang(l)}
                                  className={`flex-1 py-1 rounded-lg border text-xs font-medium transition-colors ${
                                    editCommentWritingLang === l
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  {l === 'ko' ? '한국어로 작성' : '日本語で作成'}
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-blue-400 mt-1">
                              🤖 {editCommentWritingLang === 'ko'
                                ? '한국어 원문 → 일본어 자동 번역'
                                : '日本語原文 → 韓国語に自動翻訳'}
                            </p>
                          </div>

                          {/* 내용 */}
                          <textarea
                            required
                            rows={3}
                            value={editCommentForm.content}
                            onChange={(e) => setEditCommentForm({ ...editCommentForm, content: e.target.value })}
                            placeholder={editCommentWritingLang === 'ko' ? '댓글을 입력하세요' : 'コメントを入力してください'}
                            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                          />

                          {/* 비로그인 시 작성자명 */}
                          {!user && (
                            <input
                              type="text"
                              required
                              value={editCommentForm.author_name}
                              onChange={(e) => setEditCommentForm({ ...editCommentForm, author_name: e.target.value })}
                              placeholder={lang === 'ko' ? '작성 시 입력한 이름' : '投稿時のお名前'}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          )}

                          {/* 답글 알림 설정 */}
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                              <input
                                type="checkbox"
                                checked={editCommentNotify}
                                onChange={(e) => setEditCommentNotify(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer"
                              />
                              <span className="text-xs text-gray-600 group-hover:text-gray-900">
                                {lang === 'ko' ? '답글이 달리면 이메일로 알림 받기' : '返信が届いたらメールで通知する'}
                              </span>
                            </label>
                            {editCommentNotify && (
                              <div className="flex items-center gap-2 pl-5">
                                <label className="text-xs text-gray-400 shrink-0">
                                  {lang === 'ko' ? '알림 이메일' : '通知先メール'}
                                </label>
                                <input
                                  type="email"
                                  value={editCommentNotifyEmail}
                                  onChange={(e) => setEditCommentNotifyEmail(e.target.value)}
                                  placeholder={lang === 'ko' ? '이메일 주소' : 'メールアドレス'}
                                  className="flex-1 border border-blue-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                              </div>
                            )}
                          </div>

                          {editCommentError && (
                            <p className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">{editCommentError}</p>
                          )}
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingComment(null)}
                              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                            >
                              {lang === 'ko' ? '취소' : 'キャンセル'}
                            </button>
                            <button
                              type="submit"
                              disabled={editCommentSubmitting}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                            >
                              {editCommentSubmitting
                                ? (lang === 'ko' ? '번역 중...' : '翻訳中...')
                                : (lang === 'ko' ? '저장' : '保存')}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {lang === 'ko' ? node.content_ko : node.content_ja}
                          {node.updated_at && (
                            <span className="ml-2 text-xs text-gray-400">
                              ({lang === 'ko' ? '수정됨' : '編集済み'})
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* 인라인 답글 폼 */}
                    {replyingTo === node.id && (
                      <div className="mt-2 ml-3 sm:ml-5">
                        <form
                          onSubmit={(e) => handleReplySubmit(e, node.id)}
                          className="bg-blue-50 rounded-xl border border-blue-100 p-3 space-y-2"
                        >
                          <p className="text-xs text-blue-500 font-medium">
                            ↳ {lang === 'ko' ? `@${node.author_name}에게 답글` : `@${node.author_name}への返信`}
                          </p>

                          {/* 답글 작성 언어 선택 */}
                          <div className="flex gap-1.5">
                            {(replyWritingLang === 'ko' ? (['ko', 'ja'] as const) : (['ja', 'ko'] as const)).map((l) => (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setReplyWritingLang(l)}
                                className={`flex-1 py-1 rounded-lg border text-xs font-medium transition-colors ${
                                  replyWritingLang === l
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {l === 'ko' ? '한국어로' : '日本語で'}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-blue-400">
                            🤖 {replyWritingLang === 'ko'
                              ? '한국어 원문 → 일본어 자동 번역'
                              : '日本語原文 → 韓国語に自動翻訳'}
                          </p>

                          <input
                            type="text"
                            required
                            value={replyForm.author_name}
                            onChange={(e) => !user && setReplyForm({ ...replyForm, author_name: e.target.value })}
                            readOnly={!!user}
                            placeholder={lang === 'ko' ? '이름 또는 회사명' : 'お名前または会社名'}
                            className={`w-full border border-blue-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${user ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                          />
                          <textarea
                            required
                            rows={2}
                            value={replyForm.content}
                            onChange={(e) => setReplyForm({ ...replyForm, content: e.target.value })}
                            placeholder={replyWritingLang === 'ko' ? '답글을 입력하세요' : '返信を入力してください'}
                            className="w-full border border-blue-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
                          />
                          {/* 답글 알림 설정 */}
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                              <input
                                type="checkbox"
                                checked={replyNotify}
                                onChange={(e) => setReplyNotify(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer"
                              />
                              <span className="text-xs text-gray-600 group-hover:text-gray-900">
                                {lang === 'ko' ? '답글이 달리면 이메일로 알림 받기' : '返信が届いたらメールで通知する'}
                              </span>
                            </label>
                            {replyNotify && (
                              <div className="flex items-center gap-2 pl-5">
                                <label className="text-xs text-gray-400 shrink-0">
                                  {lang === 'ko' ? '알림 이메일' : '通知先メール'}
                                </label>
                                <input
                                  type="email"
                                  value={replyNotifyEmail}
                                  onChange={(e) => setReplyNotifyEmail(e.target.value)}
                                  placeholder={lang === 'ko' ? '이메일 주소' : 'メールアドレス'}
                                  className="flex-1 border border-blue-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                />
                              </div>
                            )}
                          </div>

                          {replyError && (
                            <p className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">{replyError}</p>
                          )}
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => { setReplyingTo(null); setReplyError('') }}
                              className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              {lang === 'ko' ? '취소' : 'キャンセル'}
                            </button>
                            <button
                              type="submit"
                              disabled={submittingReply}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                            >
                              {submittingReply
                                ? (lang === 'ko' ? '번역 중...' : '翻訳中...')
                                : (lang === 'ko' ? '답글 등록' : '返信する')}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* 재귀 자식 댓글 */}
                    {node.replies.length > 0 && renderTree(node.replies, depth + 1)}
                  </div>
                ))
              })(buildTree(comments), 0)}
            </div>
          )}

          {/* 댓글 입력폼 */}
          {!user ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">
                {lang === 'ko' ? '로그인이 필요합니다' : 'ログインが必要です'}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {lang === 'ko' ? '댓글을 작성하려면 Google 로그인이 필요합니다.' : 'コメントを投稿するにはGoogleログインが必要です。'}
              </p>
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {lang === 'ko' ? 'Google로 로그인' : 'Googleでログイン'}
              </button>
            </div>
          ) : (
          <form onSubmit={handleCommentSubmit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            {/* 작성 언어 선택 */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">
                {lang === 'ko' ? '작성 언어' : '投稿言語'}
              </p>
              <div className="flex gap-2">
                {(commentWritingLang === 'ko' ? (['ko', 'ja'] as const) : (['ja', 'ko'] as const)).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setCommentWritingLang(l)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      commentWritingLang === l
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {l === 'ko' ? '한국어로 작성' : '日本語で作成'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {commentWritingLang === 'ko'
                  ? '🤖 한국어 원문 → 일본어 자동 번역'
                  : '🤖 日本語原文 → 韓国語に自動翻訳'}
              </p>
            </div>

            <input
              type="text"
              required
              value={commentForm.author_name}
              onChange={(e) => !user && setCommentForm({ ...commentForm, author_name: e.target.value })}
              readOnly={!!user}
              placeholder={lang === 'ko' ? '이름 또는 회사명' : 'お名前または会社名'}
              className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${user ? 'bg-gray-50 text-gray-500' : ''}`}
            />
            <textarea
              required
              rows={3}
              value={commentForm.content}
              onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
              placeholder={commentWritingLang === 'ko' ? '댓글을 입력하세요' : 'コメントを入力してください'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {/* 댓글 알림 설정 */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={commentNotify}
                  onChange={(e) => setCommentNotify(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer"
                />
                <span className="text-xs text-gray-600 group-hover:text-gray-900">
                  {lang === 'ko' ? '답글이 달리면 이메일로 알림 받기' : '返信が届いたらメールで通知する'}
                </span>
              </label>
              {commentNotify && (
                <div className="flex items-center gap-2 pl-5">
                  <label className="text-xs text-gray-400 shrink-0">
                    {lang === 'ko' ? '알림 이메일' : '通知先メール'}
                  </label>
                  <input
                    type="email"
                    value={commentNotifyEmail}
                    onChange={(e) => setCommentNotifyEmail(e.target.value)}
                    placeholder={lang === 'ko' ? '이메일 주소' : 'メールアドレス'}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            {commentError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{commentError}</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submittingComment
                  ? (lang === 'ko' ? '번역 중...' : '翻訳中...')
                  : (lang === 'ko' ? '댓글 등록' : 'コメントを投稿')}
              </button>
            </div>
          </form>
          )}
        </div>
      </main>

      {/* 삭제 확인 모달 */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {deleteModal.type === 'post'
                ? (lang === 'ko' ? '게시글 삭제' : '投稿を削除')
                : (lang === 'ko' ? '댓글 삭제' : 'コメントを削除')}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {lang === 'ko'
                ? '작성자명을 입력하면 삭제됩니다.'
                : '投稿者名を入力すると削除されます。'}
            </p>
            <input
              type="text"
              autoFocus
              value={deleteAuthor}
              onChange={(e) => setDeleteAuthor(e.target.value)}
              placeholder={lang === 'ko' ? '작성자명' : '投稿者名'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
            />
            {deleteError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteModal(null); setDeleteAuthor(''); setDeleteError('') }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                {lang === 'ko' ? '취소' : 'キャンセル'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !deleteAuthor.trim()}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting
                  ? (lang === 'ko' ? '삭제 중...' : '削除中...')
                  : (lang === 'ko' ? '삭제' : '削除')}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {reportTarget.type === 'post'
                    ? (lang === 'ko' ? '게시글 신고' : '投稿を通報')
                    : (lang === 'ko' ? '댓글 신고' : 'コメントを通報')}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {lang === 'ko' ? '신고 사유를 선택해주세요.' : '通報理由を選択してください。'}
                </p>
                <div className="space-y-2 mb-4">
                  {REPORT_REASONS[lang].map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="report-reason"
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
    </div>
  )
}
