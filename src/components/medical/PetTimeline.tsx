'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addVaccination, deleteVaccination, addMedicalRecord, deleteMedicalRecord } from '@/app/actions/medical'
import { useTranslations } from 'next-intl'
import type { PetVaccination, PetMedicalRecord, VetDocument, MedicalRecordType } from '@/lib/types'

type VetDocWithUrl = VetDocument & { signedUrl: string | null }

type TimelineEntry =
  | { kind: 'vaccination'; date: string; data: PetVaccination }
  | { kind: 'record'; date: string; data: PetMedicalRecord }
  | { kind: 'vetdoc'; date: string; data: VetDocWithUrl }

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

const TYPE_EMOJI: Record<MedicalRecordType, string> = {
  visit: '🩺', treatment: '💊', surgery: '🔪', test: '🧪', prescription: '📋', other: '📝',
}
const TYPE_DOT: Record<MedicalRecordType, string> = {
  visit: 'bg-blue-400', treatment: 'bg-yellow-400', surgery: 'bg-red-400',
  test: 'bg-purple-400', prescription: 'bg-green-400', other: 'bg-gray-400',
}
const TYPE_COLOR: Record<MedicalRecordType, string> = {
  visit: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  treatment: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
  surgery: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
  test: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
  prescription: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
  other: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

function vaccineStatus(nextDue: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!nextDue) return null
  const diff = (new Date(nextDue).getTime() - Date.now()) / 86400000
  if (diff < 0) return 'overdue'
  if (diff <= 30) return 'soon'
  return 'ok'
}

// ── Add Vaccination Form ──────────────────────────────────────────────────────

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
          name, date_given,
          next_due: fd.get('next_due') as string,
          vet_name: fd.get('vet_name') as string,
          batch_number: fd.get('batch_number') as string,
          notes: fd.get('notes') as string,
        })
        onClose()
      } catch { setError('Błąd zapisu') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">💉 {t('add_vaccination')}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>{t('vaccination_name')} *</label>
          <input name="name" required placeholder="np. Wścieklizna, Parvo" className={inputCls} autoFocus />
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
        <button type="submit" disabled={pending}
          className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition">
          {pending ? t('saving') : t('save')}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition">
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}

// ── Add Medical Record Form ───────────────────────────────────────────────────

function AddRecordForm({ petId, onClose }: { petId: string; onClose: () => void }) {
  const t = useTranslations('medical')
  const [type, setType] = useState<MedicalRecordType>('visit')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [docPath, setDocPath] = useState('')
  const supabase = createClient()

  const TYPES: MedicalRecordType[] = ['visit', 'treatment', 'surgery', 'test', 'prescription', 'other']
  const typeKey = (tp: MedicalRecordType) => `type_${tp}` as `type_${MedicalRecordType}`

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
          type, title, date,
          vet_name: fd.get('vet_name') as string,
          clinic_name: fd.get('clinic_name') as string,
          notes: fd.get('notes') as string,
          document_path: docPath,
        })
        onClose()
      } catch { setError('Błąd zapisu') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">🩺 {t('add_record')}</p>
      <div className="flex gap-1.5 flex-wrap">
        {TYPES.map(tp => (
          <button key={tp} type="button" onClick={() => setType(tp)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition ${
              type === tp ? `${TYPE_COLOR[tp]} border-current` : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
            }`}>
            {TYPE_EMOJI[tp]} {t(typeKey(tp))}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>{t('record_title')} *</label>
          <input name="title" required placeholder="np. Kontrola po szczepieniu" className={inputCls} autoFocus />
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
            <input type="file" accept="application/pdf" hidden disabled={uploading}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || uploading}
          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition">
          {pending ? t('saving') : t('save')}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition">
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}

// ── Timeline Entry Rows ───────────────────────────────────────────────────────

function VaccinationRow({ v, petId }: { v: PetVaccination; petId: string }) {
  const t = useTranslations('medical')
  const [pending, start] = useTransition()
  const status = vaccineStatus(v.next_due)

  return (
    <div className="relative pl-7 pb-5 last:pb-0">
      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-teal-400 ring-2 ring-white dark:ring-gray-900 shrink-0" />
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{fmtDate(v.date_given)}</p>
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">💉</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{v.name}</p>
          {(v.vet_name || v.batch_number) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {[v.vet_name, v.batch_number && `#${v.batch_number}`].filter(Boolean).join(' · ')}
            </p>
          )}
          {v.next_due && (
            <p className={`text-xs font-medium mt-1 ${
              status === 'overdue' ? 'text-red-600 dark:text-red-400'
              : status === 'soon' ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-teal-600 dark:text-teal-400'
            }`}>
              {status === 'overdue' ? `⚠️ ${t('overdue')}` : status === 'soon' ? `⏰ ${t('due_soon')}` : '✓'}
              {' '}→ {fmtDate(v.next_due)}
            </p>
          )}
          {v.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{v.notes}</p>}
        </div>
        <button disabled={pending} onClick={() => start(() => deleteVaccination(v.id, v.pet_id))}
          className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition text-lg leading-none shrink-0 disabled:opacity-40"
          title={t('delete_confirm')}>×</button>
      </div>
    </div>
  )
}

function RecordRow({ r, petId }: { r: PetMedicalRecord; petId: string }) {
  const t = useTranslations('medical')
  const [pending, start] = useTransition()
  const [downloading, setDownloading] = useState(false)
  const supabase = createClient()
  const typeKey = `type_${r.type}` as `type_${MedicalRecordType}`

  async function downloadDoc() {
    if (!r.document_path) return
    setDownloading(true)
    const { data } = await supabase.storage.from('pet-documents').createSignedUrl(r.document_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    setDownloading(false)
  }

  return (
    <div className="relative pl-7 pb-5 last:pb-0">
      <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${TYPE_DOT[r.type]} ring-2 ring-white dark:ring-gray-900`} />
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{fmtDate(r.date)}</p>
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">{TYPE_EMOJI[r.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{r.title}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLOR[r.type]}`}>{t(typeKey)}</span>
          </div>
          {(r.vet_name || r.clinic_name) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {[r.vet_name, r.clinic_name].filter(Boolean).join(' · ')}
            </p>
          )}
          {r.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{r.notes}</p>}
          {r.document_path && (
            <button onClick={downloadDoc} disabled={downloading}
              className="mt-1.5 text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
              📎 {downloading ? '...' : t('download')}
            </button>
          )}
        </div>
        <button disabled={pending} onClick={() => start(() => deleteMedicalRecord(r.id, petId))}
          className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition text-lg leading-none shrink-0 disabled:opacity-40"
          title={t('delete_confirm')}>×</button>
      </div>
    </div>
  )
}

