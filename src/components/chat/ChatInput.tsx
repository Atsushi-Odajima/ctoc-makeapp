'use client';
import { useState, KeyboardEvent } from 'react';
import { Send, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = 'Type a message...' }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-white border-t border-slate-100">
      <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 flex items-end px-4 py-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-slate-800 text-sm max-h-32 placeholder-slate-400"
          style={{ minHeight: '24px' }}
        />
        <button className="ml-2 text-slate-400 hover:text-slate-600 transition-colors self-end">
          <Smile className="w-5 h-5" />
        </button>
      </div>
      <button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-all',
          message.trim()
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700'
            : 'bg-slate-200 text-slate-400'
        )}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
