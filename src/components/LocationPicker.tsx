'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { reverseGeocode } from '@/lib/geocoding'

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
  const [loading, setLoading] = useState(false)

  async function useMyLocation() {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        const address = await reverseGeocode(latitude, longitude)
        onChange(latitude, longitude, address)
        setLoading(false)
      },
      () => setLoading(false)
    )
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={useMyLocation} disabled={loading} className="btn-secondary text-sm w-full">
        {loading ? 'Pobieranie lokalizacji...' : '📍 Użyj mojej lokalizacji GPS'}
      </button>
      <p className="text-xs text-gray-400">lub kliknij na mapie aby ustawić punkt</p>
      <LeafletLocationPicker lat={lat} lng={lng} onChange={onChange} />
      {lat !== null && lng !== null && (
        <p className="text-xs text-gray-400">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
      )}
    </div>
  )
}
