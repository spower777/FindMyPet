'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import MapView from '@/components/MapView'
import PhotoSearch from '@/components/PhotoSearch'
import type { PetWithPhotos, VetProfile, UserContact, PetVaccination, PetMedicalRecord } from '@/lib/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾',
}

function calcAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  if (months < 12) return `${months} mies.`
  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat'}`
}

// ── Card wrapper — consistent across all sections ──────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#161616] border border-gray-100 dark:border-[#242424] rounded-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

// ── Props ──────────────────────────────────────────────────────

interface Props {
  user: { id: string; email: string } | null
  primaryPet: PetWithPhotos | null
  vaccinations: PetVaccination[]
  medicalRecords: PetMedicalRecord[]
  userContacts: UserContact[]
  radarPets: PetWithPhotos[]
  radarActiveCount: number
  vets: VetProfile[]
}

// ── PetRadar sidebar ───────────────────────────────────────────

function RadarSidebar({
  radarPets,
  radarActiveCount,
}: {
  radarPets: PetWithPhotos[]
  radarActiveCount: number
}) {
  return (
    <Card>
      {/* Map — explicit dimensions so Leaflet renders */}
      <div className="w-full h-48 overflow-hidden">
        <MapView
          defaultCenter={[52.2297, 21.0122]}
          defaultZoom={10}
          interactive={false}
        />
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-[#222]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-gray-900 dark:text-white flex-1">PetRadar</span>
          <span className="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
            {radarActiveCount} aktywnych
          </span>
        </div>
        <p className="text-xs text-gray-500">Zgłoszenia zaginięć w Polsce</p>
      </div>

      {/* AI Photo Search — above report CTAs */}
      <div className="border-b border-gray-100 dark:border-[#222]">
        <PhotoSearch compact />
      </div>

      {/* CTAs */}
      <div className="px-4 py-3 flex flex-col gap-2 border-b border-gray-100 dark:border-[#222]">
        <Link
          href="/report/lost"
          className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 font-semibold text-xs py-2.5 rounded-xl transition"
        >
          🚨 Zgłoś zaginięcie
        </Link>
        <Link
          href="/report/found"
          className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-green-400 font-semibold text-xs py-2.5 rounded-xl transition"
        >
          🐾 Zgłoś znalezienie
        </Link>
      </div>

      {/* Recent reports */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 pt-3 pb-1">
          Ostatnie zgłoszenia
        </p>
        {radarPets.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">Brak aktywnych zgłoszeń</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#1e1e1e]">
            {radarPets.map(rp => (
              <Link
                key={rp.id}
                href={`/pets/${rp.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] overflow-hidden shrink-0">
                  {rp.primary_photo_url ? (
                    <img
                      src={rp.primary_photo_url}
                      alt={rp.name ?? ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base">
                      {SPECIES_EMOJI[rp.species] ?? '🐾'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-0.5 ${
                      rp.type === 'lost'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                        : 'bg-green-500/15 text-green-400 border border-green-500/20'
                    }`}
                  >
                    {rp.type === 'lost' ? '● Zaginiony' : '● Znaleziony'}
                  </span>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{rp.name ?? 'Nieznane'}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 truncate">{rp.last_seen_address ?? ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-[#222]">
        <Link
          href="/radar"
          className="flex items-center justify-center gap-1.5 text-xs text-orange-500 hover:text-orange-400 font-semibold transition"
        >
          Otwórz pełną mapę →
        </Link>
      </div>
    </Card>
  )
}

// ── Module grid ────────────────────────────────────────────────

function ModuleGrid({ cards }: { cards: { href: string; icon: string; label: string; sub: string }[] }) {
  return (
    <div>
      <SectionLabel>Ekosystem FindMyPet</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(c => (
          <Link
            key={c.href + c.label}
            href={c.href}
            className="group bg-white dark:bg-[#161616] border border-gray-100 dark:border-[#242424] hover:border-orange-500/30 rounded-2xl p-4 flex flex-col gap-3 transition overflow-hidden"
          >
            <span className="text-2xl">{c.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition leading-snug line-clamp-1">
                {c.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{c.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Recent reports (left column) ───────────────────────────────

function RecentReports({ radarPets }: { radarPets: PetWithPhotos[] }) {
  if (radarPets.length === 0) return null
  return (
    <div>
      <SectionLabel>Ostatnie zgłoszenia</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {radarPets.map(rp => (
          <Link
            key={rp.id}
            href={`/pets/${rp.id}`}
            className="flex items-center gap-4 bg-white dark:bg-[#161616] border border-gray-100 dark:border-[#242424] hover:border-orange-500/30 rounded-2xl p-4 transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] overflow-hidden shrink-0">
              {rp.primary_photo_url ? (
                <img
                  src={rp.primary_photo_url}
                  alt={rp.name ?? ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">
                  {SPECIES_EMOJI[rp.species] ?? '🐾'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 ${
                  rp.type === 'lost'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : 'bg-green-500/15 text-green-400 border border-green-500/20'
                }`}
              >
                {rp.type === 'lost' ? '● Zaginiony' : '● Znaleziony'}
              </span>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-500 transition">
                {rp.name ?? 'Nieznane'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 truncate">{rp.last_seen_address ?? ''}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Page shell — two-col grid, sidebar always visible ─────────

function PageShell({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div className="bg-gray-50 dark:bg-[#0e0e0e] min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/*
          Two-column at lg (1024px+): left flex-1, right fixed 340px.
          Below lg: single column, sidebar stacks below left content.
        */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="min-w-0 space-y-6">{left}</div>
          <div className="hidden lg:block lg:sticky lg:top-20">{right}</div>
        </div>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────

export default function HomeClient({
  user,
  primaryPet,
  vaccinations,
  userContacts,
  radarPets,
  radarActiveCount,
}: Props) {
  const radar = <RadarSidebar radarPets={radarPets} radarActiveCount={radarActiveCount} />

  // ── Not logged in ─────────────────────────────────────────────
  if (!user) {
    return (
      <PageShell
        left={
          <>
            {/* Brand hero */}
            <Card>
              <div className="relative overflow-hidden" style={{ minHeight: 300 }}>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-950/50 via-[#161616] to-[#161616]" />
                <div className="absolute bottom-0 right-0 text-[14rem] leading-none opacity-5 pointer-events-none select-none">
                  🐾
                </div>
                <div className="relative px-7 py-9">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                      {radarActiveCount} aktywnych zgłoszeń w Polsce
                    </span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.05] tracking-tight mb-4">
                    Znajdź<br />swojego pupila
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base mb-6 max-w-md leading-relaxed">
                    Społecznościowa platforma dla zagubionych i znalezionych zwierząt. Stwórz profil, zgłoś zaginięcie, połącz się z innymi.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/auth/login"
                      className="bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-orange-500/20"
                    >
                      Dołącz za darmo →
                    </Link>
                    <Link
                      href="/auth/login"
                      className="bg-white/8 hover:bg-white/14 border border-white/12 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
                    >
                      Zaloguj się
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            <ModuleGrid
              cards={[
                { href: '/radar',      icon: '📡', label: 'PetRadar',        sub: 'Mapa zagubionych i znalezionych' },
                { href: '/auth/login', icon: '🐾', label: 'Profil pupila',   sub: 'Historia zdrowia, dokumenty, chip' },
                { href: '/auth/login', icon: '💉', label: 'Zdrowie',         sub: 'Szczepienia i wizyty wet.' },
                { href: '/auth/login', icon: '👥', label: 'Kontakty',        sub: 'Weterynarze i pomoc' },
                { href: '/auth/login', icon: '💬', label: 'Wiadomości',      sub: 'Kontakt z właścicielami' },
                { href: '/auth/login', icon: '🔖', label: 'Chip & QR',       sub: 'Profil powiązany z chipem' },
              ]}
            />

            <RecentReports radarPets={radarPets} />
          </>
        }
        right={radar}
      />
    )
  }

  // ── Logged in, no pet ─────────────────────────────────────────
  if (!primaryPet) {
    return (
      <PageShell
        left={
          <>
            <Card>
              <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-950/40 via-[#161616] to-[#161616]" />
                <div className="absolute bottom-0 right-0 text-[12rem] leading-none opacity-5 pointer-events-none select-none">
                  🐾
                </div>
                <div className="relative px-7 py-9">
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">
                    Witaj w FindMyPet
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
                    Twój pupil<br />czeka na profil
                  </h2>
                  <p className="text-gray-400 text-sm mb-6 max-w-md">
                    Stwórz profil — historia zdrowia, dokumenty, chip, kontakty w jednym miejscu.
                  </p>
                  <Link
                    href="/pets/new"
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-orange-500/20"
                  >
                    🐾 Dodaj pierwszego pupila
                  </Link>
                </div>
              </div>
            </Card>

            <ModuleGrid
              cards={[
                { href: '/radar',        icon: '📡', label: 'PetRadar',          sub: 'Mapa zgłoszeń zaginięć' },
                { href: '/pets/new',     icon: '🐾', label: 'Dodaj pupila',      sub: 'Stwórz nowy profil' },
                { href: '/contacts',     icon: '👥', label: 'Kontakty',          sub: 'Weterynarze i pomoc' },
                { href: '/chat',         icon: '💬', label: 'Wiadomości',        sub: 'Czat z właścicielami' },
                { href: '/report/lost',  icon: '🚨', label: 'Zgłoś zaginięcie', sub: 'Utwórz nowe zgłoszenie' },
                { href: '/report/found', icon: '🐾', label: 'Znaleziono',        sub: 'Zgłoś znalezione zwierzę' },
              ]}
            />

            <RecentReports radarPets={radarPets} />
          </>
        }
        right={radar}
      />
    )
  }

  // ── Full dashboard ────────────────────────────────────────────
  const pet = primaryPet
  const petName = pet.name ?? 'Pupil'
  const ageLabel = pet.birth_date ? calcAge(pet.birth_date) : null
  const now = new Date()

  const overdueVax = vaccinations.filter(
    v => v.next_due && new Date(v.next_due) < now
  )
  const soonVax = vaccinations.filter(v => {
    if (!v.next_due) return false
    const diff = new Date(v.next_due).getTime() - now.getTime()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
  })

  return (
    <PageShell
      left={
        <>
          {/* ── Hero ── */}
          <Card>
            <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
              {pet.primary_photo_url ? (
                <>
                  <Image
                    src={pet.primary_photo_url}
                    alt={petName}
                    fill
                    className="object-cover object-top"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/55 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/55 via-transparent to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 via-[#161616] to-[#161616]" />
              )}

              {/* Top-right: profile link */}
              <div className="absolute top-4 right-4 z-20">
                <Link
                  href={`/pets/${pet.id}`}
                  className="bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15 transition"
                >
                  Pełny profil →
                </Link>
              </div>

              {/* Identity */}
              <div className="relative px-6 pb-6 pt-48 sm:pt-52 z-10 flex items-end gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 ring-2 ring-white/20 shadow-2xl bg-[#1a1a1a]">
                  {pet.primary_photo_url ? (
                    <Image
                      src={pet.primary_photo_url}
                      alt={petName}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {SPECIES_EMOJI[pet.species]}
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-end gap-2 mb-2 flex-wrap">
                    <h1 className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight drop-shadow-lg">
                      {petName}
                    </h1>
                    <span className="text-2xl">{SPECIES_EMOJI[pet.species]}</span>
                  </div>
                  {pet.breed && <p className="text-gray-400 text-sm mb-2">{pet.breed}</p>}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {ageLabel && (
                      <span className="text-xs bg-black/50 backdrop-blur-sm text-gray-200 px-2.5 py-1 rounded-full border border-white/15 font-medium">
                        {ageLabel}
                      </span>
                    )}
                    {pet.gender && pet.gender !== 'unknown' && (
                      <span className="text-xs bg-black/50 backdrop-blur-sm text-gray-200 px-2.5 py-1 rounded-full border border-white/15 font-medium">
                        {pet.gender === 'male' ? '♂ Samiec' : '♀ Samica'}
                      </span>
                    )}
                    {pet.is_neutered && (
                      <span className="text-xs bg-teal-900/70 text-teal-300 px-2.5 py-1 rounded-full border border-teal-500/30 font-medium">
                        ✂️ Kastracja
                      </span>
                    )}
                    {pet.chip_id && (
                      <span className="text-xs bg-black/50 text-gray-400 px-2.5 py-1 rounded-full border border-white/10 font-mono">
                        🔖 {pet.chip_id}
                      </span>
                    )}
                  </div>
                  {pet.description && (
                    <p className="text-gray-300/70 italic text-sm leading-relaxed line-clamp-2 max-w-lg">
                      „{pet.description}"
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Link
                      href={`/pets/${pet.id}`}
                      className="bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-orange-500/20"
                    >
                      🐾 Zobacz profil
                    </Link>
                    <Link
                      href="/report/lost"
                      className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold text-xs px-4 py-2 rounded-xl transition"
                    >
                      🚨 Zgłoś zaginięcie
                    </Link>
                    <Link
                      href="/contacts"
                      className="bg-white/6 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-semibold text-xs px-4 py-2 rounded-xl transition"
                    >
                      👥 Kontakty
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Health alert ── */}
          {(overdueVax.length > 0 || soonVax.length > 0) && (
            <Card className="px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-xl shrink-0">
                  {overdueVax.length > 0 ? '⚠️' : '⏰'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${overdueVax.length > 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {overdueVax.length > 0
                      ? `${overdueVax.length} przeterminowane szczepienie`
                      : `${soonVax.length} szczepienie wkrótce`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(overdueVax[0] ?? soonVax[0]).name}
                    {(overdueVax[0] ?? soonVax[0]).next_due &&
                      ` — ${new Date((overdueVax[0] ?? soonVax[0]).next_due!).toLocaleDateString('pl-PL')}`}
                  </p>
                </div>
                <Link
                  href={`/pets/${pet.id}?tab=health`}
                  className="text-xs text-orange-500 hover:text-orange-400 font-semibold whitespace-nowrap transition"
                >
                  Szczegóły →
                </Link>
              </div>
            </Card>
          )}

          {/* ── Module grid ── */}
          <ModuleGrid
            cards={[
              {
                href: `/pets/${pet.id}`,
                icon: SPECIES_EMOJI[pet.species],
                label: petName,
                sub: 'Pełny profil pupila',
              },
              {
                href: '/radar',
                icon: '📡',
                label: 'PetRadar',
                sub: 'Mapa zagubionych zwierząt',
              },
              {
                href: `/pets/${pet.id}?tab=health`,
                icon: '💉',
                label: 'Zdrowie',
                sub: `${vaccinations.length} szczepień`,
              },
              {
                href: '/contacts',
                icon: '👥',
                label: 'Kontakty',
                sub: `${userContacts.length} zapisanych`,
              },
              {
                href: '/chat',
                icon: '💬',
                label: 'Wiadomości',
                sub: 'Czat z właścicielami',
              },
              {
                href: `/pets/${pet.id}?tab=documents`,
                icon: '📄',
                label: 'Dokumenty',
                sub: 'Dokumenty weterynaryjne',
              },
            ]}
          />

          {/* ── Recent reports ── */}
          <RecentReports radarPets={radarPets} />
        </>
      }
      right={radar}
    />
  )
}
