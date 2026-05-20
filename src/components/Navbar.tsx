import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavbarAuth from './NavbarAuth'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import { getTranslations } from 'next-intl/server'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('nav')

  return (
    <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 h-16 flex items-center px-4 gap-3 z-20 relative shrink-0 sticky top-0">
      <Link href="/" className="flex items-center gap-2 font-bold text-orange-500 text-xl hover:text-orange-600 transition shrink-0">
        <span className="text-2xl">🐾</span>
        <span className="hidden sm:block">FindMyPet</span>
      </Link>

      <Link
        href="/"
        className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 px-2.5 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950 transition"
      >
        🐾 {t('trop')}
      </Link>

      {user && (
        <Link
          href="/contacts"
          className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 px-2.5 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950 transition"
        >
          👥 {t('contacts')}
        </Link>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Link
          href="/report/lost"
          className="hidden sm:flex items-center gap-1.5 text-sm font-semibold bg-red-500 text-white px-3.5 py-2 rounded-xl hover:bg-red-600 active:scale-95 transition-all shadow-sm shadow-red-100"
        >
          🔴 {t('lost')}
        </Link>
        <Link
          href="/report/found"
          className="hidden sm:flex items-center gap-1.5 text-sm font-semibold bg-green-500 text-white px-3.5 py-2 rounded-xl hover:bg-green-600 active:scale-95 transition-all shadow-sm shadow-green-100"
        >
          🟢 {t('found')}
        </Link>
        <ThemeToggle />
        <LanguageSwitcher />
        <NavbarAuth user={user} />
      </div>
    </nav>
  )
}
