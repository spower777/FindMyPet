'use client'

import { useState } from 'react'
import EditContactForm from './EditContactForm'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { UserContact, ContactType, AnimalType } from '@/lib/types'

const CONTACT_TYPE_META: Record<string, { emoji: string; color: string }> = {
  owner:     { emoji: '👤', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  vet:       { emoji: '🏥', color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' },
  shelter:   { emoji: '🏠', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
  emergency: { emoji: '🚨', color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' },
  volunteer: { emoji: '🙋', color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' },
  other:     { emoji: '📋', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
}

const ANIMAL_TYPE_EMOJIS: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾',
}

export default function ContactCard({ contact, chatConversationId }: { contact: UserContact; chatConversationId?: string }) {
  const [editing, setEditing] = useState(false)
  const t = useTranslations('contacts_page')
  const tc = useTranslations('contact_types')
  const ta = useTranslations('animal_types')
  const meta = CONTACT_TYPE_META[contact.type] ?? CONTACT_TYPE_META.other

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
              {meta.emoji} {tc(contact.type as ContactType)}
            </span>
            {contact.animal_type && (
              <span className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded-full">
                {ANIMAL_TYPE_EMOJIS[contact.animal_type]} {ta(contact.animal_type as AnimalType)}
              </span>
            )}
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{contact.name}</p>
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="text-sm text-orange-500 hover:underline block mt-0.5">
              📞 {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="text-sm text-orange-500 hover:underline block mt-0.5">
              ✉️ {contact.email}
            </a>
          )}
          {contact.note && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{contact.note}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {chatConversationId && (
            <Link
              href={`/chat/${chatConversationId}`}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-orange-300 hover:text-orange-500 transition"
              title={t('message')}
            >
              💬
            </Link>
          )}
          <button
            onClick={() => setEditing(e => !e)}
            className={`text-xs px-2.5 py-1.5 rounded-xl border transition ${
              editing
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-orange-300 hover:text-orange-500'
            }`}
          >
            ✏️
          </button>
        </div>
      </div>

      {editing && (
        <EditContactForm contact={contact} onClose={() => setEditing(false)} />
      )}
    </div>
  )
}
