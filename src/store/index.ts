import { create } from "zustand"
import { UserProfile } from "@/types"

interface AppState {
  currentUser: UserProfile | null
  setCurrentUser: (user: UserProfile | null) => void

  notifications: number
  setNotifications: (count: number) => void
  incrementNotifications: () => void
  clearNotifications: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  notifications: 0,
  setNotifications: (count) => set({ notifications: count }),
  incrementNotifications: () => set((state) => ({ notifications: state.notifications + 1 })),
  clearNotifications: () => set({ notifications: 0 }),
}))
