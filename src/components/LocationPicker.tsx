'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { reverseGeocode, forwardGeocode } from '@/lib/geocoding'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number, address: string) => void
}

const LeafletLocationPicker = dynamic(() => import('@/components/LeafletLocationPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-52 rounded-xl border border-gray-200 bg-gray-100" />,
})

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const [gpsLoading, setGpsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)

  async function useMyLocation() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        const address = await reverseGeocode(latitude, longitude)
        onChange(latitude, longitude, address)
        setSearchQuery(address.split(',').slice(0, 2).join(','))
        setGpsLoading(false)
      },
      () => setGpsLoading(false)
    )
  }

  async function searchAddress() {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchError(false)
    const result = await forwardGeocode(searchQuery)
    if (result) {
      onChange(result.lat, result.lng, result.address)
      setSearchQuery(result.address.split(',').slice(0, 2).join(','))
    } else {
      setSearchError(true)
    }
    setSearchLoading(false)
  }

  return (
    <div className="space-y-2">
      {/* Address search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSearchError(false) }}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
          placeholder="Wpisz adres lub miejscowość..."
          className={`flex-1 input-field text-sm ${searchError ? 'border-red-300 dark:border-red-700' : ''}`}
        />
        <button
          type="button"
          onClick={searchAddress}
          disabled={searchLoading || !searchQuery.trim()}
          className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 hover:bg-orange-100 dark:hover:bg-orange-950 hover:text-orange-600 transition disabled:opacity-40 shrink-0"
        >
          {searchLoading ? '⏳' : '🔍'}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={gpsLoading}
          className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-950 hover:text-blue-600 transition disabled:opacity-40 shrink-0"
          title="Użyj GPS"
        >
          {gpsLoading ? '⏳' : '📍'}
        </button>
      </div>
      {searchError && <p className="text-xs text-red-500">Nie znaleziono adresu — spróbuj inaczej</p>}
      <LeafletLocationPicker lat={lat} lng={lng} onChange={(newLat, newLng, newAddress) => {
        onChange(newLat, newLng, newAddress)
        setSearchQuery(newAddress.split(',').slice(0, 2).join(','))
      }} />
    </div>
  )
}
