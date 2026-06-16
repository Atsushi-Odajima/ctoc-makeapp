"use client"

import { useState, useRef } from "react"
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion"
import { Heart, X, Star, MapPin, ChevronDown, ChevronUp } from "lucide-react"
import { calculateAge, parsePhotos } from "@/lib/utils"
import type { UserProfile } from "@/types"
import { cn } from "@/lib/utils"

interface SwipeCardProps {
  user: UserProfile
  onSwipe: (direction: "like" | "pass" | "superlike") => void
  isTop?: boolean
}

export function SwipeCard({ user, onSwipe, isTop = false }: SwipeCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const passOpacity = useTransform(x, [-100, -20], [1, 0])
  const superlikeOpacity = useTransform(y, [-100, -30], [1, 0])
  const cardRef = useRef<HTMLDivElement>(null)

  const photos = parsePhotos(user.photos)
  const age = user.birthdate ? calculateAge(user.birthdate) : null

  function handleDragEnd() {
    const xVal = x.get()
    const yVal = y.get()

    if (yVal < -80) {
      onSwipe("superlike")
    } else if (xVal > 100) {
      onSwipe("like")
    } else if (xVal < -100) {
      onSwipe("pass")
    }
    x.set(0)
    y.set(0)
  }

  function nextPhoto(e: React.MouseEvent) {
    e.stopPropagation()
    if (photos.length > 1) {
      setPhotoIndex(prev => (prev + 1) % photos.length)
    }
  }

  function prevPhoto(e: React.MouseEvent) {
    e.stopPropagation()
    if (photos.length > 1) {
      setPhotoIndex(prev => (prev - 1 + photos.length) % photos.length)
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className="absolute inset-0 swipe-card cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, touchAction: "none" }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
    >
      <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20 bg-white">
        {/* Photo */}
        <div className="relative h-full">
          {photos.length > 0 ? (
            <img
              src={photos[photoIndex] || photos[0]}
              alt={user.name}
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
              <div className="text-6xl">👤</div>
            </div>
          )}

          {/* Photo tap areas */}
          {photos.length > 1 && (
            <>
              <div className="absolute left-0 top-0 w-1/3 h-full" onClick={prevPhoto} />
              <div className="absolute right-0 top-0 w-1/3 h-full" onClick={nextPhoto} />
            </>
          )}

          {/* Photo dots */}
          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 px-4">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 h-1 rounded-full max-w-12 transition-all",
                    i === photoIndex ? "bg-white" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Swipe indicators */}
          {isTop && (
            <>
              <motion.div
                className="absolute top-10 left-6 bg-green-500 text-white font-black text-3xl px-4 py-2 rounded-2xl border-4 border-green-400 rotate-[-20deg]"
                style={{ opacity: likeOpacity }}
              >
                LIKE 💚
              </motion.div>
              <motion.div
                className="absolute top-10 right-6 bg-red-500 text-white font-black text-3xl px-4 py-2 rounded-2xl border-4 border-red-400 rotate-[20deg]"
                style={{ opacity: passOpacity }}
              >
                NOPE ✕
              </motion.div>
              <motion.div
                className="absolute top-10 left-1/2 -translate-x-1/2 bg-blue-500 text-white font-black text-2xl px-4 py-2 rounded-2xl border-4 border-blue-400"
                style={{ opacity: superlikeOpacity }}
              >
                SUPER ⭐
              </motion.div>
            </>
          )}

          {/* User info */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {showDetails ? (
              <AnimatePresence>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-white font-bold text-3xl leading-none">
                        {user.name}
                        {age && <span className="text-white/80 font-normal text-2xl">, {age}</span>}
                      </h2>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDetails(false) }}
                      className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                    >
                      <ChevronDown className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {user.location && (
                    <div className="flex items-center gap-1.5 text-white/80">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{user.location}</span>
                    </div>
                  )}

                  {user.bio && (
                    <p className="text-white/90 text-sm leading-relaxed bg-black/20 backdrop-blur-sm rounded-xl p-3">
                      {user.bio}
                    </p>
                  )}

                  {user.interests && user.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {user.interests.slice(0, 6).map(interest => (
                        <span
                          key={interest.id}
                          className="bg-white/20 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full"
                        >
                          {interest.emoji || ""} {interest.name}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-white font-bold text-3xl leading-none drop-shadow-lg">
                    {user.name}
                    {age && <span className="text-white/80 font-normal text-2xl">, {age}</span>}
                  </h2>
                  {user.location && (
                    <div className="flex items-center gap-1 text-white/70 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-sm">{user.location}</span>
                    </div>
                  )}
                  {user.bio && (
                    <p className="text-white/80 text-sm mt-1 line-clamp-2">{user.bio}</p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDetails(true) }}
                  className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 ml-2"
                >
                  <ChevronUp className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function SwipeButtons({
  onPass,
  onSuperLike,
  onLike,
}: {
  onPass: () => void
  onSuperLike: () => void
  onLike: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-5">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onPass}
        className="w-16 h-16 rounded-full bg-white shadow-xl shadow-red-100 flex items-center justify-center border-2 border-red-100 hover:border-red-300 hover:shadow-red-200 transition-all"
      >
        <X className="w-8 h-8 text-red-400" strokeWidth={2.5} />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onSuperLike}
        className="w-14 h-14 rounded-full bg-white shadow-lg shadow-blue-100 flex items-center justify-center border-2 border-blue-100 hover:border-blue-300 transition-all"
      >
        <Star className="w-6 h-6 text-blue-500 fill-blue-500" />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onLike}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl shadow-blue-200 flex items-center justify-center hover:shadow-blue-300 transition-all"
      >
        <Heart className="w-8 h-8 text-white fill-white" />
      </motion.button>
    </div>
  )
}
