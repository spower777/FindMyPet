'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useCallback } from 'react'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number, address: string) => void
}

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  useEffect(() => setMounted(true), [])

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
      {mounted && (
        <LeafletPicker lat={lat} lng={lng} onChange={onChange} />
      )}
      {lat && lng && (
        <p className="text-xs text-gray-400">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
      )}
    </div>
  )
}

function LeafletPicker({ lat, lng, onChange }: Props) {
  const { MapContainer, TileLayer, Marker, useMapEvents } = require('react-leaflet')
  const L = require('leaflet')

  const icon = L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#f97316;border:3px solid #c2410c;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })

  function ClickHandler() {
    useMapEvents({
      async click(e: { latlng: { lat: number; lng: number } }) {
        const address = await reverseGeocode(e.latlng.lat, e.latlng.lng)
        onChange(e.latlng.lat, e.latlng.lng, address)
      },
    })
    return null
  }

  const center: [number, number] = lat && lng ? [lat, lng] : [52.2297, 21.0122]

  return (
    <MapContainer
      center={center}
      zoom={lat ? 15 : 12}
      className="w-full h-52 rounded-xl border border-gray-200 z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler />
      {lat && lng && <Marker position={[lat, lng]} icon={icon} />}
    </MapContainer>
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
