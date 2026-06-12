import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/categories', label: 'カテゴリ', icon: '📂' },
  { to: '/new', label: '投稿', icon: '✏️' },
  { to: '/me', label: 'マイページ', icon: '👤' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-sky-50">
      <header className="sticky top-0 z-20 border-b border-sky-200 bg-sky-100/90 px-4 py-3 backdrop-blur">
        <h1 className="text-center text-base font-bold text-sky-800">
          🍶 大塚･巣鴨の酒アホ達
        </h1>
      </header>

      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-sky-200 bg-white/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  isActive ? 'font-bold text-sky-600' : 'text-slate-400'
                }`
              }
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
