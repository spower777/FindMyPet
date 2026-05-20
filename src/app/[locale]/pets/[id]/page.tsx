import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import MapView from '@/components/MapView'
import PetCard from '@/components/PetCard'
import { resolvePet, updateMatchStatus } from '@/app/actions/pets'
import { secureAnimal } from '@/app/actions/vet'
import type { PetWithPhotos, Match, VetProfile } from '@/lib/types'
import type { Metadata } from 'next'
import { startConversation } from '@/app/actions/chat'
import { getTranslations } from 'next-intl/server'
import ShareButton from '@/components/ShareButton'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: pet } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)')
    .eq('id', id)
    .single()

  if (!pet) return {}

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const photos = pet.photos ?? []
  const primary = photos.find((p: { is_primary: boolean }) => p.is_primary) ?? photos[0]
  const imageUrl = primary
    ? `${supabaseUrl}/storage/v1/object/public/pet-photos/${primary.storage_path}`
    : undefined

  const status = pet.type === 'lost' ? 'Lost' : 'Found'
  const name = pet.name ?? pet.species
  const title = `${status}: ${name}`
  const description = pet.last_seen_address
    ? `${pet.description} • ${pet.last_seen_address}`
    : pet.description

  return {
    title,
    description,
    openGraph: {
      title, description,
      images: imageUrl ? [{ url: imageUrl, width: 800, height: 600, alt: name }] : [],
    },
    twitter: { card: 'summary_large_image', title, description, images: imageUrl ? [imageUrl] : [] },
  }
}

export default async function PetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const t = await getTranslations('pet')
  const ts = await getTranslations('species')
  const tv = await getTranslations('vet')

  const { data: pet } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  const [{ data: ownerVetData }, { data: currentUserVetData }] = await Promise.all([
    supabase.from('vet_profiles').select('*').eq('user_id', pet.user_id).single(),
    user ? supabase.from('vet_profiles').select('id').eq('user_id', user.id).single() : Promise.resolve({ data: null }),
  ])

  const ownerVetProfile = ownerVetData as VetProfile | null
  const isVet = !!currentUserVetData

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
    <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-5">
      <Link href="/" className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
        ←
      </Link>

      {/* Main card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Photos */}
        {photos.length > 0 ? (
          <div className={`grid gap-0.5 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {photos.slice(0, 4).map((photo: { id: string; storage_path: string }) => (
              <div key={photo.id} className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                <Image src={getPhotoUrl(photo.storage_path)} alt={pet.name ?? pet.species} fill className="object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-56 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-7xl text-gray-200 dark:text-gray-700">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`inline-block text-xs font-bold text-white px-3 py-1 rounded-full mb-2 shadow-sm ${pet.type === 'lost' ? 'bg-red-500' : 'bg-green-500'}`}>
                {pet.type === 'lost' ? t('lost') : t('found')}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {SPECIES_EMOJI[pet.species]} {pet.name ?? ts(pet.species as 'dog' | 'cat' | 'bird' | 'rabbit' | 'other')}
              </h1>
              {pet.breed && <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{pet.breed}</p>}
            </div>
            {pet.status === 'resolved' && (
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium px-3 py-1 rounded-full shrink-0">
                {t('resolved')}
              </span>
            )}
          </div>

          {ownerVetProfile && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                ownerVetProfile.verified
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
              }`}>
                🏥 {tv('badge')}{ownerVetProfile.verified ? ` — ${ownerVetProfile.clinic_name}` : ''}
              </span>
            </div>
          )}

          {pet.secured_by_vet_id && (
            <div className="mt-2">
              <span className="text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-full">
                🏥 {tv('secured_label')}
              </span>
            </div>
          )}

          <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            {pet.color && <p><span className="font-medium">{pet.color}</span></p>}
            <p className="leading-relaxed">{pet.description}</p>
            {pet.last_seen_address && (
              <p className="flex items-start gap-1.5">
                <span className="shrink-0">📍</span>
                <span>{pet.last_seen_address}</span>
              </p>
            )}
            <p className="text-gray-400 dark:text-gray-500 text-xs">
              {new Date(pet.created_at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Contact info */}
          {(pet.contact_phone || pet.contact_email) && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('contact_label')}</p>
              <div className="flex gap-2 flex-wrap">
                {pet.contact_phone && (
                  <a href={`tel:${pet.contact_phone}`} className="flex items-center gap-1.5 text-sm bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-3 py-2 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900 transition">
                    📞 {pet.contact_phone}
                  </a>
                )}
                {pet.contact_email && (
                  <a href={`mailto:${pet.contact_email}`} className="flex items-center gap-1.5 text-sm bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-3 py-2 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900 transition">
                    ✉️ {pet.contact_email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Owner: mark resolved */}
          {isOwner && pet.status === 'active' && (
            <form action={resolvePet.bind(null, pet.id)} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                {t('mark_resolved')}
              </button>
            </form>
          )}

          {/* Vet: secure animal button (found pets not yet secured, vet is not owner) */}
          {isVet && !isOwner && pet.type === 'found' && pet.status === 'active' && !pet.secured_by_vet_id && (
            <form action={secureAnimal.bind(null, pet.id)} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-2xl text-sm transition active:scale-95 shadow-sm shadow-blue-200 dark:shadow-blue-900">
                {tv('secure_animal')}
              </button>
            </form>
          )}

          {/* Non-owner: contact button */}
          {!isOwner && user && pet.status === 'active' && (
            <form action={startConversation.bind(null, pet.id, pet.user_id)} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-2xl text-sm transition active:scale-95 shadow-sm shadow-orange-200 dark:shadow-orange-900">
                💬 {t('contact_owner')}
              </button>
            </form>
          )}
          {!isOwner && !user && pet.status === 'active' && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Link href={`/auth/login?next=/pets/${pet.id}`} className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-2xl text-sm transition shadow-sm shadow-orange-200 dark:shadow-orange-900">
                💬 {t('contact_owner')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('location_label')}</h2>
        </div>
        <div className="h-52">
          <MapView pets={[petWithPhoto]} defaultCenter={[pet.last_seen_lat, pet.last_seen_lng]} defaultZoom={15} interactive={false} />
        </div>
      </div>

      {/* AI Matches */}
      {matches.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('ai_matches', { n: matches.length })}
          </h2>
          <div className="space-y-4">
            {matches.map(match => {
              const matchedPet = pet.type === 'lost' ? match.found_pet! : match.lost_pet!
              const score = Math.round(match.similarity_score * 100)
              return (
                <div key={match.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-3 space-y-3">
                  <PetCard pet={matchedPet} />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        score >= 80 ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                        : score >= 60 ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {t('match_score')}: {score}%
                      </span>
                      {match.reasoning && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{match.reasoning}</p>}
                    </div>
                    {isOwner && (
                      <div className="flex gap-2">
                        <form action={updateMatchStatus.bind(null, match.id, 'accepted')}>
                          <button type="submit" className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-xl hover:bg-green-600 transition">
                            {t('match_accept')}
                          </button>
                        </form>
                        <form action={updateMatchStatus.bind(null, match.id, 'rejected')}>
                          <button type="submit" className="text-xs border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            {t('match_reject')}
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

      {/* No matches info for owner */}
      {isOwner && matchedPets.length === 0 && pet.status === 'active' && (
        <p className="text-center text-sm text-gray-400 py-4">{t('no_ai_matches')}</p>
      )}

      {/* Share */}
      <ShareButton petName={pet.name ?? pet.species} />
    </div>
  )
}
