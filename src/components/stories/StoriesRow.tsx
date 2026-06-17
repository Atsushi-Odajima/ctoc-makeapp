"use client"
import { useState } from "react"
import { Plus } from "lucide-react"
import { getAvatarUrl } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

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

  function openStory(group: StoryGroup) { setViewing(group); setStoryIndex(0) }
  function closeStory() { setViewing(null) }
  function nextStory() {
    if (viewing && storyIndex < viewing.stories.length - 1) setStoryIndex(i => i + 1)
    else closeStory()
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-3 py-3 scrollbar-hide">
        {/* My story */}
        <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-slate-200">
              <img src={getAvatarUrl({ avatar: currentUser.avatar, name: currentUser.name })} alt="You" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">あなた</span>
        </button>

        {/* Others' stories */}
        {stories.map(group => (
          <button key={group.user.id} onClick={() => openStory(group)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-blue-600 via-cyan-500 to-blue-400">
              <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
                <img src={getAvatarUrl(group.user)} alt={group.user.name} className="w-full h-full object-cover rounded-full" />
              </div>
            </div>
            <span className="text-xs text-slate-700 font-medium max-w-[64px] truncate">{group.user.username}</span>
          </button>
        ))}
      </div>

      {/* Story viewer */}
      <AnimatePresence>
        {viewing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center max-w-lg mx-auto"
            onClick={nextStory}>
            {/* Progress bars */}
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
              {viewing.stories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  <div className={cn("h-full bg-white rounded-full", i < storyIndex ? "w-full" : i === storyIndex ? "animate-story-progress" : "w-0")} />
                </div>
              ))}
            </div>
            {/* User info */}
            <div className="absolute top-8 left-3 right-3 flex items-center gap-3 z-10">
              <img src={getAvatarUrl(viewing.user)} alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
              <span className="text-white font-semibold text-sm">{viewing.user.username}</span>
              <button onClick={(e) => { e.stopPropagation(); closeStory() }} className="ml-auto text-white text-2xl font-light">✕</button>
            </div>
            {/* Image */}
            <img src={viewing.stories[storyIndex].imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
            {viewing.stories[storyIndex].caption && (
              <div className="absolute bottom-8 left-4 right-4 text-center text-white font-medium text-sm bg-black/30 rounded-xl px-3 py-2">
                {viewing.stories[storyIndex].caption}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
