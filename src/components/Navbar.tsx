import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavbarAuth from './NavbarAuth'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center px-4 gap-4 z-20 relative shrink-0 sticky top-0">
      <Link href="/" className="flex items-center gap-2 font-bold text-orange-500 text-xl hover:text-orange-600 transition">
        <span className="text-2xl">🐾</span>
        <span className="hidden sm:block">FindMyPet</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Link
          href="/report/lost"
          className="hidden sm:flex items-center gap-1.5 text-sm font-semibold bg-red-500 text-white px-3.5 py-2 rounded-xl hover:bg-red-600 active:scale-95 transition-all shadow-sm shadow-red-100"
        >
          🔴 Zaginął
        </Link>
        <Link
          href="/report/found"
          className="hidden sm:flex items-center gap-1.5 text-sm font-semibold bg-green-500 text-white px-3.5 py-2 rounded-xl hover:bg-green-600 active:scale-95 transition-all shadow-sm shadow-green-100"
        >
          🟢 Znaleziony
        </Link>
        <NavbarAuth user={user} />
      </div>
    </nav>
  )
}
