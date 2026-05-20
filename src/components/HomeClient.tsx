'use client'

import { useState, useMemo } from 'react'
import MapView from '@/components/MapView'
import PetCard from '@/components/PetCard'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { PetWithPhotos, PetType, PetSpecies, VetProfile, UserContact } from '@/lib/types'

type MapLayer = 'all' | 'reports' | 'vets' | 'contacts'

interface Filters {
  type: PetType | 'all'
  species: PetSpecies | 'all'
  date: 'all' | 'today' | 'week' | 'month'
}

interface Props {
  pets: PetWithPhotos[]
  vets?: VetProfile[]
  contacts?: UserContact[]
}

export default function HomeClient({ pets, vets = [], contacts = [] }: Props) {
  const t = useTranslations('home')
  const tf = useTranslations('filters')
  const [filters, setFilters] = useState<Filters>({ type: 'all', species: 'all', date: 'all' })
  const [layer, setLayer] = useState<MapLayer>('all')

  const SPECIES_OPTIONS: { value: PetSpecies | 'all'; label: string }[] = [
    { value: 'all', label: tf('all_species') },
    { value: 'dog', label: `🐕 ${tf('dogs')}` },
    { value: 'cat', label: `🐈 ${tf('cats')}` },
    { value: 'bird', label: `🐦 ${tf('birds')}` },
    { value: 'rabbit', label: `🐇 ${tf('rabbits')}` },
    { value: 'other', label: `🐾 ${tf('other')}` },
  ]

  const DATE_OPTIONS = [
    { value: 'all', label: tf('all_time') },
    { value: 'today', label: tf('today') },
    { value: 'week', label: tf('week') },
    { value: 'month', label: tf('month') },
  ]

  const LAYER_OPTIONS: { value: MapLayer; label: string; emoji: string }[] = [
    { value: 'all',      label: t('layer_all'),      emoji: '🗺️' },
    { value: 'reports',  label: t('layer_reports'),  emoji: '🐾' },
    { value: 'vets',     label: t('layer_vets'),     emoji: '🏥' },
    { value: 'contacts', label: t('layer_contacts'), emoji: '👥' },
  ]

  const filtered = useMemo(() => {
    const now = new Date()
    return pets.filter(pet => {
      if (filters.type !== 'all' && pet.type !== filters.type) return false
      if (filters.species !== 'all' && pet.species !== filters.species) return false
      if (filters.date !== 'all') {
        const created = new Date(pet.created_at)
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        if (filters.date === 'today' && diffDays > 1) return false
        if (filters.date === 'week' && diffDays > 7) return false
        if (filters.date === 'month' && diffDays > 30) return false
      }
      return true
    })
  }, [pets, filters])

  const mapPets     = layer === 'contacts' || layer === 'vets' ? [] : filtered
  const mapVets     = layer === 'reports' || layer === 'contacts' ? [] : vets
  const mapContacts = layer === 'reports' || layer === 'vets' ? [] : contacts

  const lostCount  = filtered.filter(p => p.type === 'lost').length
  const foundCount = filtered.filter(p => p.type === 'found').length
  const isFiltered = filters.type !== 'all' || filters.species !== 'all' || filters.date !== 'all'

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Map */}
      <div className="relative lg:flex-1 h-[50vh] lg:h-auto">
        <MapView pets={mapPets} vets={mapVets} contacts={mapContacts} />

        {/* Layer toggle */}
        <div className="absolute top-3 left-3 z-10 flex gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl p-1 shadow-md border border-gray-100 dark:border-gray-800">
          {LAYER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setLayer(opt.value)}
              title={opt.label}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                layer === opt.value
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{opt.emoji}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 lg:hidden">
          <Link href="/report/lost" className="bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg transition">
            🔴 {t('lost_filter')}
          </Link>
          <Link href="/report/found" className="bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg transition">
            🟢 {t('found_filter')}
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 lg:overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('active')}</h2>
            <div className="flex gap-2 text-xs">
              <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                {t('lost_count', { n: lostCount })}
              </span>
              <span className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                {t('found_count', { n: foundCount })}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {(['all', 'lost', 'found'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => set('type', type)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-xl border transition ${
                    filters.type === type
                      ? type === 'lost' ? 'bg-red-500 border-red-500 text-white'
                      : type === 'found' ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {type === 'all' ? t('all') : type === 'lost' ? `🔴 ${t('lost_filter')}` : `🟢 ${t('found_filter')}`}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <select
                value={filters.species}
                onChange={e => set('species', e.target.value as PetSpecies | 'all')}
                className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-orange-400"
              >
                {SPECIES_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={filters.date}
                onChange={e => set('date', e.target.value as Filters['date'])}
                className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-orange-400"
              >
                {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {isFiltered && (
                <button
                  onClick={() => setFilters({ type: 'all', species: 'all', date: 'all' })}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 border border-gray-200 dark:border-gray-700 rounded-xl transition"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="hidden lg:flex gap-2">
            <Link href="/report/lost" className="flex-1 text-center bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-2.5 rounded-xl transition">
              🔴 {t('report_lost')}
            </Link>
            <Link href="/report/found" className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white font-semibold text-sm py-2.5 rounded-xl transition">
              🟢 {t('report_found')}
            </Link>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">{t('no_results')}</p>
              {isFiltered && (
                <button onClick={() => setFilters({ type: 'all', species: 'all', date: 'all' })} className="mt-2 text-xs text-orange-500 hover:underline">
                  {t('clear_filters')}
                </button>
              )}
            </div>
          ) : (
            filtered.map((pet, i) => (
              <div key={pet.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <PetCard pet={pet} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
