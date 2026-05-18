'use client'

import { useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps'
import type { PetWithPhotos } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
  rabbit: '🐇',
  other: '🐾',
}

interface Props {
  pets: PetWithPhotos[]
  defaultCenter?: { lat: number; lng: number }
  defaultZoom?: number
  interactive?: boolean
}

export default function MapView({
  pets,
  defaultCenter = { lat: 52.2297, lng: 21.0122 },
  defaultZoom = 12,
  interactive = true,
}: Props) {
  const [selectedPet, setSelectedPet] = useState<PetWithPhotos | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey || apiKey === 'your-google-maps-api-key') {
    return (
      <div className="w-full flex-1 min-h-[400px] bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-1">Mapa niedostępna</p>
          <p className="text-sm">Dodaj NEXT_PUBLIC_GOOGLE_MAPS_API_KEY do .env.local</p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-sm">
            {pets.map(pet => (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}`}
                className={`text-xs px-2 py-1 rounded-full text-white ${pet.type === 'lost' ? 'bg-red-500' : 'bg-green-500'}`}
              >
                {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        className="w-full flex-1 min-h-[400px]"
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        mapId="findmypet-map"
        gestureHandling={interactive ? 'greedy' : 'none'}
        disableDefaultUI={!interactive}
      >
        {pets.map(pet => (
          <AdvancedMarker
            key={pet.id}
            position={{ lat: pet.last_seen_lat, lng: pet.last_seen_lng }}
            onClick={() => setSelectedPet(pet)}
            title={pet.name ?? pet.species}
          >
            <Pin
              background={pet.type === 'lost' ? '#ef4444' : '#22c55e'}
              borderColor={pet.type === 'lost' ? '#b91c1c' : '#15803d'}
              glyphColor="#ffffff"
              glyph={SPECIES_EMOJI[pet.species]}
            />
          </AdvancedMarker>
        ))}

        {selectedPet && (
          <InfoWindow
            position={{ lat: selectedPet.last_seen_lat, lng: selectedPet.last_seen_lng }}
            onCloseClick={() => setSelectedPet(null)}
          >
            <div className="max-w-[200px]">
              {selectedPet.primary_photo_url && (
                <Image
                  src={selectedPet.primary_photo_url}
                  alt={selectedPet.name ?? selectedPet.species}
                  width={200}
                  height={128}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              <div
                className={`text-xs font-bold uppercase mb-1 ${
                  selectedPet.type === 'lost' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {selectedPet.type === 'lost' ? '🔴 Zaginął' : '🟢 Znaleziony'}
              </div>
              <p className="font-semibold text-sm text-gray-900">
                {SPECIES_EMOJI[selectedPet.species]}{' '}
                {selectedPet.name ?? selectedPet.species}
                {selectedPet.breed ? ` (${selectedPet.breed})` : ''}
              </p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {selectedPet.description}
              </p>
              <Link
                href={`/pets/${selectedPet.id}`}
                className="mt-2 block text-center text-xs bg-orange-500 text-white py-1.5 px-3 rounded font-medium hover:bg-orange-600 transition"
              >
                Zobacz szczegóły →
              </Link>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}
