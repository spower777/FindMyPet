'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

function NavLink({ href, children, exact = false }: { href: string; children: React.ReactNode; exact?: boolean }) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-xl transition ${
        isActive
          ? 'text-orange-500 bg-orange-50 dark:bg-orange-950/80'
          : 'text-gray-500 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/60'
      }`}
    >
      {children}
    </Link>
  )
}

export default function NavLinks({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations('nav')
  return (
    <div className="hidden md:flex items-center gap-0.5">
      <NavLink href="/" exact>🗺️ {t('trop')}</NavLink>
      {isLoggedIn && <NavLink href="/profile">🐾 {t('mypet')}</NavLink>}
      {isLoggedIn && <NavLink href="/chat">💬 {t('chat')}</NavLink>}
      {isLoggedIn && <NavLink href="/contacts">👥 {t('contacts')}</NavLink>}
    </div>
  )
}
