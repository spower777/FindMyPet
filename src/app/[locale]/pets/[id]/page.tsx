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
  'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
  'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300',
  'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
  'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
  'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300',
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

  const petName = pet.name ?? ts(pet.species as 'dog' | 'cat' | 'bird' | 'rabbit' | 'other')
  const ageInfo = pet.birth_date ? calcAge(pet.birth_date) : null
  const ageLabel = ageInfo
    ? ageInfo.years >= 1 ? t('age_years', { n: ageInfo.years }) : t('age_months', { n: ageInfo.months })
    : null
  const genderLabel = pet.gender === 'male' ? `♂ ${t('male')}` : pet.gender === 'female' ? `♀ ${t('female')}` : null

  const characterChips = parseChips(pet.character)
  const allergyChips = parseChips(pet.allergies)

  // Timeline preview — top 3 events by date
  const timelinePreview = [
    ...vaccinations.map(v => ({ date: v.date_given, label: v.name, icon: '💉', sub: v.vet_name ?? '' })),
    ...medicalRecords.map(r => ({ date: r.date, label: r.title, icon: '🩺', sub: RECORD_TYPE_LABEL[r.type] ?? r.type })),
    ...vetDocsWithUrls.map(d => ({ date: d.created_at.split('T')[0], label: d.title, icon: '📄', sub: (d.vet_profile as { vet_name?: string } | undefined)?.vet_name ?? '' })),
  ]
    .filter(e => !!e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

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

          {/* ── HERO — tall, cinematic ── */}
          <div className="relative w-full h-72 sm:h-96 overflow-hidden bg-[#0e0e0e]">
            {primaryPhoto ? (
              <Image
                src={getPhotoUrl(primaryPhoto.storage_path)}
                alt={petName}
                fill
                className="object-cover object-center"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10rem] opacity-20">
                {SPECIES_EMOJI[pet.species]}
              </div>
            )}
            {/* Strong bottom fade into page background */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-[#0e0e0e]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/60 via-transparent to-transparent" />

            <Link href="/" className="absolute top-5 left-5 bg-black/50 backdrop-blur-md text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition z-10 text-lg">←</Link>
            <div className="absolute top-5 right-5 z-10">
              <ShareButton petName={petName} petType="profile" />
            </div>
          </div>

          {/* ── Identity — flows from hero ── */}
          <div className="max-w-3xl mx-auto px-5 sm:px-8 -mt-20 relative z-10">
            <div className="flex items-end gap-5 mb-5">
              {/* Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 ring-2 ring-orange-500/40 shadow-xl shadow-black/60 bg-[#1a1a1a]">
                {primaryPhoto
                  ? <Image src={getPhotoUrl(primaryPhoto.storage_path)} alt={petName} width={112} height={112} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">{SPECIES_EMOJI[pet.species]}</div>
                }
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight">{petName}</h1>
                  <span className="text-2xl">{SPECIES_EMOJI[pet.species]}</span>
                </div>
                {pet.breed && <p className="text-sm text-gray-500 mb-2.5">{pet.breed}</p>}
                <div className="flex flex-wrap gap-2">
                  {ageLabel && <span className="text-xs bg-white/8 text-gray-300 px-3 py-1 rounded-full border border-white/10 font-medium">{ageLabel}</span>}
                  {genderLabel && <span className="text-xs bg-white/8 text-gray-300 px-3 py-1 rounded-full border border-white/10 font-medium">{genderLabel}</span>}
                  {pet.is_neutered && <span className="text-xs bg-teal-500/15 text-teal-400 px-3 py-1 rounded-full border border-teal-500/20 font-medium">✂️ {t('neutered')}</span>}
                  {pet.chip_id && <span className="text-xs bg-white/8 text-gray-400 px-3 py-1 rounded-full border border-white/10 font-mono">🔖 {pet.chip_id}</span>}
                </div>
              </div>

              {isOwner && (
                <Link href={`/pets/${id}/edit`} className="shrink-0 mb-1 text-xs bg-white/8 hover:bg-white/15 text-gray-300 border border-white/10 px-3 py-2 rounded-xl font-medium transition">
                  ✏️ Edytuj
                </Link>
              )}
            </div>

            {pet.description && (
              <p className="text-gray-400 italic text-sm leading-relaxed mb-7 pl-1">„{pet.description}"</p>
            )}

            {/* ── Tabs ── */}
            <div className="flex gap-0 border-b border-white/8 mb-6 overflow-x-auto scrollbar-none">
              {[
                { key: 'overview',  label: 'Przegląd',  icon: '🐾' },
                { key: 'history',   label: 'Historia',  icon: '📅', count: vaccinations.length + medicalRecords.length },
                { key: 'health',    label: 'Zdrowie',   icon: '💊', count: vaccinations.length },
                { key: 'documents', label: 'Dokumenty', icon: '📄', count: vetDocsWithUrls.length },
                { key: 'incidents', label: 'Incydenty', icon: '📡' },
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

          {/* ── Tab content ── */}
          <div className="max-w-3xl mx-auto px-5 sm:px-8 pb-16">

            {/* ── PRZEGLĄD — 3-column ── */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Col 1 — O pupilu */}
                <div className={`${sectionCls} p-5 space-y-4`}>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-tight">O {petName}</h3>

                  {characterChips.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Temperament</p>
                      <div className="flex flex-wrap gap-1.5">
                        {characterChips.map((chip, i) => (
                          <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${CHIP_COLORS[i % CHIP_COLORS.length]}`}>
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {allergyChips.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Alergie</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allergyChips.map((chip, i) => (
                          <span key={i} className="text-xs bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 px-2.5 py-1 rounded-full font-medium">
                            ⚠️ {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!characterChips.length && !allergyChips.length && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Brak danych o charakterze</p>
                  )}

                  {/* Contact links */}
                  {(pet.contact_phone || pet.contact_email) && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                      {pet.contact_phone && (
                        <a href={`tel:${pet.contact_phone}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-orange-500 transition">
                          📞 {pet.contact_phone}
                        </a>
                      )}
                      {pet.contact_email && (
                        <a href={`mailto:${pet.contact_email}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-orange-500 transition truncate">
                          ✉️ {pet.contact_email}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Col 2 — Timeline życia */}
                <div className={`${sectionCls} p-5`}>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-tight mb-4">Timeline życia</h3>

                  {timelinePreview.length > 0 ? (
                    <div className="space-y-3">
                      {timelinePreview.map((event, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950 flex items-center justify-center text-base">
                              {event.icon}
                            </div>
                            {i < timelinePreview.length - 1 && (
                              <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mt-1" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{event.label}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(event.date)}{event.sub ? ` · ${event.sub}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Brak wpisów w historii</p>
                  )}

                  {isOwner && (
                    <Link
                      href={`/pets/${id}?tab=history`}
                      className="mt-4 text-xs text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition block"
                    >
                      Zobacz pełną historię →
                    </Link>
                  )}
                </div>

                {/* Col 3 — Szybki dostęp */}
                <div className={`${sectionCls} p-5`}>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-tight mb-4">Szybki dostęp</h3>

                  {isOwner ? (
                    <div className="space-y-2">
                      <Link href={`/pets/${id}?tab=history`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition text-sm">
                        <span className="text-base shrink-0">📝</span>
                        <div>
                          <p className="font-medium text-xs">Dodaj wpis</p>
                          <p className="text-[10px] text-orange-500/70">Dodaj wydarzenie do osi czasu</p>
                        </div>
                      </Link>
                      <Link href={`/pets/${id}?tab=health`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition text-sm">
                        <span className="text-base shrink-0">💉</span>
                        <div>
                          <p className="font-medium text-xs">Dodaj szczepienie</p>
                          <p className="text-[10px] text-teal-500/70">Zarejestruj nowe szczepienie</p>
                        </div>
                      </Link>
                      <Link href={`/pets/${id}?tab=documents`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition text-sm">
                        <span className="text-base shrink-0">📄</span>
                        <div>
                          <p className="font-medium text-xs">Dodaj dokument</p>
                          <p className="text-[10px] text-blue-500/70">Dodaj plik lub zdjęcie</p>
                        </div>
                      </Link>
                      <Link href="/report/lost" className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition text-sm">
                        <span className="text-base shrink-0">📡</span>
                        <div>
                          <p className="font-medium text-xs">Zgłoś zaginięcie</p>
                          <p className="text-[10px] text-red-400/70">Utwórz nowe zgłoszenie</p>
                        </div>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(pet.contact_phone || pet.contact_email) && (
                        <>
                          {pet.contact_phone && (
                            <a href={`tel:${pet.contact_phone}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 transition text-sm">
                              <span className="text-base">📞</span>
                              <span className="text-xs font-medium">Zadzwoń</span>
                            </a>
                          )}
                          {pet.contact_email && (
                            <a href={`mailto:${pet.contact_email}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition text-sm">
                              <span className="text-base">✉️</span>
                              <span className="text-xs font-medium">Napisz email</span>
                            </a>
                          )}
                        </>
                      )}
                      <div className="pt-2">
                        <QrChipCode chipId={pet.chip_id} petName={petName} profileUrl={profileUrl} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── HISTORIA ── */}
            {tab === 'history' && (
              <div className={`${sectionCls} p-5`}>
                {isOwner ? (
                  <PetTimeline petId={id} vaccinations={vaccinations} medicalRecords={medicalRecords} vetDocs={vetDocsWithUrls} />
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Historia dostępna tylko dla właściciela</p>
                )}
              </div>
            )}

            {/* ── ZDROWIE ── */}
            {tab === 'health' && (
              <div className={sectionCls}>
                {isOwner ? (
                  <>
                    <div className={sectionHeaderCls}>
                      <span>💊</span>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex-1">Szczepienia</h2>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{vaccinations.length}</span>
                    </div>
                    {vaccinations.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">Brak zarejestrowanych szczepień</p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {vaccinations.map(vax => {
                          const isDue = vax.next_due && new Date(vax.next_due) < now
                          const isDueSoon = vax.next_due && !isDue && new Date(vax.next_due).getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
                          return (
                            <div key={vax.id} className="flex items-center gap-4 px-5 py-3.5">
                              <span className="text-xl shrink-0">💉</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{vax.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Podano: {fmtDate(vax.date_given)}{vax.vet_name ? ` · ${vax.vet_name}` : ''}</p>
                              </div>
                              {vax.next_due && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                  isDue ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                                  : isDueSoon ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                                }`}>
                                  {isDue ? '⚠️ Przeterminowane' : isDueSoon ? '⏰ Wkrótce' : `✓ do ${fmtDate(vax.next_due)}`}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                      <Link href={`/pets/${id}?tab=history`} className="btn-primary text-sm inline-block text-center w-full py-2.5">
                        + Dodaj szczepienie
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Dane zdrowotne dostępne tylko dla właściciela</p>
                )}
              </div>
            )}

            {/* ── DOKUMENTY ── */}
            {tab === 'documents' && (
              <div className={sectionCls}>
                {isOwner ? (
                  <>
                    <div className={sectionHeaderCls}>
                      <span>📄</span>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex-1">Dokumenty weterynaryjne</h2>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{vetDocsWithUrls.length}</span>
                    </div>
                    {vetDocsWithUrls.length === 0 ? (
                      <div className="text-center py-10 px-4">
                        <p className="text-3xl mb-2">📄</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Brak dokumentów</p>
                        <p className="text-xs text-gray-400 mt-1">Dokumenty dodaje weterynarz podczas wizyty</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {vetDocsWithUrls.map(doc => (
                          <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5">
                            <span className="text-xl shrink-0">📋</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{doc.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {(doc.vet_profile as { clinic_name?: string } | undefined)?.clinic_name ?? ''}
                                {doc.notes ? ` · ${doc.notes}` : ''}
                              </p>
                            </div>
                            {doc.signedUrl && (
                              <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition">
                                Pobierz
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Dokumenty dostępne tylko dla właściciela</p>
                )}
              </div>
            )}

            {/* ── INCYDENTY ── */}
            {tab === 'incidents' && (
              <div className={`${sectionCls} p-8 text-center`}>
                <p className="text-4xl mb-3">📡</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Incydenty — Trop</p>
                <p className="text-xs text-gray-400 mt-1 mb-5">Historyczne zgłoszenia zaginięcia i znalezienia powiązane z {petName}</p>
                <Link href="/report/lost" className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
                  📡 Zgłoś zaginięcie
                </Link>
              </div>
            )}

            {/* ── KONTAKTY ── */}
            {tab === 'contacts' && (
              <div className={sectionCls}>
                {linkedContacts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-3xl mb-2">👥</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Brak kontaktów przypisanych do {petName}</p>
                    <Link href="/contacts" className="mt-3 inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 transition">
                      Zarządzaj kontaktami →
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {linkedContacts.map((contact: UserContact) => (
                        <div key={contact.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-xl shrink-0">
                            {CONTACT_TYPE_META[contact.type]?.emoji ?? '📋'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{contact.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {contact.animal_type && <span className="text-xs text-gray-400">{ANIMAL_EMOJI[contact.animal_type] ?? '🐾'}</span>}
                              {contact.phone && <span className="text-xs text-gray-400">{contact.phone}</span>}
                              {contact.email && <span className="text-xs text-gray-400 truncate">{contact.email}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {contact.phone && <a href={`tel:${contact.phone}`} className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-100 transition text-sm">📞</a>}
                            {contact.email && <a href={`mailto:${contact.email}`} className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition text-sm">✉️</a>}
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
        </div>
      )}

      {/* ══ LOST/FOUND PET — two-column layout ══ */}
      {!isProfile && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-5 px-4 lg:px-6 mt-5">

          {/* SIDEBAR */}
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

          {/* MAIN */}
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
        </div>
      )}
    </div>
  )
}
