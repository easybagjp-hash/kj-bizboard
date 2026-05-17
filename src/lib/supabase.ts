import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Attachment = {
  name: string
  url: string
  type: string
  size: number
}

export type PostStatus = 'active' | 'hidden' | 'deleted'

export type Post = {
  id: string
  title_ko: string
  title_ja: string
  content_ko: string
  content_ja: string
  original_lang: 'ko' | 'ja'
  author_name: string
  category: string
  created_at: string
  updated_at: string | null
  user_id: string | null
  attachments: Attachment[] | null
  status: PostStatus
  tags: string[] | null
}

export type Comment = {
  id: string
  post_id: string
  parent_id: string | null
  content_ko: string
  content_ja: string
  original_lang: 'ko' | 'ja'
  author_name: string
  created_at: string
  updated_at: string | null
  user_id: string | null
  status: PostStatus
}
