'use client'

import { Link, usePathname } from '@/i18n/navigation'

interface Props {
  isLoggedIn: boolean
}

export default function BottomNav({ isLoggedIn }: Props) {
  const pathname = usePathname()

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  }

  const loggedInItems = [
    { href: '/',        icon: '🔍', label: 'Szukaj',  exact: true },
    { href: '/radar',   icon: '📡', label: 'Radar' },
    { href: '/report/lost', icon: '🚨', label: 'Zgłoś', center: true },
    { href: '/chat',    icon: '💬', label: 'Czat' },
    { href: '/profile', icon: '🐾', label: 'Profil' },
  ]

  const guestItems = [
    { href: '/',            icon: '🔍', label: 'Szukaj', exact: true },
    { href: '/radar',       icon: '📡', label: 'Radar' },
    { href: '/report/lost', icon: '🚨', label: 'Zgłoś', center: true },
    { href: '/auth/login',  icon: '👤', label: 'Zaloguj' },
  ]

  const items = isLoggedIn ? loggedInItems : guestItems

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center h-16">
        {items.map(item => {
          const active = isActive(item.href, item.exact)

          if (item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center"
                aria-label={item.label}
              >
                <div className="w-12 h-12 bg-orange-500 hover:bg-orange-600 active:scale-95 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-orange-500/25 transition -mt-5">
                  {item.icon}
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
              aria-label={item.label}
            >
              <span className={`text-xl transition-transform ${active ? 'scale-110' : 'opacity-50'}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-semibold transition-colors ${
                active ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
