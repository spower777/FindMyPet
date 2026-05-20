'use client'

import { useState, useTransition } from 'react'
import { updateContact, deleteContact } from '@/app/actions/contacts'
import { useTranslations } from 'next-intl'
import type { UserContact, ContactType, AnimalType, PetSummary } from '@/lib/types'

const CONTACT_TYPE_EMOJIS: Record<ContactType, string> = {
  owner: '👤', vet: '🏥', shelter: '🏠', emergency: '🚨', volunteer: '🙋', other: '📋',
}
const ANIMAL_TYPE_EMOJIS: Record<AnimalType, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾',
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

interface Props {
  contact: UserContact
  pets: PetSummary[]
  onClose: () => void
}

export default function EditContactForm({ contact, pets, onClose }: Props) {
  const t = useTranslations('contacts_page')
  const tc = useTranslations('contact_types')
  const ta = useTranslations('animal_types')
  const tf = useTranslations('form')

  const [animalType, setAnimalType] = useState<AnimalType | ''>(contact.animal_type ?? '')
  const [petId, setPetId] = useState<string>(contact.pet_id ?? '')
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const contactTypes: ContactType[] = ['owner', 'vet', 'shelter', 'emergency', 'volunteer', 'other']
  const animalTypes: AnimalType[] = ['dog', 'cat', 'bird', 'rabbit', 'exotic', 'other']

  const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()
    if (!name) return

    startTransition(async () => {
      try {
        await updateContact(contact.id, {
          type: fd.get('type') as ContactType,
          animal_type: (animalType || null) as AnimalType | null,
          name,
          phone: fd.get('phone') as string,
          email: fd.get('email') as string,
          note: fd.get('note') as string,
          pet_id: petId || null,
        })
        onClose()
      } catch {
        setError('Błąd zapisu')
      }
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteContact(contact.id)
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
      <select name="type" defaultValue={contact.type} className={inputCls}>
        {contactTypes.map(type => (
          <option key={type} value={type}>
            {CONTACT_TYPE_EMOJIS[type]} {tc(type as ContactType)}
          </option>
        ))}
      </select>

      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setAnimalType('')}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
            animalType === ''
              ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
          }`}
        >
          🐾 —
        </button>
        {animalTypes.map(at => (
          <button
            key={at}
            type="button"
            onClick={() => setAnimalType(at)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              animalType === at
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            {ANIMAL_TYPE_EMOJIS[at]} {ta(at)}
          </button>
        ))}
      </div>

      {/* Pet association */}
      {pets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setPetId('')}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              petId === ''
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            🐾 —
          </button>
          {pets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPetId(p.id)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                petId === p.id
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {SPECIES_EMOJI[p.species]} {p.name ?? p.species}
            </button>
          ))}
        </div>
      )}

      <input name="name" defaultValue={contact.name} required placeholder={tf('name_placeholder')} className={inputCls} />
      <input name="phone" type="tel" defaultValue={contact.phone ?? ''} placeholder={tf('phone_placeholder')} className={inputCls} />
      <input name="email" type="email" defaultValue={contact.email ?? ''} placeholder={tf('email_placeholder')} className={inputCls} />
      <textarea name="note" defaultValue={contact.note ?? ''} placeholder={tf('note_placeholder')} rows={2} className={`${inputCls} resize-none`} />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition">
          {isPending ? '…' : t('save_changes')}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition disabled:opacity-50"
        >
          {isDeleting ? '…' : '🗑️'}
        </button>
      </div>
    </form>
  )
}
