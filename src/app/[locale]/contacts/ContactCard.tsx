'use client'

import { useState } from 'react'
import EditContactForm from './EditContactForm'
import { useTranslations } from 'next-intl'
import type { UserContact, ContactType, AnimalType, PetSummary } from '@/lib/types'

const CONTACT_TYPE_META: Record<string, { emoji: string; color: string; bg: string }> = {
  owner:     { emoji: '👤', color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-950' },
  vet:       { emoji: '🏥', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-950' },
  shelter:   { emoji: '🏠', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-950' },
  emergency: { emoji: '🚨', color: 'text-red-700 dark:text-red-300',     bg: 'bg-red-100 dark:bg-red-950' },
  volunteer: { emoji: '🙋', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-950' },
  other:     { emoji: '📋', color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800' },
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
  const [editing, setEditing] = useState(false)
  const t = useTranslations('contacts_page')
  const tc = useTranslations('contact_types')
  const ta = useTranslations('animal_types')
  const meta = CONTACT_TYPE_META[contact.type] ?? CONTACT_TYPE_META.other

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-start gap-3.5 p-4">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-2xl ${avatarColor(contact.name)} flex items-center justify-center shrink-0 text-white font-bold text-base shadow-sm`}>
          {initials(contact.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{contact.name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                  {meta.emoji} {tc(contact.type as ContactType)}
                </span>
                {contact.animal_type && (
                  <span className="text-[11px] bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900 px-2 py-0.5 rounded-full">
                    {ANIMAL_TYPE_EMOJIS[contact.animal_type]} {ta(contact.animal_type as AnimalType)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(e => !e)}
              className={`text-xs px-2.5 py-1.5 rounded-xl border transition shrink-0 ${
                editing
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-orange-300 hover:text-orange-500'
              }`}
            >
              ✏️
            </button>
          </div>

          {contact.note && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{contact.note}</p>
          )}

          {/* Linked pet */}
          {linkedPet && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[11px] bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                {SPECIES_EMOJI[linkedPet.species]} {linkedPet.name ?? linkedPet.species}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      {(contact.phone || contact.email) && (
        <div className={`flex border-t border-gray-100 dark:border-gray-800 divide-x divide-gray-100 dark:divide-gray-800`}>
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-950 hover:text-green-600 dark:hover:text-green-400 transition"
            >
              <span>📞</span>
              <span className="text-xs font-medium truncate max-w-[120px]">{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              <span>✉️</span>
              <span className="text-xs font-medium truncate max-w-[120px]">{contact.email}</span>
            </a>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          <EditContactForm contact={contact} pets={pets} onClose={() => setEditing(false)} />
        </div>
      )}
    </div>
  )
}
