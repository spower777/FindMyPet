'use client'

import { useState, useTransition } from 'react'
import { createContact } from '@/app/actions/contacts'
import { useTranslations } from 'next-intl'
import type { ContactType } from '@/lib/types'

const CONTACT_TYPE_EMOJIS: Record<ContactType, string> = {
  owner: '👤', vet: '🏥', shelter: '🏠', emergency: '🚨', other: '📋',
}

export default function AddContactForm() {
  const t = useTranslations('profile')
  const tc = useTranslations('contact_types')
  const tf = useTranslations('form')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const contactTypes: ContactType[] = ['owner', 'vet', 'shelter', 'emergency', 'other']

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
          name,
          phone: fd.get('phone') as string,
          email: fd.get('email') as string,
          note: fd.get('note') as string,
        })
        setOpen(false)
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
            {CONTACT_TYPE_EMOJIS[type]} {tc(type)}
          </option>
        ))}
      </select>

      <input name="name" placeholder={tf('name_placeholder')} required className={inputCls} />
      <input name="phone" type="tel" placeholder={tf('phone_placeholder')} className={inputCls} />
      <input name="email" type="email" placeholder={tf('email_placeholder')} className={inputCls} />
      <textarea name="note" placeholder={tf('note_placeholder')} rows={2} className={`${inputCls} resize-none`} />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition">
          {isPending ? t('saving') : t('save')}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null) }} className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
