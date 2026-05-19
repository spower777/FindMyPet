'use client'

import { useState, useMemo } from 'react'
import MapView from '@/components/MapView'
import PetCard from '@/components/PetCard'
import Link from 'next/link'
import type { PetWithPhotos, PetType, PetSpecies } from '@/lib/types'

const SPECIES_OPTIONS: { value: PetSpecies | 'all'; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'dog', label: '🐕 Psy' },
  { value: 'cat', label: '🐈 Koty' },
  { value: 'bird', label: '🐦 Ptaki' },
  { value: 'rabbit', label: '🐇 Króliki' },
  { value: 'other', label: '🐾 Inne' },
]

const DATE_OPTIONS = [
  { value: 'all', label: 'Zawsze' },
  { value: 'today', label: 'Dziś' },
  { value: 'week', label: 'Tydzień' },
  { value: 'month', label: 'Miesiąc' },
]

interface Filters {
  type: PetType | 'all'
  species: PetSpecies | 'all'
  date: 'all' | 'today' | 'week' | 'month'
}

export default function HomeClient({ pets }: { pets: PetWithPhotos[] }) {
  const [filters, setFilters] = useState<Filters>({ type: 'all', species: 'all', date: 'all' })

  const filtered = useMemo(() => {
    const now = new Date()
    return pets.filter(pet => {
      if (filters.type !== 'all' && pet.type !== filters.type) return false
      if (filters.species !== 'all' && pet.species !== filters.species) return false
      if (filters.date !== 'all') {
        const created = new Date(pet.created_at)
        const diffMs = now.getTime() - created.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (filters.date === 'today' && diffDays > 1) return false
        if (filters.date === 'week' && diffDays > 7) return false
        if (filters.date === 'month' && diffDays > 30) return false
      }
      return true
    })
  }, [pets, filters])

  const lostCount = filtered.filter(p => p.type === 'lost').length
  const foundCount = filtered.filter(p => p.type === 'found').length
  const isFiltered = filters.type !== 'all' || filters.species !== 'all' || filters.date !== 'all'

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Map */}
      <div className="relative lg:flex-1 h-[50vh] lg:h-auto">
        <MapView pets={filtered} />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 lg:hidden">
          <Link href="/report/lost" className="bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg transition">
            🔴 Zaginął
          </Link>
          <Link href="/report/found" className="bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg transition">
            🟢 Znalazłem
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-96 flex flex-col bg-white border-l border-gray-100 lg:overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
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

          {/* Filters */}
          <div className="space-y-2">
            {/* Type */}
            <div className="flex gap-1.5">
              {(['all', 'lost', 'found'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => set('type', t)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition ${
                    filters.type === t
                      ? t === 'lost' ? 'bg-red-500 border-red-500 text-white'
                      : t === 'found' ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t === 'all' ? 'Wszystkie' : t === 'lost' ? '🔴 Zaginione' : '🟢 Znalezione'}
                </button>
              ))}
            </div>

            {/* Species + Date */}
            <div className="flex gap-2">
              <select
                value={filters.species}
                onChange={e => set('species', e.target.value as PetSpecies | 'all')}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-orange-400"
              >
                {SPECIES_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={filters.date}
                onChange={e => set('date', e.target.value as Filters['date'])}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-orange-400"
              >
                {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {isFiltered && (
                <button
                  onClick={() => setFilters({ type: 'all', species: 'all', date: 'all' })}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 border border-gray-200 rounded-lg transition"
                  title="Wyczyść filtry"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="hidden lg:flex gap-2">
            <Link href="/report/lost" className="flex-1 text-center bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-2.5 rounded-xl transition">
              🔴 Zgłoś zagubione
            </Link>
            <Link href="/report/found" className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white font-semibold text-sm py-2.5 rounded-xl transition">
              🟢 Zgłoś znalezione
            </Link>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">Brak wyników dla tych filtrów</p>
              {isFiltered && (
                <button onClick={() => setFilters({ type: 'all', species: 'all', date: 'all' })} className="mt-2 text-xs text-orange-500 hover:underline">
                  Wyczyść filtry
                </button>
              )}
            </div>
          ) : (
            filtered.map(pet => <PetCard key={pet.id} pet={pet} />)
          )}
        </div>
      </div>
    </div>
  )
}