function VetDocRow({ doc }: { doc: VetDocWithUrl }) {
  return (
    <div className="relative pl-7 pb-5 last:pb-0">
      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-blue-400 ring-2 ring-white dark:ring-gray-900" />
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{fmtDate(doc.created_at)}</p>
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">📋</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{doc.title}</p>
          {doc.vet_profile && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {doc.vet_profile.vet_name} · {doc.vet_profile.clinic_name}
            </p>
          )}
          {doc.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{doc.notes}</p>}
          {doc.signedUrl && (
            <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition">
              ⬇ PDF
            </a>
          )}
        </div>
        <span className="text-[10px] text-blue-400 dark:text-blue-500 shrink-0 mt-1 font-medium bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">weterynarz</span>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PetTimeline({
  petId,
  vaccinations,
  medicalRecords,
  vetDocs,
}: {
  petId: string
  vaccinations: PetVaccination[]
  medicalRecords: PetMedicalRecord[]
  vetDocs: VetDocWithUrl[]
}) {
  const t = useTranslations('medical')
  const [adding, setAdding] = useState<'vaccination' | 'record' | null>(null)

  const entries: TimelineEntry[] = [
    ...vaccinations.map(v => ({ kind: 'vaccination' as const, date: v.date_given, data: v })),
    ...medicalRecords.map(r => ({ kind: 'record' as const, date: r.date, data: r })),
    ...vetDocs.map(d => ({ kind: 'vetdoc' as const, date: d.created_at, data: d })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const total = entries.length

  return (
    <div>
      {/* Add buttons */}
      {adding === null && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setAdding('vaccination')}
            className="flex-1 py-2 rounded-xl border-2 border-dashed border-teal-200 dark:border-teal-800 text-xs text-teal-500 dark:text-teal-400 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition font-medium">
            + 💉 {t('add_vaccination')}
          </button>
          <button onClick={() => setAdding('record')}
            className="flex-1 py-2 rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-800 text-xs text-orange-500 dark:text-orange-400 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition font-medium">
            + 🩺 {t('add_record')}
          </button>
        </div>
      )}

      {adding === 'vaccination' && <AddVaccinationForm petId={petId} onClose={() => setAdding(null)} />}
      {adding === 'record' && <AddRecordForm petId={petId} onClose={() => setAdding(null)} />}

      {total === 0 && adding === null ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2 text-center">Brak wpisów — dodaj szczepienie lub wizytę</p>
      ) : (
        <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-1.5">
          {entries.map(entry => {
            if (entry.kind === 'vaccination') return <VaccinationRow key={`v-${entry.data.id}`} v={entry.data} petId={petId} />
            if (entry.kind === 'record') return <RecordRow key={`r-${entry.data.id}`} r={entry.data} petId={petId} />
            return <VetDocRow key={`d-${entry.data.id}`} doc={entry.data} />
          })}
        </div>
      )}
    </div>
  )
}
