export interface Profile {
  id: string
  nickname: string
  bio: string
  avatar: string // 絵文字 or 画像URL
  is_admin: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Thread {
  id: string
  category_id: string
  author_id: string
  title: string
  body: string
  image_url: string | null
  created_at: string
  updated_at: string
  // thread_list ビュー由来
  comment_count?: number
  like_count?: number
  // embed
  category?: Category
  author?: Profile
}

export interface Comment {
  id: string
  thread_id: string
  author_id: string
  parent_id: string | null
  body: string
  created_at: string
  updated_at: string
  author?: Profile
}

export type TargetType = 'thread' | 'comment'
export type Reaction = 'like' | 'akan' | 'kento'

export interface Like {
  id: string
  user_id: string
  target_type: TargetType
  target_id: string
  reaction: Reaction
  created_at: string
  user?: Profile
}

export interface Report {
  id: string
  reporter_id: string
  target_type: TargetType
  target_id: string
  reason: string
  resolved: boolean
  created_at: string
  reporter?: Profile
}

export const REACTIONS: { key: Reaction; emoji: string; label: string }[] = [
  { key: 'like', emoji: '👍', label: 'いいね！' },
  { key: 'akan', emoji: '🙅‍♂️', label: 'アカン！' },
  { key: 'kento', emoji: '✅', label: '要検討' },
]

export const REACTION_MAP = Object.fromEntries(
  REACTIONS.map((r) => [r.key, r])
) as Record<Reaction, (typeof REACTIONS)[number]>
