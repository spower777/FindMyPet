'use client'

import { divIcon } from 'leaflet'
import Link from 'next/link'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { PetWithPhotos } from '@/lib/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
  rabbit: '🐇',
  other: '🐾',
}

interface Props {
  pets: PetWithPhotos[]
  defaultCenter?: [number, number]
  defaultZoom?: number
  interactive?: boolean
}

function makeIcon(type: 'lost' | 'found') {
  const color = type === 'lost' ? '#ef4444' : '#22c55e'
  const border = type === 'lost' ? '#b91c1c' : '#15803d'

  return divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid ${border};box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -22],
  })
}

export default function LeafletMap({
  pets,
  defaultCenter = [52.2297, 21.0122],
  defaultZoom = 12,
  interactive = true,
}: Props) {
  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full flex-1 min-h-[400px] z-0"
      style={{ height: '100%' }}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pets.map(pet => (
        <Marker
          key={pet.id}
          position={[pet.last_seen_lat, pet.last_seen_lng]}
          icon={makeIcon(pet.type)}
        >
          <Popup maxWidth={220}>
            <div className="min-w-[180px]">
              {pet.primary_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.primary_photo_url}
                  alt={pet.name ?? pet.species}
                  className="w-full h-28 object-cover rounded mb-2"
                />
              )}
              <div className={`text-xs font-bold uppercase mb-1 ${pet.type === 'lost' ? 'text-red-600' : 'text-green-600'}`}>
                {pet.type === 'lost' ? '🔴 Zaginął' : '🟢 Znaleziony'}
              </div>
              <p className="font-semibold text-sm text-gray-900">
                {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
                {pet.breed ? ` (${pet.breed})` : ''}
              </p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{pet.description}</p>
              <Link
                href={`/pets/${pet.id}`}
                className="mt-2 block text-center text-xs bg-orange-500 text-white py-1.5 px-3 rounded font-medium hover:bg-orange-600 transition"
              >
                Zobacz szczegóły →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
