'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Heart, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

const navItems = [
  { href: '/discover', icon: Home, label: 'ホーム' },
  { href: '/matches', icon: Heart, label: 'マッチ' },
  { href: '/messages', icon: MessageCircle, label: 'メッセージ', badge: true },
  { href: '/profile', icon: User, label: 'プロフィール' },
  { href: '/settings', icon: Settings, label: '設定' },
];

export function BottomNav() {
  const pathname = usePathname();
  const notifications = useAppStore((s) => s.notifications);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const showBadge = (label === 'メッセージ') && notifications > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200',
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-6 h-6 transition-all',
                    isActive && 'scale-110'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium', isActive ? 'text-blue-600' : 'text-slate-400')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
