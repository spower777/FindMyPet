import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavbarAuth from './NavbarAuth'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4 z-20 relative shrink-0">
      <Link href="/" className="flex items-center gap-1.5 font-bold text-orange-500 text-xl">
        <span>🐾</span>
        <span>FindMyPet</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Link
          href="/report/lost"
          className="hidden sm:flex items-center gap-1 text-sm font-medium bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition"
        >
          Zaginął
        </Link>
        <Link
          href="/report/found"
          className="hidden sm:flex items-center gap-1 text-sm font-medium bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition"
        >
          Znaleziony
        </Link>
        <NavbarAuth user={user} />
      </div>
    </nav>
  )
}
