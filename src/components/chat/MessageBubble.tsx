import { cn } from '@/lib/utils';
import { Message } from '@/types';
import { formatMessageTime } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] group', isOwn ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
            isOwn
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white text-slate-800 rounded-bl-sm shadow-sm border border-slate-100'
          )}
        >
          {message.content}
        </div>
        <div className={cn('flex items-center gap-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatMessageTime(message.createdAt)}
          </span>
          {isOwn && (
            message.readAt ? (
              <CheckCheck className="w-3 h-3 text-blue-400" />
            ) : (
              <Check className="w-3 h-3 text-slate-300" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
