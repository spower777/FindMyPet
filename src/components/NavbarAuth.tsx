'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function NavbarAuth({ user }: { user: User | null }) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="text-sm font-medium text-orange-500 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition"
      >
        Zaloguj się
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:block text-sm text-gray-500 max-w-[140px] truncate">
        {user.email}
      </span>
      <button
        onClick={signOut}
        className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
      >
        Wyloguj
      </button>
    </div>
  )
}
