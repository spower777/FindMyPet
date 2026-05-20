import Link from 'next/link'
import Image from 'next/image'
import type { PetWithPhotos } from '@/lib/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return m <= 1 ? 'przed chwilą' : `${m} min temu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} godz. temu`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} dni temu`
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export default function PetCard({ pet }: { pet: PetWithPhotos }) {
  return (
    <Link
      href={`/pets/${pet.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-orange-200 hover:shadow-lg hover:shadow-orange-50 transition-all duration-200"
    >
      {/* Photo */}
      <div className="relative h-40 bg-gray-50 overflow-hidden">
        {pet.primary_photo_url ? (
          <Image
            src={pet.primary_photo_url}
            alt={pet.name ?? pet.species}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}
        {/* Badge */}
        <span className={`absolute top-2 left-2 text-xs font-bold text-white px-2.5 py-1 rounded-full shadow-sm ${
          pet.type === 'lost' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {pet.type === 'lost' ? '🔴 Zaginął' : '🟢 Znaleziony'}
        </span>
        {/* Time */}
        <span className="absolute bottom-2 right-2 text-xs text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
          {timeAgo(pet.created_at)}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="font-semibold text-gray-900 text-sm leading-snug">
          {SPECIES_EMOJI[pet.species]}{' '}
          {pet.name ?? pet.species}
          {pet.breed ? <span className="font-normal text-gray-400"> · {pet.breed}</span> : null}
        </p>
        {pet.last_seen_address && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 flex items-center gap-1">
            <span>📍</span>{pet.last_seen_address.split(',')[0]}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{pet.description}</p>
      </div>
    </Link>
  )
}
