'use client'

import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { User } from '@supabase/supabase-js'

export default function NavbarAuth({ user }: { user: User | null }) {
  const router = useRouter()
  const t = useTranslations('nav')

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="text-sm font-medium text-orange-500 border border-orange-300 dark:border-orange-700 px-3 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950 transition"
      >
        {t('login')}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/chat"
        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-500 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950 transition"
      >
        💬
      </Link>
      <Link
        href="/profile"
        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-500 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950 transition"
      >
        <span className="sm:hidden">👤</span>
        <span className="hidden sm:inline">{t('profile')}</span>
      </Link>
      <button
        onClick={signOut}
        className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
      >
        {t('logout')}
      </button>
    </div>
  )
}
