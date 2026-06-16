import { cn } from '@/lib/utils';
import { Interest } from '@/types';

interface InterestBadgeProps {
  interest: Interest;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function InterestBadge({ interest, selected, onClick, className }: InterestBadgeProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
        selected
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
          : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:text-blue-600',
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default',
        className
      )}
    >
      {interest.emoji && <span>{interest.emoji}</span>}
      {interest.name}
    </button>
  );
}
