import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import MapView from '@/components/MapView'
import PetCard from '@/components/PetCard'
import { resolvePet, updateMatchStatus } from '@/app/actions/pets'
import { secureAnimal } from '@/app/actions/vet'
import type { PetWithPhotos, Match, VetProfile, PetVaccination, PetMedicalRecord, VetDocument, UserContact } from '@/lib/types'
import type { Metadata } from 'next'
import { startConversation } from '@/app/actions/chat'
import { getTranslations } from 'next-intl/server'
import ShareButton from '@/components/ShareButton'
import PetTimeline from '@/components/medical/PetTimeline'
import QrChipCode from '@/components/QrChipCode'
import PetTabNav from '@/components/PetTabNav'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

const CHIP_COLORS = [
  'bg-blue-500/15 text-blue-400',
  'bg-purple-500/15 text-purple-400',
  'bg-teal-500/15 text-teal-400',
  'bg-green-500/15 text-green-400',
  'bg-orange-500/15 text-orange-400',
  'bg-pink-500/15 text-pink-400',
]

const RECORD_TYPE_LABEL: Record<string, string> = {
  visit: 'Wizyta', treatment: 'Leczenie', surgery: 'Operacja',
  test: 'Badanie', prescription: 'Recepta', other: 'Inne',
}

function calcAge(birthDate: string): { years: number; months: number } {
  const birth = new Date(birthDate)
  const now = new Date()
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 }
}

function parseChips(text: string | null): string[] {
  if (!text) return []
  return text.split(/[,;]/).map(s => s.trim()).filter(Boolean)
}

function fmtDate(dateStr: string, locale = 'pl'): string {
  return new Date(dateStr).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: pet } = await supabase.from('pets').select('*, photos:pet_photos(*)').eq('id', id).single()
  if (!pet) return {}

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const photos = pet.photos ?? []
  const primary = photos.find((p: { is_primary: boolean }) => p.is_primary) ?? photos[0]
  const imageUrl = primary ? `${supabaseUrl}/storage/v1/object/public/pet-photos/${primary.storage_path}` : undefined
  const name = pet.name ?? pet.species
  const title = pet.type === 'profile' ? name : `${pet.type === 'lost' ? 'Lost' : 'Found'}: ${name}`
  const description = pet.last_seen_address ? `${pet.description} • ${pet.last_seen_address}` : pet.description

  return {
    title,
    description,
    openGraph: { title, description, images: imageUrl ? [{ url: imageUrl, width: 800, height: 600, alt: name }] : [] },
    twitter: { card: 'summary_large_image', title, description, images: imageUrl ? [imageUrl] : [] },
  }
}

