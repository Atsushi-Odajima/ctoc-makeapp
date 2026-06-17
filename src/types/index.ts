export interface UserProfile {
  id: string
  email: string
  name: string
  username: string
  bio?: string | null
  avatar?: string | null
  website?: string | null
  isPrivate: boolean
  onboardingDone: boolean
  lastActive: string
  createdAt: string
  followersCount?: number
  followingCount?: number
  postsCount?: number
  isFollowing?: boolean
  isMe?: boolean
}

export interface Post {
  id: string
  userId: string
  caption?: string | null
  images: string[]
  location?: string | null
  createdAt: string
  updatedAt: string
  user: Pick<UserProfile, "id" | "name" | "username" | "avatar">
  likesCount: number
  commentsCount: number
  isLiked: boolean
  isSaved?: boolean
}

export interface Comment {
  id: string
  postId: string
  userId: string
  content: string
  parentId?: string | null
  createdAt: string
  user: Pick<UserProfile, "id" | "name" | "username" | "avatar">
  replies?: Comment[]
}

export interface Story {
  id: string
  userId: string
  imageUrl: string
  caption?: string | null
  expiresAt: string
  createdAt: string
  user: Pick<UserProfile, "id" | "name" | "username" | "avatar">
  seen?: boolean
}

export interface Notification {
  id: string
  userId: string
  type: "like" | "comment" | "follow" | "mention" | "footprint"
  fromUserId?: string | null
  postId?: string | null
  content?: string | null
  read: boolean
  createdAt: string
  fromUser?: Pick<UserProfile, "id" | "name" | "username" | "avatar">
  post?: { id: string; images: string[] }
}

export interface Footprint {
  id: string
  visitorId: string
  visitedId: string
  visitedAt: string
  visitor: Pick<UserProfile, "id" | "name" | "username" | "avatar">
}

export interface Conversation {
  id: string
  createdAt: string
  updatedAt: string
  otherUser: Pick<UserProfile, "id" | "name" | "username" | "avatar">
  lastMessage?: DirectMessage | null
}

export interface DirectMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  readAt?: string | null
  createdAt: string
  sender?: Pick<UserProfile, "id" | "name" | "username" | "avatar">
}
