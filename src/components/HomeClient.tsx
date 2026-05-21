'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import MapView from '@/components/MapView'
import type { PetWithPhotos, VetProfile, UserContact, PetVaccination, PetMedicalRecord } from '@/lib/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾',
}

const GENDER_LABEL: Record<string, string> = {
  male: '♂ Samiec', female: '♀ Samica', unknown: '— Nieznana',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  if (months < 12) return `${months} mies.`
  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat'}`
}

// ── Sub-components ────────────────────────────────────────────

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

// ── Props ─────────────────────────────────────────────────────

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

// ── Tabs config ───────────────────────────────────────────────

type Tab = 'overview' | 'health' | 'history' | 'contacts'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Przegląd', icon: '🐾' },
  { key: 'health',   label: 'Zdrowie',  icon: '💊' },
  { key: 'history',  label: 'Historia', icon: '📅' },
  { key: 'contacts', label: 'Kontakty', icon: '👥' },
]

// ── Main component ────────────────────────────────────────────

export default function HomeClient({
  user,
  primaryPet,
  vaccinations,
  medicalRecords,
  userContacts,
  radarPets,
  radarActiveCount,
  vets,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview')

  // ── STATE: no user ────────────────────────────────────────
  if (!user) {
    return <PublicLanding radarPets={radarPets} radarActiveCount={radarActiveCount} vets={vets} />
  }

  // ── STATE: user without pet ───────────────────────────────
  if (!primaryPet) {
    return <WelcomeNoPet radarPets={radarPets} radarActiveCount={radarActiveCount} />
  }

  // ── STATE: full dashboard ─────────────────────────────────
  const pet = primaryPet
  const petName = pet.name ?? 'Pupil'
  const ageLabel = pet.birth_date ? calcAge(pet.birth_date) : null

  const now = new Date()
  const timelineItems = [
    ...vaccinations.map(v => ({ date: v.date_given, label: v.name, icon: '💉', sub: v.vet_name ?? '', color: 'teal' as const })),
    ...medicalRecords.map(r => ({ date: r.date, label: r.title, icon: '🩺', sub: r.clinic_name ?? '', color: 'blue' as const })),
  ].filter(e => !!e.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

  return (
    <div className="bg-[#0e0e0e] min-h-screen">

      {/* ── HERO ── */}
      <div className="relative w-full overflow-hidden bg-[#0e0e0e]" style={{ height: 'min(72vh, 680px)', minHeight: '440px' }}>
        {pet.primary_photo_url ? (
          <Image
            src={pet.primary_photo_url}
            alt={petName}
            fill
            className="object-cover object-top"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[14rem] opacity-8 select-none">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/70 via-[#0e0e0e]/20 to-transparent" />

        {/* Top-right actions */}
        <div className="absolute top-5 right-5 z-10 flex gap-2">
          <Link
            href={`/pets/${pet.id}/edit`}
            className="bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white text-xs font-medium px-3.5 py-2 rounded-full border border-white/15 transition"
          >
            ✏️ Edytuj
          </Link>
          <button
            className="bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center border border-white/15 transition"
            title="Udostępnij"
          >
            <SendIcon />
          </button>
        </div>

        {/* Identity overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 pb-8 z-10">
          <div className="max-w-6xl mx-auto flex items-end gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 ring-2 ring-white/20 shadow-2xl bg-[#1a1a1a]">
              {pet.primary_photo_url
                ? <Image src={pet.primary_photo_url} alt={petName} width={112} height={112} className="w-full h-full object-cover object-top" />
                : <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">{SPECIES_EMOJI[pet.species]}</div>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-end gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tight drop-shadow-2xl">{petName}</h1>
                <span className="text-3xl sm:text-4xl">{SPECIES_EMOJI[pet.species]}</span>
              </div>
              {pet.breed && <p className="text-gray-400 text-sm mb-3">{pet.breed}</p>}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {ageLabel && <span className="text-xs bg-black/50 backdrop-blur-sm text-gray-200 px-2.5 py-1 rounded-full border border-white/15 font-medium">{ageLabel}</span>}
                {pet.gender && pet.gender !== 'unknown' && <span className="text-xs bg-black/50 backdrop-blur-sm text-gray-200 px-2.5 py-1 rounded-full border border-white/15 font-medium">{GENDER_LABEL[pet.gender]}</span>}
                {pet.is_neutered && <span className="text-xs bg-teal-900/70 backdrop-blur-sm text-teal-300 px-2.5 py-1 rounded-full border border-teal-500/30 font-medium">✂️ Kastracja</span>}
                {pet.chip_id && <span className="text-xs bg-black/50 backdrop-blur-sm text-gray-400 px-2.5 py-1 rounded-full border border-white/10 font-mono hidden sm:inline-flex">🔖 {pet.chip_id}</span>}
              </div>
              {pet.description && (
                <p className="text-gray-300/75 italic text-sm leading-relaxed max-w-lg drop-shadow line-clamp-2">„{pet.description}"</p>
              )}
              <div className="flex gap-2 mt-4">
                <Link href={`/pets/${pet.id}`} className="bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm px-4 py-2 rounded-full transition shadow-lg shadow-orange-500/30">
                  Pełny profil →
                </Link>
                <Link href="/report/lost" className="bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-400 font-semibold text-sm px-4 py-2 rounded-full transition">
                  🚨 Zgłoś zaginięcie
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex">

        {/* LEFT: tabs + content */}
        <div className="flex-1 min-w-0 overflow-x-hidden">

          {/* Tabs */}
          <div className="px-6 sm:px-10 mt-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-0 border-b border-white/8 max-w-6xl mx-auto">
              {TABS.map(t => {
                const isActive = tab === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                      isActive
                        ? 'border-orange-500 text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                )
              })}
              <div className="flex-1" />
              <Link
                href={`/pets/${pet.id}`}
                className="flex items-center gap-1 px-4 py-3 text-xs text-gray-600 hover:text-orange-500 transition whitespace-nowrap"
              >
                Pełny profil →
              </Link>
            </div>
          </div>

          {/* Tab content */}
          <div className="px-6 sm:px-10 py-6 max-w-6xl mx-auto">

            {/* ── PRZEGLĄD ── */}
            {tab === 'overview' && (
              <div className="space-y-5 max-w-2xl">

                {/* O pupilu */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                  <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                    <div className="w-1 h-5 bg-orange-500 rounded-full shrink-0" />
                    <h3 className="font-bold text-white text-base">O {petName}</h3>
                  </div>
                  <div className="p-5">
                    {pet.description
                      ? <p className="text-sm text-gray-300 leading-relaxed">{pet.description}</p>
                      : <p className="text-sm text-gray-500 italic">Brak opisu. <Link href={`/pets/${pet.id}/edit`} className="text-orange-500 hover:text-orange-400">Dodaj →</Link></p>
                    }
                    {(pet.character || pet.allergies) && (
                      <div className="mt-4 pt-4 border-t border-[#242424] grid grid-cols-2 gap-4">
                        {pet.character && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Charakter</p>
                            <div className="flex flex-wrap gap-1.5">
                              {pet.character.split(',').map((c, i) => (
                                <span key={i} className="text-xs bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2.5 py-1 rounded-full">{c.trim()}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {pet.allergies && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Alergie</p>
                            <div className="flex flex-wrap gap-1.5">
                              {pet.allergies.split(',').map((a, i) => (
                                <span key={i} className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 px-2.5 py-1 rounded-full">⚠ {a.trim()}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Szybkie akcje */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                  <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                    <div className="w-1 h-5 bg-orange-500 rounded-full shrink-0" />
                    <h3 className="font-bold text-white text-base">Szybkie akcje</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { href: `/pets/${pet.id}?tab=health`, icon: '💉', label: 'Dodaj szczepienie', color: 'teal' },
                      { href: `/pets/${pet.id}?tab=history`, icon: '📝', label: 'Dodaj wpis', color: 'orange' },
                      { href: `/pets/${pet.id}?tab=documents`, icon: '📄', label: 'Dodaj dokument', color: 'blue' },
                      { href: `/pets/${pet.id}/edit`, icon: '✏️', label: 'Edytuj profil', color: 'gray' },
                      { href: '/report/lost', icon: '🚨', label: 'Zgłoś zaginięcie', color: 'red' },
                      { href: '/contacts', icon: '👥', label: 'Zarządzaj kontaktami', color: 'purple' },
                    ].map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/10 transition text-center group"
                      >
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-[11px] text-gray-400 group-hover:text-gray-200 transition font-medium leading-tight">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Kontakty preview */}
                {userContacts.length > 0 && (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                    <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                      <div className="w-1 h-5 bg-blue-500 rounded-full shrink-0" />
                      <h3 className="font-bold text-white text-base flex-1">Kontakty</h3>
                      <Link href="/contacts" className="text-xs text-orange-500 hover:text-orange-400 transition font-medium">Zarządzaj →</Link>
                    </div>
                    <div className="divide-y divide-[#222]">
                      {userContacts.slice(0, 3).map(contact => (
                        <div key={contact.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                            {contact.type === 'vet' ? '🏥' : contact.type === 'emergency' ? '🚨' : contact.type === 'owner' ? '👤' : '📋'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-200 truncate">{contact.name}</p>
                            <p className="text-xs text-gray-500">{contact.phone ?? contact.email ?? ''}</p>
                          </div>
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition text-xs shrink-0">📞</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ZDROWIE ── */}
            {tab === 'health' && (
              <div className="space-y-5 max-w-2xl">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                  <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                    <div className="w-1 h-5 bg-teal-500 rounded-full shrink-0" />
                    <h3 className="font-bold text-white text-base flex-1">Szczepienia</h3>
                    <span className="text-xs bg-teal-500/15 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full font-semibold">{vaccinations.length}</span>
                  </div>
                  {vaccinations.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-3xl mb-3">💉</p>
                      <p className="text-sm text-gray-400 font-medium">Brak szczepień</p>
                      <Link href={`/pets/${pet.id}?tab=health`} className="mt-4 inline-flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-400 transition font-medium bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl">
                        + Dodaj pierwsze szczepienie
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#222]">
                      {vaccinations.map(vax => {
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
                  )}
                  <div className="px-5 py-3 border-t border-[#222]">
                    <Link href={`/pets/${pet.id}?tab=health`} className="text-xs text-orange-500 hover:text-orange-400 transition font-medium">
                      Zarządzaj zdrowiem {petName} →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── HISTORIA ── */}
            {tab === 'history' && (
              <div className="space-y-5 max-w-2xl">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                  <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                    <div className="w-1 h-5 bg-orange-500 rounded-full shrink-0" />
                    <h3 className="font-bold text-white text-base flex-1">Timeline życia</h3>
                    <Link href={`/pets/${pet.id}?tab=history`} className="text-xs text-orange-500 hover:text-orange-400 transition font-medium">Pełna historia →</Link>
                  </div>
                  <div className="p-5">
                    {timelineItems.length > 0 ? (
                      <div>
                        {timelineItems.map((event, i) => {
                          const iconCls = event.color === 'teal'
                            ? 'bg-teal-500/15 border-teal-500/30'
                            : 'bg-blue-500/15 border-blue-500/30'
                          return (
                            <div key={i} className="flex gap-4">
                              <div className="flex flex-col items-center shrink-0">
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${iconCls}`}>{event.icon}</div>
                                {i < timelineItems.length - 1 && <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent my-1.5 min-h-[16px]" />}
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
                        <p className="text-sm text-gray-400 font-medium">Brak wpisów</p>
                        <Link href={`/pets/${pet.id}?tab=health`} className="mt-4 inline-flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-400 transition font-medium bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl">
                          + Dodaj szczepienie
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── KONTAKTY ── */}
            {tab === 'contacts' && (
              <div className="space-y-5 max-w-2xl">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                  <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#242424]">
                    <div className="w-1 h-5 bg-blue-500 rounded-full shrink-0" />
                    <h3 className="font-bold text-white text-base flex-1">Kontakty</h3>
                    <Link href="/contacts" className="text-xs text-orange-500 hover:text-orange-400 transition font-medium">Zarządzaj →</Link>
                  </div>
                  {userContacts.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-3xl mb-2">👥</p>
                      <p className="text-sm text-gray-400 font-medium">Brak kontaktów</p>
                      <Link href="/contacts" className="mt-3 inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 transition">
                        Dodaj kontakt →
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#222]">
                      {userContacts.map(contact => (
                        <div key={contact.id} className="flex items-center gap-3 px-5 py-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl shrink-0">
                            {contact.type === 'vet' ? '🏥' : contact.type === 'emergency' ? '🚨' : contact.type === 'owner' ? '👤' : contact.type === 'shelter' ? '🏠' : '📋'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-200 text-sm">{contact.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{contact.phone ?? contact.email ?? ''}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {contact.phone && <a href={`tel:${contact.phone}`} className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition text-sm">📞</a>}
                            {contact.email && <a href={`mailto:${contact.email}`} className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition text-sm">✉️</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── MODULE STRIP ── */}
          <div className="px-6 sm:px-10 pb-20 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#242424]" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest shrink-0">Ekosystem FindMyPet</p>
              <div className="flex-1 h-px bg-[#242424]" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { href: '/radar', icon: '📡', label: 'PetRadar', sub: 'Mapa zgłoszeń', color: 'bg-orange-500/15 border-orange-500/20' },
                { href: `/pets/${pet.id}`, icon: SPECIES_EMOJI[pet.species], label: petName, sub: 'Pełny profil', color: 'bg-orange-500/15 border-orange-500/20' },
                { href: '/profile', icon: '🐾', label: 'PetBook', sub: 'Moje zwierzaki', color: 'bg-purple-500/15 border-purple-500/20' },
                { href: '/contacts', icon: '👥', label: 'Kontakty', sub: 'Weterynarze i pomoc', color: 'bg-blue-500/15 border-blue-500/20' },
                { href: '/chat', icon: '💬', label: 'Wiadomości', sub: 'Czat z właścicielami', color: 'bg-green-500/15 border-green-500/20' },
                { href: '/report/lost', icon: '🚨', label: 'Zgłoś zaginięcie', sub: 'Utwórz zgłoszenie', color: 'bg-red-500/15 border-red-500/20' },
                { href: '/report/found', icon: '🐾', label: 'Znaleziono pupila', sub: 'Zgłoś znalezisko', color: 'bg-teal-500/15 border-teal-500/20' },
                { href: `/pets/${pet.id}/edit`, icon: '✏️', label: 'Edytuj profil', sub: 'Zaktualizuj dane', color: 'bg-gray-500/15 border-gray-500/20' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group bg-[#1a1a1a] border border-[#2a2a2a] hover:border-orange-500/30 rounded-2xl p-4 flex flex-col gap-3 transition shadow-lg shadow-black/20 hover:shadow-orange-500/5"
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl ${item.color}`}>{item.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-orange-400 transition">{item.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{item.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: PetRadar sidebar */}
        <RadarSidebar radarPets={radarPets} radarActiveCount={radarActiveCount} />
      </div>
    </div>
  )
}

// ── Radar sidebar ─────────────────────────────────────────────

function RadarSidebar({ radarPets, radarActiveCount }: { radarPets: PetWithPhotos[]; radarActiveCount: number }) {
  return (
    <div
      className="hidden xl:flex flex-col w-80 shrink-0 border-l border-[#1a1a1a] sticky top-14 self-start overflow-y-auto"
      style={{ height: 'calc(100vh - 3.5rem)' }}
    >
      {/* Map */}
      <div className="h-56 shrink-0 overflow-hidden">
        <MapView defaultCenter={[52.2297, 21.0122]} defaultZoom={10} interactive={false} />
      </div>

      {/* Header */}
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
        {radarPets.length > 0 ? (
          <div className="divide-y divide-[#1e1e1e]">
            {radarPets.map(rp => (
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
  )
}

// ── Welcome: no pet ───────────────────────────────────────────

function WelcomeNoPet({ radarPets, radarActiveCount }: { radarPets: PetWithPhotos[]; radarActiveCount: number }) {
  return (
    <div className="bg-[#0e0e0e] min-h-screen">
      {/* Hero */}
      <div className="relative w-full overflow-hidden bg-[#0e0e0e]" style={{ height: 'min(60vh, 560px)', minHeight: '380px' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/30 via-[#0e0e0e] to-[#0e0e0e]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[18rem] opacity-5 select-none">🐾</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-10 z-10">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">FindMyPet — Ekosystem dla zwierząt</p>
            <h1 className="text-5xl sm:text-7xl font-black text-white leading-none tracking-tight mb-4">
              Twój pupil<br />czeka na profil
            </h1>
            <p className="text-gray-400 text-lg mb-6 max-w-lg">Stwórz pełny profil dla swojego zwierzaka. Historia zdrowia, dokumenty, kontakty — wszystko w jednym miejscu.</p>
            <Link href="/pets/new" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold text-base px-6 py-3 rounded-2xl transition shadow-xl shadow-orange-500/30">
              🐾 Dodaj pierwszego pupila
            </Link>
          </div>
        </div>
      </div>

      {/* Radar sidebar layout */}
      <div className="flex">
        <div className="flex-1 min-w-0 px-8 py-8">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-5">Co oferuje FindMyPet</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
            {[
              { icon: '🐾', label: 'Profil pupila', sub: 'Dane, zdjęcia, historia' },
              { icon: '📡', label: 'PetRadar', sub: 'Mapa zagubionych zwierząt' },
              { icon: '💉', label: 'Zdrowie', sub: 'Szczepienia i wizyty' },
              { icon: '📄', label: 'Dokumenty', sub: 'Dokumenty weterynaryjne' },
              { icon: '👥', label: 'Kontakty', sub: 'Weterynarze i pomoc' },
              { icon: '💬', label: 'Czat', sub: 'Komunikacja z właścicielami' },
            ].map((item, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
                <span className="text-2xl mb-2 block">{item.icon}</span>
                <p className="text-sm font-bold text-white">{item.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <RadarSidebar radarPets={radarPets} radarActiveCount={radarActiveCount} />
      </div>
    </div>
  )
}

// ── Public landing: not logged in ─────────────────────────────

function PublicLanding({ radarPets, radarActiveCount, vets }: { radarPets: PetWithPhotos[]; radarActiveCount: number; vets: VetProfile[] }) {
  return (
    <div className="bg-[#0e0e0e] min-h-screen">
      {/* Hero */}
      <div className="relative w-full overflow-hidden bg-[#0e0e0e]" style={{ height: 'min(70vh, 640px)', minHeight: '420px' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/40 via-[#0e0e0e]/60 to-[#0e0e0e]" />
        <div className="absolute inset-0 flex items-end justify-end opacity-10 pointer-events-none select-none overflow-hidden">
          <span className="text-[22rem]">🐾</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-8 sm:px-12 pb-10 z-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">{radarActiveCount} aktywnych zgłoszeń w Polsce</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-black text-white leading-[0.95] tracking-tight mb-5">
              Znajdź<br />swojego pupila
            </h1>
            <p className="text-gray-400 text-lg mb-7 max-w-xl leading-relaxed">
              Społecznościowa platforma dla zagubionych i znalezionych zwierząt. Stwórz profil, zgłoś zaginięcie, połącz się z innymi.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth/register" className="bg-orange-500 hover:bg-orange-400 text-white font-bold text-base px-6 py-3 rounded-2xl transition shadow-xl shadow-orange-500/30">
                Dołącz za darmo →
              </Link>
              <Link href="/auth/login" className="bg-white/8 hover:bg-white/15 border border-white/15 text-white font-semibold text-base px-6 py-3 rounded-2xl transition">
                Zaloguj się
              </Link>
              <Link href="/radar" className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-semibold text-base px-6 py-3 rounded-2xl transition">
                📡 Przeglądaj mapę
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex">
        <div className="flex-1 min-w-0 px-8 sm:px-12 py-10">

          {/* Feature cards */}
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-5">Ekosystem FindMyPet</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mb-10">
            {[
              { icon: '🐾', label: 'Profil pupila', sub: 'Pełna historia zdrowia, dokumenty, zdjęcia' },
              { icon: '📡', label: 'PetRadar', sub: 'Interaktywna mapa zaginięć w Polsce' },
              { icon: '💉', label: 'Zdrowie', sub: 'Szczepienia, wizyty, dokumenty wet.' },
              { icon: '👥', label: 'Kontakty', sub: 'Weterynarze, schroniska, wolontariusze' },
              { icon: '💬', label: 'Czat', sub: 'Bezpośredni kontakt z właścicielami' },
              { icon: '🔖', label: 'Chip & QR', sub: 'Profil powiązany z chipem i QR kodem' },
            ].map((item, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <p className="text-sm font-bold text-white">{item.label}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Recent public reports */}
          {radarPets.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-4">Ostatnie zgłoszenia</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
                {radarPets.map(rp => (
                  <Link key={rp.id} href={`/pets/${rp.id}`} className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-orange-500/30 rounded-2xl p-4 transition group">
                    <div className="w-14 h-14 rounded-xl bg-[#242424] border border-[#303030] overflow-hidden shrink-0">
                      {rp.primary_photo_url
                        ? <img src={rp.primary_photo_url} alt={rp.name ?? ''} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">{SPECIES_EMOJI[rp.species] ?? '🐾'}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rp.type === 'lost' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-green-500/15 text-green-400 border border-green-500/20'}`}>
                        {rp.type === 'lost' ? '● Zaginiony' : '● Znaleziony'}
                      </span>
                      <p className="text-sm font-bold text-white truncate mt-1 group-hover:text-orange-400 transition">{rp.name ?? 'Nieznane'}</p>
                      <p className="text-xs text-gray-600 truncate">{rp.last_seen_address ?? ''}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Radar sidebar */}
        <RadarSidebar radarPets={radarPets} radarActiveCount={radarActiveCount} />
      </div>
    </div>
  )
}
