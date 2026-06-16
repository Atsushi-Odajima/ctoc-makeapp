import { useState, useCallback } from 'react';
import { SwipeDirection } from '@/types';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  threshold?: number;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  threshold = 100,
}: UseSwipeOptions = {}) {
  const [direction, setDirection] = useState<SwipeDirection>(null);

  const handleSwipe = useCallback(
    (offset: { x: number; y: number }) => {
      if (Math.abs(offset.x) > Math.abs(offset.y)) {
        if (offset.x > threshold) {
          setDirection('right');
          onSwipeRight?.();
        } else if (offset.x < -threshold) {
          setDirection('left');
          onSwipeLeft?.();
        }
      } else {
        if (offset.y < -threshold) {
          setDirection('up');
          onSwipeUp?.();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, threshold]
  );

  const reset = useCallback(() => setDirection(null), []);

  return { direction, handleSwipe, reset };
}

export function useMessages(matchId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/messages/${matchId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error('Failed to send message');
        const data = await res.json();
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [matchId]
  );

  return { sendMessage, loading, error };
}
