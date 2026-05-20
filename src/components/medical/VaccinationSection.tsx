'use client'

import { useState, useTransition } from 'react'
import { addVaccination, deleteVaccination } from '@/app/actions/medical'
import { useTranslations } from 'next-intl'
import type { PetVaccination } from '@/lib/types'

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

function vaccineStatus(nextDue: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!nextDue) return null
  const diff = (new Date(nextDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'overdue'
  if (diff <= 30) return 'soon'
  return 'ok'
}

function VaccineRow({ v, petId }: { v: PetVaccination; petId: string }) {
  const t = useTranslations('medical')
  const [pending, start] = useTransition()
  const status = vaccineStatus(v.next_due)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center shrink-0 mt-0.5 text-base">
        💉
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{v.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {new Date(v.date_given).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
          {v.vet_name && ` · ${v.vet_name}`}
          {v.batch_number && ` · #${v.batch_number}`}
        </p>
        {v.next_due && (
          <p className={`text-xs font-medium mt-1 ${
            status === 'overdue' ? 'text-red-600 dark:text-red-400'
            : status === 'soon' ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-teal-600 dark:text-teal-400'
          }`}>
            {status === 'overdue' ? `⚠️ ${t('overdue')}` : status === 'soon' ? `⏰ ${t('due_soon')}` : '✓'}
            {' '}→ {new Date(v.next_due).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
        {v.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{v.notes}</p>}
      </div>
      <button
        disabled={pending}
        onClick={() => start(() => deleteVaccination(v.id, v.pet_id))}
        className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition text-lg leading-none shrink-0 mt-0.5 disabled:opacity-40"
        title={t('delete_confirm')}
      >
        ×
      </button>
    </div>
  )
}

function AddVaccinationForm({ petId, onClose }: { petId: string; onClose: () => void }) {
  const t = useTranslations('medical')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()
    const date_given = fd.get('date_given') as string
    if (!name || !date_given) return

    start(async () => {
      try {
        await addVaccination(petId, {
          name,
          date_given,
          next_due: fd.get('next_due') as string,
          vet_name: fd.get('vet_name') as string,
          batch_number: fd.get('batch_number') as string,
          notes: fd.get('notes') as string,
        })
        onClose()
      } catch {
        setError('Błąd zapisu')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>{t('vaccination_name')} *</label>
          <input name="name" required placeholder="np. Wścieklizna, Parvo" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('date_given')} *</label>
          <input name="date_given" type="date" required max={new Date().toISOString().split('T')[0]} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('next_due')}</label>
          <input name="next_due" type="date" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('record_vet')}</label>
          <input name="vet_name" placeholder="Dr. Kowalski" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('batch_number')}</label>
          <input name="batch_number" placeholder="ABC123" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{t('vet_notes')}</label>
          <textarea name="notes" rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition">
          {pending ? t('saving') : t('save')}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}

export default function VaccinationSection({ petId, vaccinations }: { petId: string; vaccinations: PetVaccination[] }) {
  const t = useTranslations('medical')
  const [adding, setAdding] = useState(false)

  return (
    <div>
      {vaccinations.length === 0 && !adding ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{t('no_vaccinations')}</p>
      ) : (
        <div>
          {vaccinations.map(v => <VaccineRow key={v.id} v={v} petId={petId} />)}
        </div>
      )}

      {adding ? (
        <AddVaccinationForm petId={petId} onClose={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-2 text-xs text-gray-400 hover:border-teal-300 hover:text-teal-500 dark:hover:border-teal-700 transition"
        >
          + {t('add_vaccination')}
        </button>
      )}
    </div>
  )
}
