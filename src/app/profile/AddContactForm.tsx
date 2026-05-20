'use client'

import { useState, useTransition } from 'react'
import { createContact } from '@/app/actions/contacts'
import type { ContactType } from '@/lib/types'

const CONTACT_TYPES: { value: ContactType; label: string; emoji: string }[] = [
  { value: 'owner', label: 'Właściciel', emoji: '👤' },
  { value: 'vet', label: 'Weterynarz', emoji: '🏥' },
  { value: 'shelter', label: 'Schronisko', emoji: '🏠' },
  { value: 'emergency', label: 'Kontakt awaryjny', emoji: '🚨' },
  { value: 'other', label: 'Inny', emoji: '📋' },
]

export default function AddContactForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()
    if (!name) { setError('Imię / nazwa jest wymagana'); return }

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
        setError('Błąd podczas zapisywania kontaktu')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sm text-gray-400 hover:border-orange-300 hover:text-orange-400 transition"
      >
        + Dodaj kontakt
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4 space-y-3">
      <p className="font-semibold text-gray-900 text-sm">Nowy kontakt</p>

      <select
        name="type"
        defaultValue="other"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      >
        {CONTACT_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
        ))}
      </select>

      <input
        name="name"
        placeholder="Imię / nazwa *"
        required
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
      <input
        name="phone"
        type="tel"
        placeholder="Telefon"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
      <textarea
        name="note"
        placeholder="Notatka"
        rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition"
        >
          {isPending ? 'Zapisuję…' : 'Zapisz'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition"
        >
          Anuluj
        </button>
      </div>
    </form>
  )
}
