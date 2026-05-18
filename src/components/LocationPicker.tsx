'use client'

import { useCallback, useState } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number, address: string) => void
}

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const handleMapClick = useCallback(
    async (event: { detail: { latLng: { lat: number; lng: number } | null } }) => {
      if (!event.detail.latLng) return
      const { lat: clickLat, lng: clickLng } = event.detail.latLng
      const address = await reverseGeocode(clickLat, clickLng)
      onChange(clickLat, clickLng, address)
    },
    [onChange]
  )

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

  if (!apiKey || apiKey === 'your-google-maps-api-key') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Latitude"
            value={lat ?? ''}
            onChange={e => onChange(Number(e.target.value), lng ?? 0, '')}
            className="input-field"
            step="any"
          />
          <input
            type="number"
            placeholder="Longitude"
            value={lng ?? ''}
            onChange={e => onChange(lat ?? 0, Number(e.target.value), '')}
            className="input-field"
            step="any"
          />
        </div>
        <button type="button" onClick={useMyLocation} disabled={loading} className="btn-secondary text-sm w-full">
          {loading ? 'Pobieranie...' : 'Użyj mojej lokalizacji'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={useMyLocation} disabled={loading} className="btn-secondary text-sm w-full">
        {loading ? 'Pobieranie lokalizacji...' : 'Użyj mojej lokalizacji GPS'}
      </button>
      <p className="text-xs text-gray-500">lub kliknij na mapie aby ustawić punkt</p>
      <APIProvider apiKey={apiKey}>
        <Map
          className="w-full h-56 rounded-xl border border-gray-200"
          defaultCenter={{ lat: lat ?? 52.2297, lng: lng ?? 21.0122 }}
          defaultZoom={lat ? 15 : 12}
          mapId="findmypet-picker"
          gestureHandling="greedy"
          onClick={handleMapClick}
        >
          {lat && lng && (
            <AdvancedMarker position={{ lat, lng }} />
          )}
        </Map>
      </APIProvider>
      {lat && lng && (
        <p className="text-xs text-gray-500">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  )
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    )
    const data = await res.json()
    return data.display_name ?? ''
  } catch {
    return ''
  }
}
