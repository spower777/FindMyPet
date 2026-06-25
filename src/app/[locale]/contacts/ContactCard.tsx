'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import EditContactForm from './EditContactForm'
import { useTranslations } from 'next-intl'
import type { UserContact, ContactType, AnimalType, PetSummary } from '@/lib/types'

const CONTACT_TYPE_META: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  owner:     { emoji: '👤', color: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-50 dark:bg-blue-950',     border: 'border-blue-100 dark:border-blue-900' },
  vet:       { emoji: '🏥', color: 'text-green-700 dark:text-green-300',   bg: 'bg-green-50 dark:bg-green-950',   border: 'border-green-100 dark:border-green-900' },
  shelter:   { emoji: '🏠', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950', border: 'border-purple-100 dark:border-purple-900' },
  emergency: { emoji: '🚨', color: 'text-red-700 dark:text-red-300',       bg: 'bg-red-50 dark:bg-red-950',       border: 'border-red-100 dark:border-red-900' },
  volunteer: { emoji: '🙋', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-100 dark:border-yellow-900' },
  other:     { emoji: '📋', color: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-50 dark:bg-gray-900',     border: 'border-gray-100 dark:border-gray-800' },
}

const ANIMAL_TYPE_EMOJIS: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾',
}
const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

const AVATAR_COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-green-500',
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

interface Props {
  contact: UserContact
  pets: PetSummary[]
  linkedPet: PetSummary | null
}

export default function ContactCard({ contact, pets, linkedPet }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const t = useTranslations('contacts_page')
  const tc = useTranslations('contact_types')
  const meta = CONTACT_TYPE_META[contact.type] ?? CONTACT_TYPE_META.other

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden transition-all ${
      expanded ? 'border-orange-200 dark:border-orange-800 shadow-orange-50 dark:shadow-orange-950' : 'border-gray-100 dark:border-gray-800'
    }`}>

      {/* Pet photo banner — shown if linked pet has a photo */}
      {linkedPet?.primary_photo_url && !editing && (
        <div className="relative h-24 w-full overflow-hidden">
          <Image
            src={linkedPet.primary_photo_url}
            alt={linkedPet.name ?? linkedPet.species}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <p className="absolute bottom-2 left-3 text-white text-xs font-medium">
            {SPECIES_EMOJI[linkedPet.species]} {linkedPet.name ?? linkedPet.species}
            {linkedPet.breed ? ` · ${linkedPet.breed}` : ''}
          </p>
        </div>
      )}

      {/* Main row — clickable to expand */}
      <button
        type="button"
        onClick={() => { setExpanded(e => !e); setEditing(false) }}
        className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
      >
        {/* Avatar with animal badge */}
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-2xl ${avatarColor(contact.name)} flex items-center justify-center text-white font-bold text-base shadow-sm`}>
            {initials(contact.name)}
          </div>
          {contact.animal_type && (
            <span className="absolute -bottom-1 -right-1 text-sm leading-none bg-white dark:bg-gray-900 rounded-full p-0.5 shadow-sm">
              {ANIMAL_TYPE_EMOJIS[contact.animal_type]}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">{contact.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
              {meta.emoji} {tc(contact.type as ContactType)}
            </span>
            {!linkedPet?.primary_photo_url && linkedPet && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {SPECIES_EMOJI[linkedPet.species]} {linkedPet.name ?? linkedPet.species}
              </span>
            )}
          </div>
        </div>

        <span className={`text-gray-300 dark:text-gray-600 transition-transform duration-200 text-sm shrink-0 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded detail view */}
      {expanded && !editing && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Details */}
          <div className="px-4 py-3 space-y-2">
            {contact.note && (
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{contact.note}</p>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base">📞</span>
                <a href={`tel:${contact.phone}`} className="text-gray-700 dark:text-gray-300 hover:text-orange-500 transition font-medium">{contact.phone}</a>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base">✉️</span>
                <a href={`mailto:${contact.email}`} className="text-gray-700 dark:text-gray-300 hover:text-orange-500 transition font-medium truncate">{contact.email}</a>
              </div>
            )}
            {linkedPet && !linkedPet.primary_photo_url && linkedPet.breed && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {SPECIES_EMOJI[linkedPet.species]} {linkedPet.name} · {linkedPet.breed}
              </p>
            )}
          </div>

          {/* Action bar */}
          <div className="flex border-t border-gray-100 dark:border-gray-800 divide-x divide-gray-100 dark:divide-gray-800">
            {contact.phone && (
              <a href={`tel:${contact.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-950 hover:text-green-600 dark:hover:text-green-400 transition font-medium">
                📞 <span className="text-xs">Zadzwoń</span>
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">
                ✉️ <span className="text-xs">Email</span>
              </a>
            )}
            <Link href="/chat"
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-gray-400 dark:text-gray-500 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-500 transition font-medium">
              💬 <span className="text-xs">Wiadomość</span>
            </Link>
            <button onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-gray-400 dark:text-gray-500 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-500 transition font-medium">
              ✏️ <span className="text-xs">{t('edit')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          <EditContactForm contact={contact} pets={pets} onClose={() => { setEditing(false); setExpanded(false) }} />
        </div>
      )}
    </div>
  )
}
