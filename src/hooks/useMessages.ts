import { useState, useCallback, useEffect } from 'react';
import { Message } from '@/types';
import { useAppStore } from '@/store';

export function useMessages(matchId: string) {
  const { messages, setMessages, addMessage } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${matchId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data: Message[] = await res.json();
      setMessages(matchId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [matchId, setMessages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        const res = await fetch(`/api/messages/${matchId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error('Failed to send message');
        const data: Message = await res.json();
        addMessage(matchId, data);
        return data;
      } catch (err) {
        throw err;
      }
    },
    [matchId, addMessage]
  );

  return {
    messages: messages[matchId] || [],
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}
