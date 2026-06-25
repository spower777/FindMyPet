import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import NavbarAuth from './NavbarAuth'
import NavLinks from './NavLinks'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import ThemeSwitcher from './ThemeSwitcher'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 h-14 flex items-center px-4 gap-2 z-20 relative shrink-0 sticky top-0">
      <Link href="/" className="flex items-center gap-2 font-bold text-orange-500 text-xl hover:text-orange-600 transition shrink-0">
        <span className="text-2xl">🐾</span>
        <span className="hidden sm:block">FindMyPet</span>
      </Link>

      <NavLinks isLoggedIn={!!user} />

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <span className="hidden sm:contents">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </span>
        <ThemeToggle />
        <NavbarAuth user={user} />
      </div>
    </nav>
  )
}
