"use client"
import { useState } from "react"
import { Plus, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn, getAvatarUrl } from "@/lib/utils"

interface StoryGroup {
  user: { id: string; name: string; username: string; avatar: string | null }
  stories: Array<{ id: string; imageUrl: string; caption?: string | null }>
}

interface Props {
  stories: StoryGroup[]
  currentUser: { name: string; username: string; avatar?: string | null }
}

export function StoriesRow({ stories, currentUser }: Props) {
  const [viewing, setViewing] = useState<StoryGroup | null>(null)
  const [storyIndex, setStoryIndex] = useState(0)

  function openStory(group: StoryGroup) {
    setViewing(group)
    setStoryIndex(0)
  }
  function closeStory() {
    setViewing(null)
  }
  function nextStory() {
    if (viewing && storyIndex < viewing.stories.length - 1) setStoryIndex(i => i + 1)
    else closeStory()
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-3 py-3 scrollbar-hide">
        <button className="flex flex-shrink-0 flex-col items-center gap-1.5">
          <div className="relative">
            <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-[#dfe3e8]">
              <img src={getAvatarUrl({ avatar: currentUser.avatar, name: currentUser.name })} alt="あなた" className="h-full w-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#e85d04]">
              <Plus className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">あなた</span>
        </button>

        {stories.map(group => (
          <button key={group.user.id} onClick={() => openStory(group)} className="flex flex-shrink-0 flex-col items-center gap-1.5">
            <div className="h-16 w-16 rounded-full bg-[#0b1f3a] p-0.5">
              <div className="h-full w-full rounded-full bg-white p-0.5">
                <img src={getAvatarUrl(group.user)} alt={group.user.name} className="h-full w-full rounded-full object-cover" />
              </div>
            </div>
            <span className="max-w-[64px] truncate text-xs font-semibold text-slate-700">{group.user.username}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 mx-auto flex max-w-lg items-center justify-center bg-black"
            onClick={nextStory}
          >
            <div className="absolute left-3 right-3 top-3 z-10 flex gap-1">
              {viewing.stories.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div className={cn("h-full rounded-full bg-white", i < storyIndex ? "w-full" : i === storyIndex ? "animate-story-progress" : "w-0")} />
                </div>
              ))}
            </div>
            <div className="absolute left-3 right-3 top-8 z-10 flex items-center gap-3">
              <img src={getAvatarUrl(viewing.user)} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
              <div>
                <span className="text-sm font-bold text-white">{viewing.user.username}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); closeStory() }} className="ml-auto rounded-full bg-white/15 p-1.5 text-white" aria-label="閉じる">
                <X className="h-5 w-5" />
              </button>
            </div>
            <img src={viewing.stories[storyIndex].imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            {viewing.stories[storyIndex].caption && (
              <div className="absolute bottom-8 left-4 right-4 rounded-2xl bg-black/35 px-3 py-2 text-center text-sm font-semibold text-white backdrop-blur">
                {viewing.stories[storyIndex].caption}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
