'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Heart, RefreshCw } from 'lucide-react';
import { UserProfile } from '@/types';
import { SwipeCard } from './SwipeCard';
import { useAppStore } from '@/store';
import toast from 'react-hot-toast';

interface CardStackProps {
  users: UserProfile[];
  onRefresh: () => void;
}

export function CardStack({ users, onRefresh }: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { setNewMatch } = useAppStore();

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];
  const afterNextUser = users[currentIndex + 2];

  const handleSwipe = useCallback(
    async (direction: 'like' | 'pass' | 'superlike', user: UserProfile) => {
      if (isAnimating) return;
      setIsAnimating(true);

      try {
        const res = await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ swipedId: user.id, direction }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.match) {
            setNewMatch(user);
            toast.success(`🎉 It's a match with ${user.name}!`, {
              duration: 4000,
              style: {
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                color: 'white',
                borderRadius: '16px',
              },
            });
          }
        }
      } catch (error) {
        console.error('Swipe error:', error);
      }

      setCurrentIndex((prev) => prev + 1);
      setIsAnimating(false);
    },
    [isAnimating, setNewMatch]
  );

  const handleActionButton = (direction: 'like' | 'pass' | 'superlike') => {
    if (currentUser) {
      handleSwipe(direction, currentUser);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
        <div className="text-6xl">🎉</div>
        <h3 className="text-xl font-bold text-slate-800">You're all caught up!</h3>
        <p className="text-slate-500 text-center px-8">
          You've seen everyone nearby. Check back later for new people!
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Card stack area */}
      <div className="relative flex-1 mx-4 mt-2">
        {/* Background cards */}
        {afterNextUser && (
          <div
            className="absolute inset-0 rounded-3xl bg-white shadow-xl"
            style={{
              zIndex: 1,
              transform: 'scale(0.92) translateY(16px)',
              transformOrigin: 'bottom center',
            }}
          />
        )}
        {nextUser && (
          <div
            className="absolute inset-0 rounded-3xl bg-white shadow-xl overflow-hidden"
            style={{
              zIndex: 2,
              transform: 'scale(0.96) translateY(8px)',
              transformOrigin: 'bottom center',
            }}
          />
        )}

        {/* Current card */}
        <AnimatePresence mode="popLayout">
          {[currentIndex, currentIndex + 1].map((idx) => {
            const user = users[idx];
            if (!user) return null;
            const isTop = idx === currentIndex;
            return (
              <SwipeCard
                key={user.id}
                user={user}
                isTop={isTop}
                onSwipe={(dir) => isTop && handleSwipe(dir, user)}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-5 py-6 px-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleActionButton('pass')}
          className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-red-100 hover:border-red-200 transition-colors"
        >
          <X className="w-7 h-7 text-red-400" strokeWidth={2.5} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleActionButton('superlike')}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-blue-100 hover:border-blue-200 transition-colors"
        >
          <Star className="w-6 h-6 text-blue-400" strokeWidth={2.5} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleActionButton('like')}
          className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-green-100 hover:border-green-200 transition-colors"
        >
          <Heart className="w-7 h-7 text-green-400" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
