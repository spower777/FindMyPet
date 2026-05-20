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
  const isLost = pet.type === 'lost'

  return (
    <Link
      href={`/pets/${pet.id}`}
      className={`group block rounded-3xl border overflow-hidden transition-all duration-200 active:scale-[0.99] ${
        isLost
          ? 'bg-white dark:bg-gray-900 border-red-100 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-700 hover:shadow-lg hover:shadow-red-100/50 dark:hover:shadow-red-950/30'
          : 'bg-white dark:bg-gray-900 border-green-100 dark:border-green-900/50 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg hover:shadow-green-100/50 dark:hover:shadow-green-950/30'
      }`}
    >
      {/* Photo */}
      <div className="relative h-44 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {pet.primary_photo_url ? (
          <Image
            src={pet.primary_photo_url}
            alt={pet.name ?? pet.species}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200 dark:text-gray-700">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}

        {/* Status badge */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-full shadow-md ${
          isLost ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {isLost
            ? <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
            : <span className="text-[10px] leading-none">✓</span>
          }
          {isLost ? t('lost') : t('found')}
        </div>

        {/* Time */}
        <span className="absolute bottom-3 right-3 text-[11px] text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {timeAgo(pet.created_at, t)}
        </span>
      </div>

      {/* Content */}
      <div className={`p-4 border-t ${
        isLost ? 'border-red-50 dark:border-red-950/40' : 'border-green-50 dark:border-green-950/40'
      }`}>
        <p className="font-bold text-gray-900 dark:text-gray-100 text-[15px] leading-snug">
          {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
        </p>
        {pet.breed && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{pet.breed}</p>
        )}
        {pet.last_seen_address && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-1 flex items-center gap-1">
            <span>📍</span>{pet.last_seen_address.split(',')[0]}
          </p>
        )}
        {pet.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
            {pet.description}
          </p>
        )}
      </div>
    </Link>
  )
}
