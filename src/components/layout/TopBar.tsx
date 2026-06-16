'use client';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export function TopBar({ title, subtitle, showBack, rightAction, className, transparent }: TopBarProps) {
  const router = useRouter();
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-30 pt-safe',
        !transparent && 'bg-white/90 backdrop-blur-md border-b border-slate-100',
        className
      )}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-16">
        <div className="w-10">
          {showBack && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </motion.button>
          )}
        </div>
        <div className="text-center flex-1">
          {title && (
            <h1 className="text-base font-bold text-slate-800">{title}</h1>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="w-10 flex justify-end">{rightAction}</div>
      </div>
    </div>
  );
}
