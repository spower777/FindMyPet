import Link from 'next/link'
import Image from 'next/image'
import type { PetWithPhotos } from '@/lib/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
  rabbit: '🐇',
  other: '🐾',
}

export default function PetCard({ pet }: { pet: PetWithPhotos }) {
  return (
    <Link href={`/pets/${pet.id}`} className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group">
      <div className="relative h-40 bg-gray-100">
        {pet.primary_photo_url ? (
          <Image
            src={pet.primary_photo_url}
            alt={pet.name ?? pet.species}
            fill
            className="object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}
        <div
          className={`absolute top-2 left-2 text-xs font-bold text-white px-2 py-0.5 rounded-full ${
            pet.type === 'lost' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {pet.type === 'lost' ? 'Zaginął' : 'Znaleziony'}
        </div>
      </div>
      <div className="p-3">
        <p className="font-semibold text-gray-900 text-sm">
          {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
          {pet.breed ? <span className="font-normal text-gray-500"> · {pet.breed}</span> : null}
        </p>
        {pet.last_seen_address && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{pet.last_seen_address}</p>
        )}
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{pet.description}</p>
        <p className="text-xs text-gray-400 mt-2">
          {new Date(pet.created_at).toLocaleDateString('pl-PL')}
        </p>
      </div>
    </Link>
  )
}
