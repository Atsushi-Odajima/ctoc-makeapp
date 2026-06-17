import { useState, useCallback } from "react"

type SwipeDirection = "left" | "right" | "up" | null

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  threshold?: number
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  threshold = 100,
}: UseSwipeOptions = {}) {
  const [direction, setDirection] = useState<SwipeDirection>(null)

  const handleSwipe = useCallback(
    (offset: { x: number; y: number }) => {
      if (Math.abs(offset.x) > Math.abs(offset.y)) {
        if (offset.x > threshold) {
          setDirection("right")
          onSwipeRight?.()
        } else if (offset.x < -threshold) {
          setDirection("left")
          onSwipeLeft?.()
        }
      } else {
        if (offset.y < -threshold) {
          setDirection("up")
          onSwipeUp?.()
        }
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, threshold]
  )

  const reset = useCallback(() => setDirection(null), [])

  return { direction, handleSwipe, reset }
}
