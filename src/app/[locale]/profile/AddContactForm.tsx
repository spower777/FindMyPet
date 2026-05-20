'use client'

import { useState, useTransition } from 'react'
import { createContact } from '@/app/actions/contacts'
import { useTranslations } from 'next-intl'
import type { ContactType, AnimalType, PetSummary } from '@/lib/types'

const CONTACT_TYPE_EMOJIS: Record<ContactType, string> = {
  owner: '👤', vet: '🏥', shelter: '🏠', emergency: '🚨', volunteer: '🙋', other: '📋',
}
const ANIMAL_TYPE_EMOJIS: Record<AnimalType, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾',
}
const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

export default function AddContactForm({ pets = [] }: { pets?: PetSummary[] }) {
  const t = useTranslations('profile')
  const tc = useTranslations('contact_types')
  const ta = useTranslations('animal_types')
  const tf = useTranslations('form')
  const tcp = useTranslations('contacts_page')
  // tf used for input placeholders
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [animalType, setAnimalType] = useState<AnimalType | ''>('')
  const [petId, setPetId] = useState('')

  const contactTypes: ContactType[] = ['owner', 'vet', 'shelter', 'emergency', 'volunteer', 'other']
  const animalTypes: AnimalType[] = ['dog', 'cat', 'bird', 'rabbit', 'exotic', 'other']

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()
    if (!name) { setError(t('name_required')); return }

    startTransition(async () => {
      try {
        await createContact({
          type: fd.get('type') as ContactType,
          animal_type: (animalType || null) as AnimalType | null,
          name,
          phone: fd.get('phone') as string,
          email: fd.get('email') as string,
          note: fd.get('note') as string,
          pet_id: petId || null,
        })
        setOpen(false)
        setAnimalType('')
        setPetId('')
        ;(e.target as HTMLFormElement).reset()
      } catch {
        setError(t('contact_error'))
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-3 text-sm text-gray-400 hover:border-orange-300 hover:text-orange-400 transition"
      >
        {t('add_contact')}
      </button>
    )
  }

  const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-orange-200 dark:border-orange-900 shadow-sm p-4 space-y-3">
      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('new_contact')}</p>

      <select name="type" defaultValue="other" className={inputCls}>
        {contactTypes.map(type => (
          <option key={type} value={type}>
            {CONTACT_TYPE_EMOJIS[type]} {tc(type as 'owner' | 'vet' | 'shelter' | 'emergency' | 'volunteer' | 'other')}
          </option>
        ))}
      </select>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{tcp('animal_type')}</p>
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
      </div>

      {/* Pet association */}
      {pets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" onClick={() => setPetId('')}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${petId === '' ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}
          >🐾 —</button>
          {pets.map(p => (
            <button key={p.id} type="button" onClick={() => setPetId(p.id)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${petId === p.id ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}
            >{SPECIES_EMOJI[p.species]} {p.name ?? p.species}</button>
          ))}
        </div>
      )}

      <input name="name" placeholder={tf('name_placeholder')} required className={inputCls} />
      <input name="phone" type="tel" placeholder={tf('phone_placeholder')} className={inputCls} />
      <input name="email" type="email" placeholder={tf('email_placeholder')} className={inputCls} />
      <textarea name="note" placeholder={tf('note_placeholder')} rows={2} className={`${inputCls} resize-none`} />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition">
          {isPending ? t('saving') : t('save')}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null); setAnimalType('') }} className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
