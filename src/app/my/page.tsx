'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Post, Comment } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-browser'

type CommentWithPost = Comment & { posts: { title_ko: string; title_ja: string } }

export default function MyPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'ko' | 'ja'>('ko')
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<CommentWithPost[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'posts' | 'comments'>('posts')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/'); return }
      fetch('/api/my')
        .then((r) => r.json())
        .then((d) => { setPosts(d.posts); setComments(d.comments); setLoading(false) })
    })
  }, [router])

  async function deletePost(postId: string) {
    if (!confirm(lang === 'ko' ? '게시글을 삭제하시겠습니까?' : '投稿を削除しますか？')) return
    setDeleting(postId)
    await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: '' }),
    })
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    setDeleting(null)
  }

  async function deleteComment(commentId: string) {
    if (!confirm(lang === 'ko' ? '댓글을 삭제하시겠습니까?' : 'コメントを削除しますか？')) return
    setDeleting(commentId)
    const comment = comments.find((c) => c.id === commentId)
    if (!comment) return
    await fetch(`/api/posts/${comment.post_id}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: '' }),
    })
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            ← {lang === 'ko' ? '목록으로' : '一覧へ'}
          </Link>
          <h1 className="text-lg font-bold text-gray-900">
            {lang === 'ko' ? '내 글 관리' : 'マイ投稿管理'}
          </h1>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(lang === 'ko' ? (['ko', 'ja'] as const) : (['ja', 'ko'] as const)).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 ${lang === l ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                {l === 'ko' ? '한국어' : '日本語'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('posts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'posts' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {lang === 'ko' ? `게시글 ${posts.length}` : `投稿 ${posts.length}`}
          </button>
          <button
            onClick={() => setTab('comments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'comments' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {lang === 'ko' ? `댓글 ${comments.length}` : `コメント ${comments.length}`}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            {lang === 'ko' ? '불러오는 중...' : '読み込み中...'}
          </div>
        ) : tab === 'posts' ? (
          posts.length === 0 ? (
            <p className="text-center py-20 text-gray-400">
              {lang === 'ko' ? '작성한 게시글이 없습니다.' : '投稿した記事がありません。'}
            </p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/posts/${post.id}?lang=${lang}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                          {post.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(post.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'ja-JP')}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">
                        {lang === 'ko' ? post.title_ko : post.title_ja}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {lang === 'ko' ? post.content_ko : post.content_ja}
                      </p>
                    </Link>
                    <button
                      onClick={() => deletePost(post.id)}
                      disabled={deleting === post.id}
                      className="text-xs text-red-400 hover:text-red-600 shrink-0 disabled:opacity-40"
                    >
                      {deleting === post.id ? '...' : (lang === 'ko' ? '삭제' : '削除')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          comments.length === 0 ? (
            <p className="text-center py-20 text-gray-400">
              {lang === 'ko' ? '작성한 댓글이 없습니다.' : '投稿したコメントがありません。'}
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/posts/${comment.post_id}?lang=${lang}`}
                        className="text-xs text-blue-600 hover:underline mb-2 block truncate"
                      >
                        {lang === 'ko' ? comment.posts.title_ko : comment.posts.title_ja}
                      </Link>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {lang === 'ko' ? comment.content_ko : comment.content_ja}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(comment.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'ja-JP')}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      disabled={deleting === comment.id}
                      className="text-xs text-red-400 hover:text-red-600 shrink-0 disabled:opacity-40"
                    >
                      {deleting === comment.id ? '...' : (lang === 'ko' ? '삭제' : '削除')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  )
}
