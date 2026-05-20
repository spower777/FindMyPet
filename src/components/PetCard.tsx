'use client'

import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { PetWithPhotos } from '@/lib/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

function timeAgo(dateStr: string, t: ReturnType<typeof useTranslations<'pet'>>): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('just_now')
  if (m < 60) return t('min_ago', { n: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('hours_ago', { n: h })
  const d = Math.floor(h / 24)
  if (d < 7) return t('days_ago', { n: d })
  return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function PetCard({ pet }: { pet: PetWithPhotos }) {
  const t = useTranslations('pet')

  return (
    <Link
      href={`/pets/${pet.id}`}
      className="group block bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-xl hover:shadow-orange-50 dark:hover:shadow-orange-950/20 transition-all duration-200"
    >
      <div className="relative h-48 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {pet.primary_photo_url ? (
          <Image
            src={pet.primary_photo_url}
            alt={pet.name ?? pet.species}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-gray-200 dark:text-gray-700">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}
        <span className={`absolute top-3 left-3 text-xs font-bold text-white px-3 py-1 rounded-full shadow-md ${
          pet.type === 'lost' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {pet.type === 'lost' ? `🔴 ${t('lost')}` : `🟢 ${t('found')}`}
        </span>
        <span className="absolute bottom-3 right-3 text-xs text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {timeAgo(pet.created_at, t)}
        </span>
      </div>

      <div className="p-4">
        <p className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug">
          {SPECIES_EMOJI[pet.species]}{' '}
          {pet.name ?? pet.species}
          {pet.breed ? <span className="font-normal text-gray-400 dark:text-gray-500 text-sm"> · {pet.breed}</span> : null}
        </p>
        {pet.last_seen_address && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1 flex items-center gap-1">
            <span>📍</span>{pet.last_seen_address.split(',')[0]}
          </p>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">{pet.description}</p>
      </div>
    </Link>
  )
}
