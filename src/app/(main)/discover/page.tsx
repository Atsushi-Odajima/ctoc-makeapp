'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Heart, Flame } from 'lucide-react';
import { UserProfile } from '@/types';
import { CardStack } from '@/components/cards/CardStack';
import { useAppStore } from '@/store';
import { Avatar } from '@/components/ui/avatar';
import { parsePhotos } from '@/lib/utils';

export default function DiscoverPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { newMatch, setNewMatch } = useAppStore();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/discover');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError('Failed to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2 bg-[#F0F4FF]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ConnectMe
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gradient-to-r from-orange-400 to-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold">
            <Flame className="w-4 h-4" />
            <span>Discover</span>
          </div>
        </div>
      </div>

      {/* Match animation overlay */}
      <AnimatePresence>
        {newMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
          >
            <div className="text-center px-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-8xl mb-4"
              >
                🎉
              </motion.div>
              <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-4xl font-black text-white mb-2"
              >
                It&apos;s a Match!
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white/80 text-lg mb-8"
              >
                You and {newMatch.name} liked each other!
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex justify-center mb-8"
              >
                <Avatar
                  src={parsePhotos(newMatch.photos as unknown as string)[0]}
                  name={newMatch.name}
                  size="2xl"
                  className="ring-4 ring-white"
                />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col gap-3"
              >
                <button
                  onClick={() => {
                    setNewMatch(null);
                    window.location.href = '/messages';
                  }}
                  className="w-full bg-white text-blue-600 px-6 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-colors"
                >
                  Send a Message 💌
                </button>
                <button
                  onClick={() => setNewMatch(null)}
                  className="w-full bg-white/20 text-white px-6 py-4 rounded-2xl font-bold text-lg hover:bg-white/30 transition-colors border border-white/30"
                >
                  Keep Swiping
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500">Finding matches near you...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
            <p className="text-2xl">😕</p>
            <p className="text-slate-600 text-center">{error}</p>
            <button
              onClick={fetchUsers}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-medium"
            >
              Try Again
            </button>
          </div>
        ) : (
          <CardStack users={users} onRefresh={fetchUsers} />
        )}
      </div>
    </div>
  );
}