export default async function PetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab = 'overview' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const t = await getTranslations('pet')
  const ts = await getTranslations('species')
  const tv = await getTranslations('vet')

  const { data: pet } = await supabase.from('pets').select('*, photos:pet_photos(*)').eq('id', id).single()
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

  const isOwner = user?.id === pet.user_id
  const isProfile = pet.type === 'profile'
  const isLost = pet.type === 'lost'
  const profileUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://findmypet.app'}/pets/${id}`

  // AI matches — lost/found only
  let matches: Match[] = []
  if (!isProfile) {
    const matchField = pet.type === 'lost' ? 'lost_pet_id' : 'found_pet_id'
    const { data: rawMatches } = await supabase
      .from('matches')
      .select(`*, lost_pet:pets!matches_lost_pet_id_fkey(*, photos:pet_photos(*)), found_pet:pets!matches_found_pet_id_fkey(*, photos:pet_photos(*))`)
      .eq(matchField, id).eq('status', 'pending').order('similarity_score', { ascending: false }).limit(5)

    matches = (rawMatches ?? []).map((m: Match) => {
      const addUrl = (p: PetWithPhotos | undefined): PetWithPhotos | undefined => {
        if (!p) return undefined
        const ph = p.photos?.find(x => x.is_primary) ?? p.photos?.[0]
        return { ...p, primary_photo_url: ph ? getPhotoUrl(ph.storage_path) : null }
      }
      return { ...m, lost_pet: addUrl(m.lost_pet as PetWithPhotos), found_pet: addUrl(m.found_pet as PetWithPhotos) }
    })
  }

  // Medical data — owner only
  const [{ data: rawVaccinations }, { data: rawRecords }, { data: rawVetDocs }] = isOwner
    ? await Promise.all([
        supabase.from('pet_vaccinations').select('*').eq('pet_id', id).order('date_given', { ascending: false }),
        supabase.from('pet_medical_records').select('*').eq('pet_id', id).order('date', { ascending: false }),
        supabase.from('vet_documents').select('*, vet_profile:vet_profiles(vet_name, clinic_name)').eq('pet_id', id).order('created_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const vaccinations = (rawVaccinations ?? []) as PetVaccination[]
  const medicalRecords = (rawRecords ?? []) as PetMedicalRecord[]
  const vetDocuments = (rawVetDocs ?? []) as VetDocument[]

  const vetDocsWithUrls = isOwner
    ? await Promise.all(vetDocuments.map(async doc => {
        const { data } = await supabase.storage.from('pet-documents').createSignedUrl(doc.document_path, 3600)
        return { ...doc, signedUrl: data?.signedUrl ?? null }
      }))
    : []

  // Linked contacts — profile + owner only
  const { data: linkedContactsData } = isProfile && isOwner
    ? await supabase.from('user_contacts').select('*').eq('pet_id', id).eq('user_id', user!.id)
    : { data: [] }
  const linkedContacts = (linkedContactsData ?? []) as UserContact[]

  // Incidents — lost/found reports by the same owner (profile only)
  const { data: incidentsData } = isProfile
    ? await supabase
        .from('pets')
        .select('*, photos:pet_photos(*)')
        .eq('user_id', pet.user_id)
        .in('type', ['lost', 'found'])
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }
  const incidents = (incidentsData ?? []).map((p) => {
    const ph = (p.photos ?? []).find((x: { is_primary: boolean }) => x.is_primary) ?? (p.photos ?? [])[0]
    return { ...p, photos: p.photos ?? [], primary_photo_url: ph ? getPhotoUrl(ph.storage_path) : null }
  }) as PetWithPhotos[]

  const petName = pet.name ?? ts(pet.species as 'dog' | 'cat' | 'bird' | 'rabbit' | 'other')
  const ageInfo = pet.birth_date ? calcAge(pet.birth_date) : null
  const ageLabel = ageInfo
    ? ageInfo.years >= 1 ? t('age_years', { n: ageInfo.years }) : t('age_months', { n: ageInfo.months })
    : null
  const genderLabel = pet.gender === 'male' ? `♂ ${t('male')}` : pet.gender === 'female' ? `♀ ${t('female')}` : null

  const characterChips = parseChips(pet.character)
  const allergyChips = parseChips(pet.allergies)

  // Radar sidebar — recent lost/found pets for profile view
  let recentRadarPets: PetWithPhotos[] = []
  let radarActiveCount = 0
  if (isProfile) {
    const { data: radarPetsData, count } = await supabase
      .from('pets')
      .select('*, photos:pet_photos(*)', { count: 'exact' })
      .in('type', ['lost', 'found'])
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(4)
    radarActiveCount = count ?? 0
    recentRadarPets = (radarPetsData ?? []).map((p) => {
      const ph = (p.photos ?? []).find((x: { is_primary: boolean }) => x.is_primary) ?? (p.photos ?? [])[0]
      return { ...p, photos: p.photos ?? [], primary_photo_url: ph ? getPhotoUrl(ph.storage_path) : null }
    })
  }

  // Timeline preview — top 5 events by date
  const timelinePreview = [
    ...vaccinations.map(v => ({ date: v.date_given, label: v.name, icon: '💉', sub: v.vet_name ?? '', color: 'teal' })),
    ...medicalRecords.map(r => ({ date: r.date, label: r.title, icon: '🩺', sub: RECORD_TYPE_LABEL[r.type] ?? r.type, color: 'blue' })),
    ...vetDocsWithUrls.map(d => ({ date: d.created_at.split('T')[0], label: d.title, icon: '📄', sub: (d.vet_profile as { vet_name?: string } | undefined)?.vet_name ?? '', color: 'purple' })),
  ]
    .filter(e => !!e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const now = new Date()
  const sectionCls = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden'
  const sectionHeaderCls = 'px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2'

  const CONTACT_TYPE_META: Record<string, { emoji: string }> = {
    owner: { emoji: '👤' }, vet: { emoji: '🏥' }, shelter: { emoji: '🏠' },
    emergency: { emoji: '🚨' }, volunteer: { emoji: '🙋' }, other: { emoji: '📋' },
  }
  const ANIMAL_EMOJI: Record<string, string> = { dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾' }

  return (
    <div className="w-full pb-16">

      {/* ══ PROFILE PET — dark cinema ══ */}
      {isProfile && (
        <div className="min-h-screen bg-[#0e0e0e]">

          {/* ── HERO — full identity overlay ── */}
          <div className="relative w-full overflow-hidden bg-[#0e0e0e]" style={{ height: 'min(75vh, 640px)', minHeight: '420px' }}>
            {primaryPhoto ? (
              <Image
                src={getPhotoUrl(primaryPhoto.storage_path)}
                alt={petName}
                fill
                className="object-cover object-top"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[12rem] opacity-10">
                {SPECIES_EMOJI[pet.species]}
              </div>
            )}
            {/* Cinematic gradient — bottom heavy, side vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/50 via-transparent to-transparent" />

            {/* Top controls */}
            <Link href="/" className="absolute top-5 left-5 bg-black/40 backdrop-blur-md text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/60 transition z-10">←</Link>
            <div className="absolute top-5 right-5 z-10">
              <ShareButton petName={petName} petType="profile" />
            </div>

            {/* ── Identity overlaid at bottom ── */}
            <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 pb-7 z-10">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-end gap-4 mb-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 ring-2 ring-white/20 shadow-2xl bg-[#1a1a1a]">
                    {primaryPhoto
                      ? <Image src={getPhotoUrl(primaryPhoto.storage_path)} alt={petName} width={96} height={96} className="w-full h-full object-cover object-top" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">{SPECIES_EMOJI[pet.species]}</div>
                    }
                  </div>
                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h1 className="text-3xl sm:text-5xl font-black text-white leading-none tracking-tight drop-shadow-2xl">{petName}</h1>
                      <span className="text-2xl sm:text-3xl">{SPECIES_EMOJI[pet.species]}</span>
                    </div>
                    {pet.breed && <p className="text-gray-400 text-sm mb-2.5">{pet.breed}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {ageLabel && <span className="text-xs bg-black/50 backdrop-blur-sm text-gray-200 px-2.5 py-1 rounded-full border border-white/15 font-medium">{ageLabel}</span>}
                      {genderLabel && <span className="text-xs bg-black/50 backdrop-blur-sm text-gray-200 px-2.5 py-1 rounded-full border border-white/15 font-medium">{genderLabel}</span>}
                      {pet.is_neutered && <span className="text-xs bg-teal-900/70 backdrop-blur-sm text-teal-300 px-2.5 py-1 rounded-full border border-teal-500/30 font-medium">✂️ {t('neutered')}</span>}
                      {pet.chip_id && <span className="text-xs bg-black/50 backdrop-blur-sm text-gray-400 px-2.5 py-1 rounded-full border border-white/10 font-mono hidden sm:inline-flex">🔖 {pet.chip_id}</span>}
                    </div>
                  </div>
                  {isOwner && (
                    <Link href={`/pets/${id}/edit`} className="shrink-0 mb-0.5 text-xs bg-black/50 backdrop-blur-md hover:bg-white/15 text-white border border-white/20 px-3.5 py-2 rounded-xl font-medium transition">
                      ✏️ Edytuj
                    </Link>
                  )}
                </div>
                {pet.description && (
                  <p className="text-gray-300/70 italic text-sm leading-relaxed max-w-xl drop-shadow">„{pet.description}"</p>
                )}
              </div>
            </div>
          </div>

          {/* ── MAIN LAYOUT: left content + right radar sidebar ── */}
          <div className="flex">

            {/* LEFT: tabs + content + modules */}
            <div className="flex-1 min-w-0 overflow-x-hidden">

              {/* Tabs */}
              <div className="px-5 sm:px-8 mt-1 overflow-x-auto scrollbar-none">
                <div className="flex gap-0 border-b border-white/8">
                  {[
                    { key: 'overview',  label: 'Przegląd',  icon: '🐾' },
                    { key: 'history',   label: 'Historia',  icon: '📅', count: vaccinations.length + medicalRecords.length },
                    { key: 'health',    label: 'Zdrowie',   icon: '💊', count: vaccinations.length },
                    { key: 'documents', label: 'Dokumenty', icon: '📄', count: vetDocsWithUrls.length },
                    { key: 'incidents', label: 'Incydenty', icon: '📡', count: incidents.length },
                    { key: 'contacts',  label: 'Kontakty',  icon: '👥', count: linkedContacts.length },
                  ].map(tabItem => {
                    const isActive = tab === tabItem.key
                    return (
                      <Link
                        key={tabItem.key}
                        href={`/pets/${id}?tab=${tabItem.key}`}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                          isActive
                            ? 'border-orange-500 text-white'
                            : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                        }`}
                      >
                        <span>{tabItem.icon}</span>
                        <span className="hidden sm:inline">{tabItem.label}</span>
                        {tabItem.count !== undefined && tabItem.count > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-orange-500/20 text-orange-400' : 'bg-white/8 text-gray-500'}`}>
                            {tabItem.count}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Tab content */}
              <div className="px-5 sm:px-8 pb-16 mt-6">

                {/* ── PRZEGLĄD ── */}
                {tab === 'overview' && (
                  <div className="space-y-5 max-w-3xl">

                    {/* O pupilu */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                        <div className="w-1 h-5 bg-orange-500 rounded-full shrink-0" />
                        <h3 className="font-bold text-white text-base">O {petName}</h3>
                      </div>
                      <div className="p-5 space-y-5">
                        {pet.description ? (
                          <p className="text-sm text-gray-300 leading-relaxed">{pet.description}</p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Brak opisu</p>
                        )}
                        {(characterChips.length > 0 || allergyChips.length > 0) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            {characterChips.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2.5">Temperament</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {characterChips.map((chip, i) => (
                                    <span key={i} className={`text-xs px-3 py-1.5 rounded-full font-semibold ${CHIP_COLORS[i % CHIP_COLORS.length]}`}>{chip}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {allergyChips.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2.5">Alergie</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {allergyChips.map((chip, i) => (
                                    <span key={i} className="text-xs bg-red-500/15 text-red-300 border border-red-500/25 px-3 py-1.5 rounded-full font-semibold">⚠ {chip}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {(pet.contact_phone || pet.contact_email) && (
                          <div className="pt-4 border-t border-[#242424] flex flex-wrap gap-3">
                            {pet.contact_phone && (
                              <a href={`tel:${pet.contact_phone}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-orange-400 transition font-medium bg-[#222] border border-[#2e2e2e] px-3 py-2 rounded-xl">
                                📞 {pet.contact_phone}
                              </a>
                            )}
                            {pet.contact_email && (
                              <a href={`mailto:${pet.contact_email}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-orange-400 transition font-medium bg-[#222] border border-[#2e2e2e] px-3 py-2 rounded-xl truncate max-w-xs">
                                ✉️ {pet.contact_email}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline życia */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                        <div className="w-1 h-5 bg-orange-500 rounded-full shrink-0" />
                        <h3 className="font-bold text-white text-base flex-1">Timeline życia</h3>
                        {isOwner && (
                          <Link href={`/pets/${id}?tab=history`} className="text-xs text-orange-500 hover:text-orange-400 transition font-medium">
                            Pełna historia →
                          </Link>
                        )}
                      </div>
                      <div className="p-5">
                        {timelinePreview.length > 0 ? (
                          <div>
                            {timelinePreview.map((event, i) => {
                              const iconCls = event.color === 'teal'
                                ? 'bg-teal-500/15 border-teal-500/30'
                                : event.color === 'blue'
                                ? 'bg-blue-500/15 border-blue-500/30'
                                : 'bg-purple-500/15 border-purple-500/30'
                              return (
                                <div key={i} className="flex gap-4">
                                  <div className="flex flex-col items-center shrink-0">
                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${iconCls}`}>
                                      {event.icon}
                                    </div>
                                    {i < timelinePreview.length - 1 && (
                                      <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent my-1.5 min-h-[16px]" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pb-5">
                                    <p className="text-sm font-semibold text-gray-100">{event.label}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{fmtDate(event.date)}{event.sub ? ` · ${event.sub}` : ''}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-3xl mb-3">📅</p>
                            <p className="text-sm text-gray-400 font-medium">Brak wpisów w historii</p>
                            <p className="text-xs text-gray-600 mt-1.5">Dodaj pierwsze szczepienie lub wizytę weterynaryjną</p>
                            {isOwner && (
                              <Link href={`/pets/${id}?tab=health`} className="mt-4 inline-flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-400 transition font-medium bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl">
                                + Dodaj szczepienie
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Szczepienia preview */}
                    {isOwner && vaccinations.length > 0 && (
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                          <div className="w-1 h-5 bg-teal-500 rounded-full shrink-0" />
                          <h3 className="font-bold text-white text-base flex-1">Szczepienia</h3>
                          <span className="text-xs bg-teal-500/15 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full font-semibold">{vaccinations.length}</span>
                        </div>
                        <div className="divide-y divide-[#222]">
                          {vaccinations.slice(0, 3).map(vax => {
                            const isDue = vax.next_due && new Date(vax.next_due) < now
                            const isDueSoon = vax.next_due && !isDue && new Date(vax.next_due).getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
                            return (
                              <div key={vax.id} className="flex items-center gap-3.5 px-5 py-3.5">
                                <span className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-base shrink-0">💉</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-200">{vax.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Podano: {fmtDate(vax.date_given)}{vax.vet_name ? ` · ${vax.vet_name}` : ''}</p>
                                </div>
                                {vax.next_due && (
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${isDue ? 'bg-red-500/15 text-red-400 border border-red-500/20' : isDueSoon ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' : 'bg-green-500/15 text-green-400 border border-green-500/20'}`}>
                                    {isDue ? '⚠ Przet.' : isDueSoon ? '⏰ Wkrótce' : `✓ ${fmtDate(vax.next_due)}`}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {vaccinations.length > 3 && (
                          <div className="px-5 py-3 border-t border-[#222]">
                            <Link href={`/pets/${id}?tab=health`} className="text-xs text-orange-500 hover:text-orange-400 transition font-medium">
                              Zobacz wszystkie {vaccinations.length} szczepień →
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Szybki dostęp */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                        <div className="w-1 h-5 bg-orange-500 rounded-full shrink-0" />
                        <h3 className="font-bold text-white text-base">Szybki dostęp</h3>
                      </div>
                      <div className="p-4 space-y-2">
                        {isOwner ? (
                          <>
                            {[
                              { href: `?tab=history`, iconBg: 'bg-orange-500/15 border-orange-500/25', icon: '📝', label: 'Dodaj wpis', sub: 'Wydarzenie na osi czasu' },
                              { href: `?tab=health`, iconBg: 'bg-teal-500/15 border-teal-500/25', icon: '💉', label: 'Dodaj szczepienie', sub: 'Zarejestruj nowe szczepienie' },
                              { href: `?tab=documents`, iconBg: 'bg-blue-500/15 border-blue-500/25', icon: '📄', label: 'Dodaj dokument', sub: 'Plik lub zdjęcie' },
                            ].map(item => (
                              <Link key={item.href} href={item.href}
                                className="flex items-center gap-3 rounded-xl px-3.5 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/10 transition group"
                              >
                                <span className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base shrink-0 ${item.iconBg}`}>{item.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition">{item.label}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                                </div>
                                <span className="text-gray-700 group-hover:text-gray-400 transition shrink-0">›</span>
                              </Link>
                            ))}
                            <Link href="/report/lost"
                              className="flex items-center gap-3 rounded-xl px-3.5 py-3 bg-red-500/8 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/35 transition group"
                            >
                              <span className="w-9 h-9 rounded-xl border border-red-500/30 bg-red-500/15 flex items-center justify-center text-base shrink-0">🚨</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-red-400 group-hover:text-red-300 transition">Zgłoś zaginięcie</p>
                                <p className="text-xs text-red-500/60 mt-0.5">Utwórz nowe zgłoszenie</p>
                              </div>
                              <span className="text-red-700 group-hover:text-red-500 transition shrink-0">›</span>
                            </Link>
                          </>
                        ) : (
                          <>
                            {pet.contact_phone && (
                              <a href={`tel:${pet.contact_phone}`} className="flex items-center gap-3 rounded-xl px-3.5 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition">
                                <span className="w-9 h-9 rounded-xl border border-green-500/25 bg-green-500/10 flex items-center justify-center text-base shrink-0">📞</span>
                                <span className="text-sm text-gray-200 font-semibold">Zadzwoń do właściciela</span>
                              </a>
                            )}
                            {pet.contact_email && (
                              <a href={`mailto:${pet.contact_email}`} className="flex items-center gap-3 rounded-xl px-3.5 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition">
                                <span className="w-9 h-9 rounded-xl border border-blue-500/25 bg-blue-500/10 flex items-center justify-center text-base shrink-0">✉️</span>
                                <span className="text-sm text-gray-200 font-semibold">Napisz wiadomość</span>
                              </a>
                            )}
                            <div className="pt-1"><QrChipCode chipId={pet.chip_id} petName={petName} profileUrl={profileUrl} /></div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Kontakty */}
                    {isOwner && linkedContacts.length > 0 && (
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                          <div className="w-1 h-5 bg-blue-500 rounded-full shrink-0" />
                          <h3 className="font-bold text-white text-base flex-1">Kontakty</h3>
                          <Link href="/contacts" className="text-xs text-orange-500 hover:text-orange-400 transition font-medium">Zarządzaj →</Link>
                        </div>
                        <div className="divide-y divide-[#222]">
                          {linkedContacts.slice(0, 4).map((contact: UserContact) => (
                            <div key={contact.id} className="flex items-center gap-3 px-4 py-3">
                              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-base shrink-0">
                                {CONTACT_TYPE_META[contact.type]?.emoji ?? '📋'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-200 truncate">{contact.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{contact.phone ?? contact.email ?? ''}</p>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                {contact.phone && <a href={`tel:${contact.phone}`} className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition text-xs">📞</a>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── HISTORIA ── */}
                {tab === 'history' && (
                  <div className="bg-[#161616] border border-[#262626] rounded-2xl p-5">
                    {isOwner ? (
                      <PetTimeline petId={id} vaccinations={vaccinations} medicalRecords={medicalRecords} vetDocs={vetDocsWithUrls} />
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">Historia dostępna tylko dla właściciela</p>
                    )}
                  </div>
                )}

                {/* ── ZDROWIE ── */}
                {tab === 'health' && (
                  <div className="bg-[#161616] border border-[#262626] rounded-2xl overflow-hidden">
                    {isOwner ? (
                      <>
                        <div className="px-5 py-3.5 border-b border-[#262626] flex items-center gap-2">
                          <span>💊</span>
                          <h2 className="font-semibold text-white text-sm flex-1">Szczepienia</h2>
                          <span className="text-xs bg-white/8 text-gray-400 px-2 py-0.5 rounded-full">{vaccinations.length}</span>
                        </div>
                        {vaccinations.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-8">Brak zarejestrowanych szczepień</p>
                        ) : (
                          <div className="divide-y divide-[#222]">
                            {vaccinations.map(vax => {
                              const isDue = vax.next_due && new Date(vax.next_due) < now
                              const isDueSoon = vax.next_due && !isDue && new Date(vax.next_due).getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
                              return (
                                <div key={vax.id} className="flex items-center gap-4 px-5 py-3.5">
                                  <span className="text-xl shrink-0">💉</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-200">{vax.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Podano: {fmtDate(vax.date_given)}{vax.vet_name ? ` · ${vax.vet_name}` : ''}</p>
                                  </div>
                                  {vax.next_due && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isDue ? 'bg-red-500/15 text-red-400' : isDueSoon ? 'bg-yellow-500/15 text-yellow-400' : 'bg-green-500/15 text-green-400'}`}>
                                      {isDue ? '⚠️ Przeterminowane' : isDueSoon ? '⏰ Wkrótce' : `✓ do ${fmtDate(vax.next_due)}`}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <div className="p-4 border-t border-[#262626]">
                          <Link href={`/pets/${id}?tab=history`} className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                            + Dodaj szczepienie
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">Dane zdrowotne dostępne tylko dla właściciela</p>
                    )}
                  </div>
                )}

                {/* ── DOKUMENTY ── */}
                {tab === 'documents' && (
                  <div className="bg-[#161616] border border-[#262626] rounded-2xl overflow-hidden">
                    {isOwner ? (
                      <>
                        <div className="px-5 py-3.5 border-b border-[#262626] flex items-center gap-2">
                          <span>📄</span>
                          <h2 className="font-semibold text-white text-sm flex-1">Dokumenty weterynaryjne</h2>
                          <span className="text-xs bg-white/8 text-gray-400 px-2 py-0.5 rounded-full">{vetDocsWithUrls.length}</span>
                        </div>
                        {vetDocsWithUrls.length === 0 ? (
                          <div className="text-center py-10 px-4">
                            <p className="text-3xl mb-2">📄</p>
                            <p className="text-sm text-gray-400 font-medium">Brak dokumentów</p>
                            <p className="text-xs text-gray-600 mt-1">Dokumenty dodaje weterynarz podczas wizyty</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-[#222]">
                            {vetDocsWithUrls.map(doc => (
                              <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5">
                                <span className="text-xl shrink-0">📋</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-gray-200">{doc.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {(doc.vet_profile as { clinic_name?: string } | undefined)?.clinic_name ?? ''}
                                    {doc.notes ? ` · ${doc.notes}` : ''}
                                  </p>
                                </div>
                                {doc.signedUrl && (
                                  <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs bg-white/8 text-gray-300 border border-white/10 px-3 py-1.5 rounded-xl hover:bg-white/15 transition">
                                    Pobierz
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">Dokumenty dostępne tylko dla właściciela</p>
                    )}
                  </div>
                )}

                {/* ── INCYDENTY ── */}
                {tab === 'incidents' && (
                  <div className="space-y-4 max-w-3xl">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Zgłoszenia zaginięcia i znalezienia powiązane z właścicielem</p>
                      {isOwner && (
                        <Link href="/report/lost" className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 font-semibold px-3 py-1.5 rounded-xl transition">
                          + Nowe zgłoszenie
                        </Link>
                      )}
                    </div>
                    {incidents.length === 0 ? (
                      <div className="bg-[#161616] border border-[#262626] rounded-2xl p-10 text-center">
                        <p className="text-4xl mb-3">📡</p>
                        <p className="text-sm text-gray-400 font-medium">Brak incydentów</p>
                        <p className="text-xs text-gray-600 mt-1.5">Historyczne zgłoszenia zaginięcia pojawią się tutaj</p>
                        {isOwner && (
                          <Link href="/report/lost" className="mt-5 inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
                            🚨 Zgłoś zaginięcie
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="bg-[#161616] border border-[#262626] rounded-2xl overflow-hidden">
                        <div className="divide-y divide-[#222]">
                          {incidents.map(incident => {
                            const isLostIncident = incident.type === 'lost'
                            const isResolved = incident.status === 'resolved'
                            const reportDate = new Date(incident.created_at).toLocaleDateString('pl', { day: 'numeric', month: 'short', year: 'numeric' })
                            return (
                              <Link key={incident.id} href={`/pets/${incident.id}`}
                                className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition group">
                                <div className="w-12 h-12 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] overflow-hidden shrink-0">
                                  {incident.primary_photo_url
                                    ? <img src={incident.primary_photo_url} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-xl">{isLostIncident ? '🚨' : '🐾'}</div>
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      isLostIncident
                                        ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                        : 'bg-green-500/15 text-green-400 border-green-500/25'
                                    }`}>
                                      {isLostIncident ? '● Zaginiony' : '● Znaleziony'}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      isResolved
                                        ? 'bg-gray-500/15 text-gray-400 border-gray-500/25'
                                        : 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                                    }`}>
                                      {isResolved ? 'Zakończony' : 'Aktywny'}
                                    </span>
                                  </div>
                                  <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition truncate">
                                    {incident.name ?? incident.species}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    {reportDate}{incident.last_seen_address ? ` · ${incident.last_seen_address}` : ''}
                                  </p>
                                </div>
                                <span className="text-gray-700 group-hover:text-gray-400 transition shrink-0">›</span>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── KONTAKTY ── */}
                {tab === 'contacts' && (
                  <div className="bg-[#161616] border border-[#262626] rounded-2xl overflow-hidden">
                    {linkedContacts.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-3xl mb-2">👥</p>
                        <p className="text-sm font-medium text-gray-400">Brak kontaktów przypisanych do {petName}</p>
                        <Link href="/contacts" className="mt-3 inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 transition">
                          Zarządzaj kontaktami →
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="divide-y divide-[#222]">
                          {linkedContacts.map((contact: UserContact) => (
                            <div key={contact.id} className="flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition">
                              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl shrink-0">
                                {CONTACT_TYPE_META[contact.type]?.emoji ?? '📋'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-200 text-sm">{contact.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {contact.animal_type && <span className="text-xs text-gray-500">{ANIMAL_EMOJI[contact.animal_type] ?? '🐾'}</span>}
                                  {contact.phone && <span className="text-xs text-gray-500">{contact.phone}</span>}
                                  {contact.email && <span className="text-xs text-gray-500 truncate">{contact.email}</span>}
                                </div>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                {contact.phone && <a href={`tel:${contact.phone}`} className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition text-sm">📞</a>}
                                {contact.email && <a href={`mailto:${contact.email}`} className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition text-sm">✉️</a>}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="px-5 py-3 border-t border-white/8">
                          <Link href="/contacts" className="text-xs text-orange-500 hover:text-orange-600 transition">
                            Zarządzaj wszystkimi kontaktami →
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ── Module preview strip ── */}
              <div className="px-5 sm:px-8 pb-20">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-[#242424]" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest shrink-0">Powiązane moduły</p>
                  <div className="flex-1 h-px bg-[#242424]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                  {/* PetRadar */}
                  <Link href="/radar" className="group bg-[#1a1a1a] border border-[#2a2a2a] hover:border-orange-500/40 rounded-2xl p-4 flex flex-col gap-3 transition shadow-lg shadow-black/20 hover:shadow-orange-500/5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📡</span>
                      <div>
                        <p className="text-xs font-bold text-white">PetRadar</p>
                        <p className="text-[10px] text-gray-600">Mapa i zgłoszenia</p>
                      </div>
                    </div>
                    <div className="relative h-20 rounded-xl bg-[#1e2a1e] border border-[#2a3a2a] overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #4ade80 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                      <div className="relative flex gap-2">
                        <span className="text-lg drop-shadow">📍</span>
                        <span className="text-lg drop-shadow opacity-60" style={{ marginTop: '6px' }}>📍</span>
                        <span className="text-lg drop-shadow opacity-40" style={{ marginTop: '-4px', marginLeft: '2px' }}>📍</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-orange-500 shrink-0" /> Aktywne zgłoszenia w pobliżu
                      </p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" /> Filtry gatunków i statusów
                      </p>
                    </div>
                  </Link>

                  {/* PetBook */}
                  <Link href="/profile" className="group bg-[#1a1a1a] border border-[#2a2a2a] hover:border-orange-500/40 rounded-2xl p-4 flex flex-col gap-3 transition shadow-lg shadow-black/20 hover:shadow-orange-500/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-base">🐾</div>
                      <div>
                        <p className="text-sm font-bold text-white">PetBook</p>
                        <p className="text-xs text-gray-500">Twoje zwierzaki</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 bg-[#222] rounded-xl px-3 py-2.5 border border-[#2e2e2e]">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-sm shrink-0">{SPECIES_EMOJI[pet.species]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-200 truncate">{petName}</p>
                          <p className="text-xs text-gray-500">{ageLabel ?? ''}{ageLabel && pet.species ? ' · ' : ''}{pet.species === 'cat' ? 'Kot' : pet.species === 'dog' ? 'Pies' : pet.species}</p>
                        </div>
                        <span className="text-gray-600 text-sm group-hover:text-orange-500 transition">›</span>
                      </div>
                    </div>
                    <span className="text-xs text-center text-orange-500 font-semibold py-2 rounded-xl border border-orange-500/20 bg-orange-500/8 group-hover:bg-orange-500/15 transition">
                      + Dodaj nowego pupila
                    </span>
                  </Link>

                  {/* Incydenty */}
                  <Link href="/radar" className="group bg-[#1a1a1a] border border-[#2a2a2a] hover:border-orange-500/40 rounded-2xl p-4 flex flex-col gap-3 transition shadow-lg shadow-black/20 hover:shadow-orange-500/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center text-base">🚨</div>
                      <div>
                        <p className="text-sm font-bold text-white">Incydenty</p>
                        <p className="text-xs text-gray-500">Aktywne zgłoszenia</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 bg-[#222] rounded-xl px-3 py-2.5 border border-[#2e2e2e]">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-200 truncate">Zaginął kot</p>
                          <p className="text-xs text-gray-500">Warszawa · dziś</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">Aktywny</span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-[#222] rounded-xl px-3 py-2.5 border border-[#2e2e2e]">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-700 to-gray-700 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-200 truncate">Znaleziono psa</p>
                          <p className="text-xs text-gray-500">Kraków · wczoraj</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 shrink-0">Znaleziony</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center group-hover:text-orange-500 transition">Przeglądaj wszystkie →</p>
                  </Link>

                  {/* Kontakty */}
                  <Link href="/contacts" className="group bg-[#1a1a1a] border border-[#2a2a2a] hover:border-orange-500/40 rounded-2xl p-4 flex flex-col gap-3 transition shadow-lg shadow-black/20 hover:shadow-orange-500/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-base">👥</div>
                      <div>
                        <p className="text-sm font-bold text-white">Kontakty</p>
                        <p className="text-xs text-gray-500">Weterynarze i pomoc</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { emoji: '👤', role: 'Właściciel', name: 'Sebastian R.' },
                        { emoji: '🚨', role: 'Kontakt awaryjny', name: 'Jan Kowalski' },
                        { emoji: '🏥', role: 'Weterynarz', name: 'Wet. Marynarz' },
                      ].map((c, i) => (
                        <div key={i} className="flex items-center gap-2.5 bg-[#222] rounded-xl px-3 py-2.5 border border-[#2e2e2e]">
                          <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-base shrink-0">{c.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-200 truncate">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 text-center group-hover:text-orange-500 transition">Zarządzaj kontaktami →</p>
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT: Live radar sidebar */}
            <div className="hidden xl:flex flex-col w-80 shrink-0 border-l border-[#1a1a1a] sticky top-14 self-start overflow-y-auto" style={{ height: 'calc(100vh - 3.5rem)' }}>
              {/* Map preview */}
              <div className="h-56 shrink-0 overflow-hidden">
                <MapView defaultCenter={[52.2297, 21.0122]} defaultZoom={10} interactive={false} />
              </div>
              {/* PetRadar header */}
              <div className="px-4 pt-4 pb-3 border-b border-[#222] shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  <span className="text-sm font-bold text-white flex-1">PetRadar</span>
                  <span className="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">{radarActiveCount} aktywnych</span>
                </div>
                <p className="text-xs text-gray-600">Zgłoszenia zaginięć w Polsce</p>
              </div>
              {/* CTAs */}
              <div className="px-4 py-3 flex flex-col gap-2 shrink-0 border-b border-[#1a1a1a]">
                <Link href="/report/lost" className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/40 text-red-400 font-semibold text-xs py-2.5 rounded-xl transition">
                  🚨 Zgłoś zaginięcie
                </Link>
                <Link href="/report/found" className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 hover:border-green-500/40 text-green-400 font-semibold text-xs py-2.5 rounded-xl transition">
                  🐾 Zgłoś znalezienie
                </Link>
              </div>
              {/* Recent reports */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-4 pt-3 pb-2">Ostatnie zgłoszenia</p>
                {recentRadarPets.length > 0 ? (
                  <div className="divide-y divide-[#1e1e1e]">
                    {recentRadarPets.map(rp => (
                      <Link key={rp.id} href={`/pets/${rp.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition">
                        <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#252525] overflow-hidden shrink-0">
                          {rp.primary_photo_url
                            ? <img src={rp.primary_photo_url} alt={rp.name ?? ''} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-lg">{SPECIES_EMOJI[rp.species] ?? '🐾'}</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rp.type === 'lost' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-green-500/15 text-green-400 border border-green-500/20'}`}>
                            {rp.type === 'lost' ? '● Zaginiony' : '● Znaleziony'}
                          </span>
                          <p className="text-sm font-semibold text-gray-200 truncate mt-0.5">{rp.name ?? 'Nieznane'}</p>
                          <p className="text-xs text-gray-600 truncate">{rp.last_seen_address ?? ''}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 text-center py-6">Brak aktywnych zgłoszeń</p>
                )}
              </div>
              {/* Footer */}
              <div className="px-4 py-3 border-t border-[#1a1a1a] shrink-0">
                <Link href="/radar" className="flex items-center justify-center gap-1.5 text-xs text-orange-500 hover:text-orange-400 font-semibold transition">
                  Otwórz pełną mapę →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ LOST/FOUND PET — two-column layout ══ */}
      {!isProfile && (
        <>
        {/* ── Hero photo / identity ── */}
        <div className={`relative w-full overflow-hidden ${isLost ? 'bg-red-950' : 'bg-green-950'}`} style={{ minHeight: 260, maxHeight: 420 }}>
          {primaryPhoto ? (
            <Image
              src={getPhotoUrl(primaryPhoto.storage_path)}
              alt={petName}
              fill
              className="object-cover object-top"
              priority
            />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center text-[10rem] opacity-10 ${isLost ? 'bg-gradient-to-br from-red-900 to-red-950' : 'bg-gradient-to-br from-green-900 to-green-950'}`}>
              {SPECIES_EMOJI[pet.species]}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Back */}
          <Link href="/" className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-md text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/60 transition text-lg">←</Link>

          {/* Share */}
          <div className="absolute top-4 right-4 z-10">
            <ShareButton petName={petName} petType={pet.type as 'lost' | 'found'} />
          </div>

          {/* Identity */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-3 ${
              isLost
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-green-500 text-white shadow-lg shadow-green-500/30'
            }`}>
              {isLost
                ? <><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />{t('lost')}</>
                : <><span className="text-[10px]">✓</span>{t('found')}</>
              }
            </span>
            <h1 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
              {SPECIES_EMOJI[pet.species]} {petName}
            </h1>
            {pet.breed && <p className="text-sm text-gray-300 mt-1">{pet.breed}</p>}
            {pet.status === 'resolved' && (
              <span className="mt-2 inline-block text-xs bg-gray-500/60 text-gray-200 px-2.5 py-1 rounded-full">{t('resolved')}</span>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-5 px-4 lg:px-6 mt-5">

          {/* MAIN — first in DOM: on mobile shows photo/desc/map before contact info */}
          <div className="lg:col-start-1 lg:row-start-1 space-y-4 min-w-0">
            {(genderLabel || pet.is_neutered) && (
              <div className="flex flex-wrap gap-2">
                {genderLabel && <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 px-3 py-1.5 rounded-full font-medium">{genderLabel}</span>}
                {pet.is_neutered && <span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900 px-3 py-1.5 rounded-full font-medium">✂️ {t('neutered')}</span>}
              </div>
            )}

            {(pet.description || pet.character || pet.color || pet.allergies) && (
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <span className="text-base">📝</span>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('description')}</h2>
                </div>
                <div className="p-5 space-y-4">
                  {pet.color && <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{pet.color}</p>}
                  {pet.description && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pet.description}</p>}
                  {characterChips.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('character_label')}</p>
                      <div className="flex flex-wrap gap-2">
                        {characterChips.map((chip, i) => <span key={i} className={`text-xs px-3 py-1 rounded-full font-medium ${CHIP_COLORS[i % CHIP_COLORS.length]}`}>{chip}</span>)}
                      </div>
                    </div>
                  )}
                  {allergyChips.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('allergies_label')}</p>
                      <div className="flex flex-wrap gap-2">
                        {allergyChips.map((chip, i) => <span key={i} className="text-xs bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 px-3 py-1 rounded-full font-medium">⚠️ {chip}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pet.last_seen_lat != null && pet.last_seen_lng != null && (
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <span className="text-base">🗺️</span>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('location_label')}</h2>
                </div>
                <div className="h-64">
                  <MapView pets={[petWithPhoto]} defaultCenter={[pet.last_seen_lat, pet.last_seen_lng]} defaultZoom={15} interactive={false} />
                </div>
              </div>
            )}

            {isOwner && (
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <span className="text-base">🏥</span>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex-1">Historia zdrowia</h2>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {vaccinations.length + medicalRecords.length + vetDocsWithUrls.length}
                  </span>
                </div>
                <div className="p-5">
                  <PetTimeline petId={id} vaccinations={vaccinations} medicalRecords={medicalRecords} vetDocs={vetDocsWithUrls} />
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR — second in DOM: on mobile appears after main content */}
          <div className="lg:col-start-2 lg:row-start-1 space-y-4 lg:sticky lg:top-20 lg:self-start">

            <div className={sectionCls}>
              <div className="p-4 space-y-3">
                {(pet.contact_phone || pet.contact_email) && (
                  <div className="space-y-2">
                    {pet.contact_phone && (
                      <a href={`tel:${pet.contact_phone}`} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950 hover:border-orange-200 hover:text-orange-700 dark:hover:text-orange-300 transition">
                        📞 <span className="font-medium">{pet.contact_phone}</span>
                      </a>
                    )}
                    {pet.contact_email && (
                      <a href={`mailto:${pet.contact_email}`} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950 hover:border-orange-200 hover:text-orange-700 dark:hover:text-orange-300 transition truncate">
                        ✉️ <span className="font-medium truncate">{pet.contact_email}</span>
                      </a>
                    )}
                  </div>
                )}

                {!isOwner && pet.status === 'active' && (
                  user ? (
                    <form action={startConversation.bind(null, pet.id, pet.user_id)}>
                      <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.98] shadow-md shadow-orange-200 dark:shadow-orange-950">
                        💬 {t('contact_owner')}
                      </button>
                    </form>
                  ) : (
                    <Link href={`/auth/login?next=/pets/${pet.id}`} className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition shadow-md shadow-orange-200 dark:shadow-orange-950">
                      💬 {t('contact_owner')}
                    </Link>
                  )
                )}

                {pet.last_seen_address && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                    <span className="shrink-0 mt-0.5">📍</span>
                    <span className="leading-relaxed">{pet.last_seen_address}</span>
                  </p>
                )}
              </div>
            </div>

            {(pet.chip_id || isOwner) && (
              <div className={`${sectionCls} p-4 flex items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Chip / QR</p>
                  {pet.chip_id && <p className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">🏷️ {pet.chip_id}</p>}
                </div>
                <QrChipCode chipId={pet.chip_id} petName={petName} profileUrl={profileUrl} />
              </div>
            )}

            {(ownerVetProfile || pet.secured_by_vet_id) && (
              <div className={`${sectionCls} p-4 space-y-2`}>
                {ownerVetProfile && (
                  <span className={`text-xs font-medium px-2.5 py-1.5 rounded-full border inline-flex items-center gap-1.5 ${ownerVetProfile.verified ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'}`}>
                    🏥 {tv('badge')}{ownerVetProfile.verified ? ` — ${ownerVetProfile.clinic_name}` : ''}
                  </span>
                )}
                {pet.secured_by_vet_id && (
                  <span className="text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 rounded-full inline-flex items-center gap-1">
                    🏥 {tv('secured_label')}
                  </span>
                )}
              </div>
            )}

            {isOwner && pet.status === 'active' && (
              <div className={`${sectionCls} p-4 space-y-2`}>
                {isVet && pet.type === 'found' && !pet.secured_by_vet_id && (
                  <form action={secureAnimal.bind(null, pet.id)}>
                    <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm transition">{tv('secure_animal')}</button>
                  </form>
                )}
                <form action={resolvePet.bind(null, pet.id)}>
                  <button type="submit" className="w-full text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">{t('mark_resolved')}</button>
                </form>
              </div>
            )}

            {isVet && !isOwner && pet.type === 'found' && pet.status === 'active' && !pet.secured_by_vet_id && (
              <div className={`${sectionCls} p-4`}>
                <form action={secureAnimal.bind(null, pet.id)}>
                  <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm transition">{tv('secure_animal')}</button>
                </form>
              </div>
            )}

            {matches.length > 0 && (
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <span className="text-base">🤖</span>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('ai_matches', { n: matches.length })}</h2>
                </div>
                <div className="p-3 space-y-3">
                  {matches.map(match => {
                    const matchedPet = pet.type === 'lost' ? match.found_pet! : match.lost_pet!
                    const score = Math.round(match.similarity_score * 100)
                    return (
                      <div key={match.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 space-y-2">
                        <PetCard pet={matchedPet} />
                        <div className="flex items-center justify-between gap-2 flex-wrap px-0.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${score >= 80 ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' : score >= 60 ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{score}%</span>
                          {isOwner && (
                            <div className="flex gap-1.5">
                              <form action={updateMatchStatus.bind(null, match.id, 'accepted')}><button type="submit" className="text-xs bg-green-500 text-white px-2.5 py-1 rounded-lg hover:bg-green-600 transition">{t('match_accept')}</button></form>
                              <form action={updateMatchStatus.bind(null, match.id, 'rejected')}><button type="submit" className="text-xs border border-gray-200 dark:border-gray-700 text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">{t('match_reject')}</button></form>
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
              <p className="text-center text-xs text-gray-400 py-1">{t('no_ai_matches')}</p>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}
