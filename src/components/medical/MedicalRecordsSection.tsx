'use client'

import { useState, useTransition } from 'react'
import { addMedicalRecord, deleteMedicalRecord } from '@/app/actions/medical'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import type { PetMedicalRecord, MedicalRecordType } from '@/lib/types'

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

const TYPE_EMOJI: Record<MedicalRecordType, string> = {
  visit: '🩺', treatment: '💊', surgery: '🔪', test: '🧪', prescription: '📋', other: '📝',
}

const TYPE_COLOR: Record<MedicalRecordType, string> = {
  visit: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  treatment: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
  surgery: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
  test: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
  prescription: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
  other: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

function RecordRow({ record, petId }: { record: PetMedicalRecord; petId: string }) {
  const t = useTranslations('medical')
  const [pending, start] = useTransition()
  const [downloading, setDownloading] = useState(false)
  const supabase = createClient()

  async function downloadDoc() {
    if (!record.document_path) return
    setDownloading(true)
    const { data } = await supabase.storage.from('pet-documents').createSignedUrl(record.document_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    setDownloading(false)
  }

  const typeKey = `type_${record.type}` as 'type_visit' | 'type_treatment' | 'type_surgery' | 'type_test' | 'type_prescription' | 'type_other'

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-base ${TYPE_COLOR[record.type]}`}>
        {TYPE_EMOJI[record.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{record.title}</p>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLOR[record.type]}`}>
            {t(typeKey)}
          </span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {new Date(record.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
          {record.vet_name && ` · ${record.vet_name}`}
          {record.clinic_name && ` · ${record.clinic_name}`}
        </p>
        {record.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{record.notes}</p>}
        {record.document_path && (
          <button
            onClick={downloadDoc}
            disabled={downloading}
            className="mt-1.5 text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition"
          >
            📎 {downloading ? '...' : t('download')}
          </button>
        )}
      </div>
      <button
        disabled={pending}
        onClick={() => start(() => deleteMedicalRecord(record.id, petId))}
        className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition text-lg leading-none shrink-0 mt-0.5 disabled:opacity-40"
        title={t('delete_confirm')}
      >
        ×
      </button>
    </div>
  )
}

function AddRecordForm({ petId, onClose }: { petId: string; onClose: () => void }) {
  const t = useTranslations('medical')
  const [type, setType] = useState<MedicalRecordType>('visit')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [docPath, setDocPath] = useState('')
  const supabase = createClient()

  const TYPES: MedicalRecordType[] = ['visit', 'treatment', 'surgery', 'test', 'prescription', 'other']

  async function handleFile(file: File) {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const path = `${user.id}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
    const { error: upErr } = await supabase.storage.from('pet-documents').upload(path, file)
    if (!upErr) setDocPath(path)
    setUploading(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const title = (fd.get('title') as string).trim()
    const date = fd.get('date') as string
    if (!title || !date) return

    start(async () => {
      try {
        await addMedicalRecord(petId, {
          type,
          title,
          date,
          vet_name: fd.get('vet_name') as string,
          clinic_name: fd.get('clinic_name') as string,
          notes: fd.get('notes') as string,
          document_path: docPath,
        })
        onClose()
      } catch {
        setError('Błąd zapisu')
      }
    })
  }

  const typeKey = (t_: MedicalRecordType) => `type_${t_}` as 'type_visit' | 'type_treatment' | 'type_surgery' | 'type_test' | 'type_prescription' | 'type_other'

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
      {/* Type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPES.map(tp => (
          <button
            key={tp}
            type="button"
            onClick={() => setType(tp)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition ${
              type === tp
                ? `${TYPE_COLOR[tp]} border-current`
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            {TYPE_EMOJI[tp]} {t(typeKey(tp))}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>{t('record_title')} *</label>
          <input name="title" required placeholder="np. Kontrola po szczepieniu" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('record_date')} *</label>
          <input name="date" type="date" required max={new Date().toISOString().split('T')[0]} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('record_vet')}</label>
          <input name="vet_name" placeholder="Dr. Nowak" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{t('record_clinic')}</label>
          <input name="clinic_name" placeholder="Klinika Weterynaryjna..." className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{t('vet_notes')}</label>
          <textarea name="notes" rows={2} className={`${inputCls} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{t('upload_doc')}</label>
          <label className={`flex items-center gap-2 cursor-pointer border border-dashed border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:border-orange-300 hover:text-orange-500 transition ${uploading ? 'opacity-50' : ''}`}>
            <span>📎</span>
            <span>{uploading ? '...' : docPath ? docPath.split('/').pop() : 'PDF, max 10 MB'}</span>
            <input
              type="file"
              accept="application/pdf"
              hidden
              disabled={uploading}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || uploading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition">
          {pending ? t('saving') : t('save')}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}

export default function MedicalRecordsSection({ petId, records }: { petId: string; records: PetMedicalRecord[] }) {
  const t = useTranslations('medical')
  const [adding, setAdding] = useState(false)

  return (
    <div>
      {records.length === 0 && !adding ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{t('no_records')}</p>
      ) : (
        <div>
          {records.map(r => <RecordRow key={r.id} record={r} petId={petId} />)}
        </div>
      )}

      {adding ? (
        <AddRecordForm petId={petId} onClose={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-2 text-xs text-gray-400 hover:border-orange-300 hover:text-orange-500 dark:hover:border-orange-700 transition"
        >
          + {t('add_record')}
        </button>
      )}
    </div>
  )
}
