import { createClient } from '@/lib/supabase/server'
import MapView from '@/components/MapView'
import PetCard from '@/components/PetCard'
import type { PetWithPhotos } from '@/lib/types'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const { data: pets } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const petsWithUrls: PetWithPhotos[] = (pets ?? []).map(pet => {
    const primary = (pet.photos ?? []).find((p: { is_primary: boolean }) => p.is_primary) ?? pet.photos?.[0]
    return {
      ...pet,
      photos: pet.photos ?? [],
      primary_photo_url: primary
        ? `${supabaseUrl}/storage/v1/object/public/pet-photos/${primary.storage_path}`
        : null,
    }
  })

  const lostCount = petsWithUrls.filter(p => p.type === 'lost').length
  const foundCount = petsWithUrls.filter(p => p.type === 'found').length

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Map */}
      <div className="relative lg:flex-1 h-[50vh] lg:h-auto">
        <MapView pets={petsWithUrls} />

        {/* CTA buttons over map — mobile */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 lg:hidden">
          <Link
            href="/report/lost"
            className="bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg transition"
          >
            🔴 Zaginął
          </Link>
          <Link
            href="/report/found"
            className="bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg transition"
          >
            🟢 Znalazłem
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-96 flex flex-col bg-white border-l border-gray-100 lg:overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Aktywne zgłoszenia</h2>
            <div className="flex gap-2 text-xs">
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                {lostCount} zagubionych
              </span>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {foundCount} znalezionych
              </span>
            </div>
          </div>
          <div className="hidden lg:flex gap-2">
            <Link
              href="/report/lost"
              className="flex-1 text-center bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-2.5 rounded-xl transition"
            >
              🔴 Zgłoś zagubione
            </Link>
            <Link
              href="/report/found"
              className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white font-semibold text-sm py-2.5 rounded-xl transition"
            >
              🟢 Zgłoś znalezione
            </Link>
          </div>
        </div>

        {/* Pet list */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          {petsWithUrls.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🐾</p>
              <p className="text-sm">Brak aktywnych zgłoszeń</p>
            </div>
          ) : (
            petsWithUrls.map(pet => <PetCard key={pet.id} pet={pet} />)
          )}
        </div>
      </div>
    </div>
  )
}
