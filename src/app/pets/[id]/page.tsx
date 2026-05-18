import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import MapView from '@/components/MapView'
import PetCard from '@/components/PetCard'
import { resolvePet, updateMatchStatus } from '@/app/actions/pets'
import type { PetWithPhotos, Match } from '@/lib/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

export default async function PetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const { data: pet } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  function getPhotoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/pet-photos/${path}`
  }

  const photos = pet.photos ?? []
  const primaryPhoto = photos.find((p: { is_primary: boolean }) => p.is_primary) ?? photos[0]

  const petWithPhoto: PetWithPhotos = {
    ...pet,
    photos,
    primary_photo_url: primaryPhoto ? getPhotoUrl(primaryPhoto.storage_path) : null,
  }

  // Fetch matches
  const matchField = pet.type === 'lost' ? 'lost_pet_id' : 'found_pet_id'
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      *,
      lost_pet:pets!matches_lost_pet_id_fkey(*, photos:pet_photos(*)),
      found_pet:pets!matches_found_pet_id_fkey(*, photos:pet_photos(*))
    `)
    .eq(matchField, id)
    .eq('status', 'pending')
    .order('similarity_score', { ascending: false })
    .limit(5)

  const matches: Match[] = (rawMatches ?? []).map((m: Match) => {
    const addUrl = (p: PetWithPhotos | undefined): PetWithPhotos | undefined => {
      if (!p) return undefined
      const ph = p.photos?.find(x => x.is_primary) ?? p.photos?.[0]
      return { ...p, primary_photo_url: ph ? getPhotoUrl(ph.storage_path) : null }
    }
    return { ...m, lost_pet: addUrl(m.lost_pet as PetWithPhotos), found_pet: addUrl(m.found_pet as PetWithPhotos) }
  })

  const isOwner = user?.id === pet.user_id
  const matchedPets = matches.map(m => pet.type === 'lost' ? m.found_pet! : m.lost_pet!)

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Back */}
      <Link href="/" className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
        ← Wróć do mapy
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Photos */}
        {photos.length > 0 ? (
          <div className={`grid gap-1 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {photos.slice(0, 4).map((photo: { id: string; storage_path: string }) => (
              <div key={photo.id} className="relative aspect-video bg-gray-100">
                <Image
                  src={getPhotoUrl(photo.storage_path)}
                  alt={pet.name ?? pet.species}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-48 bg-gray-50 flex items-center justify-center text-6xl text-gray-200">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className={`inline-block text-xs font-bold text-white px-2.5 py-0.5 rounded-full mb-2 ${
                  pet.type === 'lost' ? 'bg-red-500' : 'bg-green-500'
                }`}
              >
                {pet.type === 'lost' ? 'Zaginął' : 'Znaleziony'}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">
                {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
              </h1>
              {pet.breed && <p className="text-gray-500 text-sm mt-0.5">{pet.breed}</p>}
            </div>
            {pet.status === 'resolved' && (
              <span className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full shrink-0">
                Rozwiązane
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-700">
            {pet.color && (
              <p><span className="font-medium">Kolor:</span> {pet.color}</p>
            )}
            <p className="leading-relaxed">{pet.description}</p>
            {pet.last_seen_address && (
              <p><span className="font-medium">Lokalizacja:</span> {pet.last_seen_address}</p>
            )}
            <p className="text-gray-400 text-xs">
              Dodano: {new Date(pet.created_at).toLocaleDateString('pl-PL', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>

          {/* Contact */}
          {(pet.contact_phone || pet.contact_email) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Kontakt:</p>
              <div className="flex gap-3 flex-wrap">
                {pet.contact_phone && (
                  <a
                    href={`tel:${pet.contact_phone}`}
                    className="flex items-center gap-1.5 text-sm bg-orange-50 text-orange-700 border border-orange-200 px-3 py-2 rounded-xl hover:bg-orange-100 transition"
                  >
                    📞 {pet.contact_phone}
                  </a>
                )}
                {pet.contact_email && (
                  <a
                    href={`mailto:${pet.contact_email}`}
                    className="flex items-center gap-1.5 text-sm bg-orange-50 text-orange-700 border border-orange-200 px-3 py-2 rounded-xl hover:bg-orange-100 transition"
                  >
                    ✉️ {pet.contact_email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Owner actions */}
          {isOwner && pet.status === 'active' && (
            <form action={resolvePet.bind(null, pet.id)} className="mt-4 pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition"
              >
                Oznacz jako rozwiązane (zwierzę wróciło do domu)
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Ostatnia lokalizacja</h2>
        </div>
        <div className="h-48">
          <MapView
            pets={[petWithPhoto]}
            defaultCenter={{ lat: pet.last_seen_lat, lng: pet.last_seen_lng }}
            defaultZoom={15}
            interactive={false}
          />
        </div>
      </div>

      {/* AI Matches */}
      {matches.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">
            Potencjalne dopasowania AI ({matches.length})
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            AI porównała zdjęcia i znalazła podobne zwierzęta
          </p>
          <div className="space-y-4">
            {matches.map(match => {
              const matchedPet = pet.type === 'lost' ? match.found_pet! : match.lost_pet!
              const score = Math.round(match.similarity_score * 100)
              return (
                <div key={match.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <PetCard pet={matchedPet} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          score >= 80
                            ? 'bg-green-100 text-green-700'
                            : score >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {score}% podobieństwo
                      </span>
                      {match.reasoning && (
                        <p className="text-xs text-gray-500 mt-1">{match.reasoning}</p>
                      )}
                    </div>
                    {isOwner && (
                      <div className="flex gap-2">
                        <form action={updateMatchStatus.bind(null, match.id, 'accepted')}>
                          <button type="submit" className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition">
                            To on!
                          </button>
                        </form>
                        <form action={updateMatchStatus.bind(null, match.id, 'rejected')}>
                          <button type="submit" className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                            Nie ten
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Share */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-center text-orange-800">
        Pomóż znaleźć właściciela — udostępnij to zgłoszenie znajomym! 🐾
      </div>

      {/* All matches as pet cards for rendering check */}
      {matchedPets.length === 0 && pet.status === 'active' && (
        <p className="text-center text-sm text-gray-400 py-4">
          Brak dopasowań AI. Zostaną automatycznie dodane gdy pojawią się podobne zgłoszenia.
        </p>
      )}
    </div>
  )
}
