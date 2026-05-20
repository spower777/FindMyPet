import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import MapView from '@/components/MapView'
import PetCard from '@/components/PetCard'
import { resolvePet, updateMatchStatus } from '@/app/actions/pets'
import { secureAnimal } from '@/app/actions/vet'
import type { PetWithPhotos, Match, VetProfile, PetVaccination, PetMedicalRecord } from '@/lib/types'
import type { Metadata } from 'next'
import { startConversation } from '@/app/actions/chat'
import { getTranslations } from 'next-intl/server'
import ShareButton from '@/components/ShareButton'
import VaccinationSection from '@/components/medical/VaccinationSection'
import MedicalRecordsSection from '@/components/medical/MedicalRecordsSection'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

function calcAge(birthDate: string): { years: number; months: number } {
  const birth = new Date(birthDate)
  const now = new Date()
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 }
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
  const isLost = pet.type === 'lost'

  // Fetch medical data — only for the owner, parallel
  const [{ data: rawVaccinations }, { data: rawRecords }] = isOwner
    ? await Promise.all([
        supabase.from('pet_vaccinations').select('*').eq('pet_id', id).order('date_given', { ascending: false }),
        supabase.from('pet_medical_records').select('*').eq('pet_id', id).order('date', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]

  const vaccinations = (rawVaccinations ?? []) as PetVaccination[]
  const medicalRecords = (rawRecords ?? []) as PetMedicalRecord[]
  const petName = pet.name ?? ts(pet.species as 'dog' | 'cat' | 'bird' | 'rabbit' | 'other')

  // Age calculation
  const ageInfo = pet.birth_date ? calcAge(pet.birth_date) : null
  const ageLabel = ageInfo
    ? ageInfo.years >= 1
      ? t('age_years', { n: ageInfo.years })
      : t('age_months', { n: ageInfo.months })
    : null

  // Gender label
  const genderLabel = pet.gender === 'male' ? `♂ ${t('male')}` : pet.gender === 'female' ? `♀ ${t('female')}` : null

  const sectionCls = 'bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden'
  const sectionHeaderCls = 'px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2'

  return (
    <div className="max-w-2xl mx-auto w-full pb-10">

      {/* ── HERO ── */}
      <div className="relative">
        {photos.length > 0 ? (
          <div className={`grid gap-0.5 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {photos.slice(0, 4).map((photo: { id: string; storage_path: string }, i: number) => (
              <div
                key={photo.id}
                className={`relative bg-gray-100 dark:bg-gray-800 ${
                  photos.length === 1 ? 'aspect-[4/3]' : 'aspect-square'
                } ${photos.length === 3 && i === 0 ? 'col-span-2' : ''}`}
              >
                <Image
                  src={getPhotoUrl(photo.storage_path)}
                  alt={petName}
                  fill
                  className="object-cover"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-8xl text-gray-200 dark:text-gray-700">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}

        {/* Back */}
        <Link
          href="/"
          className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/60 transition text-lg z-10"
          aria-label="Wróć"
        >
          ←
        </Link>

        {/* Share top-right */}
        <div className="absolute top-3 right-3 z-10">
          <ShareButton petName={petName} />
        </div>

        {/* Status ribbon */}
        <div className={`absolute bottom-0 left-0 right-0 px-4 py-2 flex items-center gap-2 ${
          isLost
            ? 'bg-red-500/90 backdrop-blur-sm'
            : 'bg-green-500/90 backdrop-blur-sm'
        }`}>
          {isLost
            ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            : <span className="text-white/90 font-bold">✓</span>
          }
          <span className="text-white font-bold text-sm tracking-wide">
            {isLost ? t('lost').toUpperCase() : t('found').toUpperCase()}
          </span>
          <span className="text-white/70 text-xs ml-auto">
            {new Date(pet.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">

        {/* ── IDENTITY ── */}
        <div className={sectionCls}>
          <div className="p-5">
            {/* Name + resolved badge */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {SPECIES_EMOJI[pet.species]} {petName}
                </h1>
                {pet.breed && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{pet.breed}</p>
                )}
              </div>
              {pet.status === 'resolved' && (
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 mt-0.5">
                  ✓ {t('resolved')}
                </span>
              )}
            </div>

            {/* Profile info chips */}
            {(genderLabel || ageLabel || pet.chip_id || pet.is_neutered) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {genderLabel && (
                  <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 px-3 py-1.5 rounded-full font-medium">
                    {genderLabel}
                  </span>
                )}
                {ageLabel && (
                  <span className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900 px-3 py-1.5 rounded-full font-medium">
                    🎂 {ageLabel}
                  </span>
                )}
                {pet.chip_id && (
                  <span className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full font-medium font-mono">
                    🏷️ {pet.chip_id}
                  </span>
                )}
                {pet.is_neutered && (
                  <span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900 px-3 py-1.5 rounded-full font-medium">
                    ✂️ {t('neutered')}
                  </span>
                )}
              </div>
            )}

            {/* Vet badge */}
            {ownerVetProfile && (
              <div className="mt-3">
                <span className={`text-xs font-medium px-2.5 py-1.5 rounded-full border inline-flex items-center gap-1.5 ${
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
                <span className="text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 rounded-full inline-flex items-center gap-1">
                  🏥 {tv('secured_label')}
                </span>
              </div>
            )}
          </div>

          {/* Last seen location row */}
          {pet.last_seen_address && (
            <div className={`px-5 py-3 border-t ${isLost ? 'border-red-50 dark:border-red-950/40' : 'border-green-50 dark:border-green-950/40'}`}>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">📍</span>
                <span>{pet.last_seen_address}</span>
              </p>
            </div>
          )}

          {/* Contact info */}
          {(pet.contact_phone || pet.contact_email) && (
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5">
                {t('contact_label')}
              </p>
              <div className="flex gap-2 flex-wrap">
                {pet.contact_phone && (
                  <a
                    href={`tel:${pet.contact_phone}`}
                    className="flex items-center gap-1.5 text-sm bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-3 py-2 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900 transition"
                  >
                    📞 {pet.contact_phone}
                  </a>
                )}
                {pet.contact_email && (
                  <a
                    href={`mailto:${pet.contact_email}`}
                    className="flex items-center gap-1.5 text-sm bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-3 py-2 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900 transition"
                  >
                    ✉️ {pet.contact_email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Primary CTA */}
          {!isOwner && user && pet.status === 'active' && (
            <div className="px-5 pb-5">
              <form action={startConversation.bind(null, pet.id, pet.user_id)}>
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl text-sm transition active:scale-[0.98] shadow-md shadow-orange-200 dark:shadow-orange-950"
                >
                  💬 {t('contact_owner')}
                </button>
              </form>
            </div>
          )}
          {!isOwner && !user && pet.status === 'active' && (
            <div className="px-5 pb-5">
              <Link
                href={`/auth/login?next=/pets/${pet.id}`}
                className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl text-sm transition shadow-md shadow-orange-200 dark:shadow-orange-950"
              >
                💬 {t('contact_owner')}
              </Link>
            </div>
          )}
        </div>

        {/* ── DESCRIPTION ── */}
        {(pet.description || pet.character || pet.color || pet.allergies) && (
          <div className={sectionCls}>
            <div className={sectionHeaderCls}>
              <span className="text-base">📝</span>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('description')}</h2>
            </div>
            <div className="p-5 space-y-3">
              {pet.color && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{pet.color}</span>
                </p>
              )}
              {pet.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pet.description}</p>
              )}
              {pet.character && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                    {t('character_label')}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pet.character}</p>
                </div>
              )}
              {pet.allergies && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                    {t('allergies_label')}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">⚠️ {pet.allergies}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MAP ── */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>
            <span className="text-base">🗺️</span>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('location_label')}</h2>
          </div>
          <div className="h-56">
            <MapView
              pets={[petWithPhoto]}
              defaultCenter={[pet.last_seen_lat, pet.last_seen_lng]}
              defaultZoom={15}
              interactive={false}
            />
          </div>
        </div>

        {/* ── OWNER ACTIONS ── */}
        {isOwner && pet.status === 'active' && (
          <div className={sectionCls}>
            <div className="p-5 space-y-3">
              {/* Vet secure (vet who is not owner, found pets) */}
              {isVet && !isOwner && pet.type === 'found' && !pet.secured_by_vet_id && (
                <form action={secureAnimal.bind(null, pet.id)}>
                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-2xl text-sm transition active:scale-95 shadow-sm shadow-blue-200 dark:shadow-blue-900"
                  >
                    {tv('secure_animal')}
                  </button>
                </form>
              )}
              <form action={resolvePet.bind(null, pet.id)}>
                <button
                  type="submit"
                  className="w-full text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {t('mark_resolved')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Vet secure (standalone — vet who is not owner) */}
        {isVet && !isOwner && pet.type === 'found' && pet.status === 'active' && !pet.secured_by_vet_id && (
          <div className={sectionCls}>
            <div className="p-5">
              <form action={secureAnimal.bind(null, pet.id)}>
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-2xl text-sm transition active:scale-95 shadow-sm shadow-blue-200 dark:shadow-blue-900"
                >
                  {tv('secure_animal')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── AI MATCHES ── */}
        {matches.length > 0 && (
          <div className={sectionCls}>
            <div className={sectionHeaderCls}>
              <span className="text-base">🤖</span>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {t('ai_matches', { n: matches.length })}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {matches.map(match => {
                const matchedPet = pet.type === 'lost' ? match.found_pet! : match.lost_pet!
                const score = Math.round(match.similarity_score * 100)
                return (
                  <div key={match.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-3 space-y-3">
                    <PetCard pet={matchedPet} />
                    <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                      <div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          score >= 80 ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                          : score >= 60 ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {t('match_score')}: {score}%
                        </span>
                        {match.reasoning && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{match.reasoning}</p>
                        )}
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

        {isOwner && matches.length === 0 && pet.status === 'active' && (
          <p className="text-center text-sm text-gray-400 py-2">{t('no_ai_matches')}</p>
        )}

        {/* ── MEDICAL (owner only) ── */}
        {isOwner && (
          <>
            <div className={sectionCls}>
              <div className={sectionHeaderCls}>
                <span className="text-base">💉</span>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex-1">
                  {t('profile_data')} — szczepienia
                </h2>
                <span className="text-xs text-gray-400 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                  {vaccinations.length}
                </span>
              </div>
              <div className="p-5">
                <VaccinationSection petId={id} vaccinations={vaccinations} />
              </div>
            </div>

            <div className={sectionCls}>
              <div className={sectionHeaderCls}>
                <span className="text-base">🩺</span>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex-1">
                  {t('profile_data')} — historia medyczna
                </h2>
                <span className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                  {medicalRecords.length}
                </span>
              </div>
              <div className="p-5">
                <MedicalRecordsSection petId={id} records={medicalRecords} />
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
