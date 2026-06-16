import { create } from 'zustand';
import { UserProfile, Match, Message } from '@/types';

interface AppState {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;

  matches: Match[];
  setMatches: (matches: Match[]) => void;

  activeMatchId: string | null;
  setActiveMatchId: (id: string | null) => void;

  messages: Record<string, Message[]>;
  setMessages: (matchId: string, messages: Message[]) => void;
  addMessage: (matchId: string, message: Message) => void;

  newMatch: UserProfile | null;
  setNewMatch: (user: UserProfile | null) => void;

  notifications: number;
  setNotifications: (count: number) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  matches: [],
  setMatches: (matches) => set({ matches }),

  activeMatchId: null,
  setActiveMatchId: (id) => set({ activeMatchId: id }),

  messages: {},
  setMessages: (matchId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [matchId]: messages },
    })),
  addMessage: (matchId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: [...(state.messages[matchId] || []), message],
      },
    })),

  newMatch: null,
  setNewMatch: (user) => set({ newMatch: user }),

  notifications: 0,
  setNotifications: (count) => set({ notifications: count }),
  incrementNotifications: () =>
    set((state) => ({ notifications: state.notifications + 1 })),
  clearNotifications: () => set({ notifications: 0 }),
}));
