export interface UserProfile {
  id: string;
  email: string;
  name: string;
  birthdate?: string | null;
  bio?: string | null;
  gender?: string | null;
  lookingFor?: string | null;
  photos: string[];
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  showMe: boolean;
  onboardingDone: boolean;
  lastActive: string;
  createdAt: string;
  interests: Interest[];
}

export interface Interest {
  id: string;
  name: string;
  emoji?: string | null;
}

export interface Swipe {
  id: string;
  swiperId: string;
  swipedId: string;
  direction: 'like' | 'pass' | 'superlike';
  createdAt: string;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  otherUser?: UserProfile;
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    photos: string[];
  };
}

export interface SwipeAction {
  direction: 'like' | 'pass' | 'superlike';
  userId: string;
}

export interface DiscoverFilters {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  gender?: string;
}

export type SwipeDirection = 'left' | 'right' | 'up' | null;
