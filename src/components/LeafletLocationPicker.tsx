'use client'

import { useEffect, useMemo } from 'react'
import { divIcon, type LeafletMouseEvent } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { reverseGeocode } from '@/lib/geocoding'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number, address: string) => void
}

function ClickHandler({ onChange }: { onChange: Props['onChange'] }) {
  useMapEvents({
    async click(e: LeafletMouseEvent) {
      const address = await reverseGeocode(e.latlng.lat, e.latlng.lng)
      onChange(e.latlng.lat, e.latlng.lng, address)
    },
  })

  return null
}

function MapCenterSync({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView([lat, lng], zoom)
  }, [lat, lng, map, zoom])

  return null
}

export default function LeafletLocationPicker({ lat, lng, onChange }: Props) {
  const hasLocation = lat !== null && lng !== null
  const center: [number, number] = hasLocation ? [lat, lng] : [52.2297, 21.0122]
  const zoom = hasLocation ? 15 : 12

  const icon = useMemo(
    () => divIcon({
      html: '<div style="width:20px;height:20px;border-radius:50%;background:#f97316;border:3px solid #c2410c;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>',
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),
    []
  )

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-52 rounded-xl border border-gray-200 z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onChange={onChange} />
      <MapCenterSync lat={center[0]} lng={center[1]} zoom={zoom} />
      {hasLocation && <Marker position={[lat, lng]} icon={icon} />}
    </MapContainer>
  )
}
